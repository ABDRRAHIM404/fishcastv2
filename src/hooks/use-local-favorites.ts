'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  addLocalFavorite,
  favoritesFromStorageEvent,
  isValidFavoriteSpotId,
  readLocalFavorites,
  removeLocalFavorite,
  writeLocalFavorites,
} from '@/lib/spots/local-favorites';

export type LocalFavoritesStatus = 'pending' | 'ready';

interface LocalFavoritesSnapshot {
  status: LocalFavoritesStatus;
  spotIds: string[];
  error: string | null;
}

const PENDING_SNAPSHOT: LocalFavoritesSnapshot = {
  status: 'pending',
  spotIds: [],
  error: null,
};

let snapshot = PENDING_SNAPSHOT;
let initialized = false;
const listeners = new Set<() => void>();

function emit(next: LocalFavoritesSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function storageError(): LocalFavoritesSnapshot {
  return {
    status: 'ready',
    spotIds: snapshot.spotIds,
    error: 'Saved spots are unavailable in this browser.',
  };
}

function initialize() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  try {
    emit({
      status: 'ready',
      spotIds: readLocalFavorites(window.localStorage),
      error: null,
    });
  } catch {
    emit(storageError());
  }
}

function handleStorage(event: StorageEvent) {
  const spotIds = favoritesFromStorageEvent(event);
  if (spotIds === null) return;
  initialized = true;
  emit({ status: 'ready', spotIds, error: null });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
      initialized = false;
    }
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return PENDING_SNAPSHOT;
}

function persist(spotIds: string[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    writeLocalFavorites(window.localStorage, spotIds);
    emit({ status: 'ready', spotIds, error: null });
    return true;
  } catch {
    emit(storageError());
    return false;
  }
}

function addFavorite(spotId: string): boolean {
  if (!isValidFavoriteSpotId(spotId)) return false;
  return persist(addLocalFavorite(snapshot.spotIds, spotId));
}

function removeFavorite(spotId: string): boolean {
  return persist(removeLocalFavorite(snapshot.spotIds, spotId));
}

function toggleFavorite(spotId: string): boolean {
  return snapshot.spotIds.includes(spotId.trim().toLowerCase())
    ? removeFavorite(spotId)
    : addFavorite(spotId);
}

export function useLocalFavorites() {
  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    initialize();
  }, []);

  const favoriteIds = useMemo(() => new Set(state.spotIds), [state.spotIds]);

  return {
    ...state,
    available: state.status === 'ready' && state.error === null,
    isFavorite: (spotId: string) =>
      favoriteIds.has(spotId.trim().toLowerCase()),
    addFavorite,
    removeFavorite,
    toggleFavorite,
  };
}
