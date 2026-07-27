export const LOCAL_FAVORITES_STORAGE_KEY = 'fishcast:favorites';
export const LOCAL_FAVORITES_VERSION = 1 as const;

export interface LocalFavoritesPayload {
  version: typeof LOCAL_FAVORITES_VERSION;
  spotIds: string[];
}

export interface FavoritesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface FavoritesStorageEvent {
  key: string | null;
  newValue: string | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidFavoriteSpotId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim());
}

/** Validates, canonicalizes, and de-duplicates public spot UUIDs. */
export function normalizeFavoriteSpotIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const spotIds: string[] = [];
  for (const candidate of value) {
    if (!isValidFavoriteSpotId(candidate)) continue;
    const spotId = candidate.trim().toLowerCase();
    if (seen.has(spotId)) continue;
    seen.add(spotId);
    spotIds.push(spotId);
  }
  return spotIds;
}

/** Invalid JSON, unsupported versions, and malformed shapes recover to empty. */
export function parseLocalFavorites(raw: string | null): LocalFavoritesPayload {
  if (raw === null) {
    return { version: LOCAL_FAVORITES_VERSION, spotIds: [] };
  }

  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { version: LOCAL_FAVORITES_VERSION, spotIds: [] };
    }

    const payload = value as { version?: unknown; spotIds?: unknown };
    if (payload.version !== LOCAL_FAVORITES_VERSION) {
      return { version: LOCAL_FAVORITES_VERSION, spotIds: [] };
    }

    return {
      version: LOCAL_FAVORITES_VERSION,
      spotIds: normalizeFavoriteSpotIds(payload.spotIds),
    };
  } catch {
    return { version: LOCAL_FAVORITES_VERSION, spotIds: [] };
  }
}

export function serializeLocalFavorites(spotIds: unknown): string {
  return JSON.stringify({
    version: LOCAL_FAVORITES_VERSION,
    spotIds: normalizeFavoriteSpotIds(spotIds),
  } satisfies LocalFavoritesPayload);
}

export function addLocalFavorite(
  spotIds: readonly string[],
  spotId: string
): string[] {
  return normalizeFavoriteSpotIds([...spotIds, spotId]);
}

export function removeLocalFavorite(
  spotIds: readonly string[],
  spotId: string
): string[] {
  const normalizedId = spotId.trim().toLowerCase();
  return normalizeFavoriteSpotIds(spotIds).filter(
    (candidate) => candidate !== normalizedId
  );
}

export function readLocalFavorites(storage: FavoritesStorage): string[] {
  return parseLocalFavorites(
    storage.getItem(LOCAL_FAVORITES_STORAGE_KEY)
  ).spotIds;
}

export function writeLocalFavorites(
  storage: FavoritesStorage,
  spotIds: readonly string[]
): void {
  storage.setItem(
    LOCAL_FAVORITES_STORAGE_KEY,
    serializeLocalFavorites(spotIds)
  );
}

/**
 * Maps a browser storage event to a new favourite list. `null` means the event
 * belongs to another key; a null key represents storage.clear().
 */
export function favoritesFromStorageEvent(
  event: FavoritesStorageEvent
): string[] | null {
  if (
    event.key !== null &&
    event.key !== LOCAL_FAVORITES_STORAGE_KEY
  ) {
    return null;
  }
  return parseLocalFavorites(event.newValue).spotIds;
}
