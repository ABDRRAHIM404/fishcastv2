import { describe, expect, it } from 'vitest';
import {
  LOCAL_FAVORITES_STORAGE_KEY,
  addLocalFavorite,
  favoritesFromStorageEvent,
  normalizeFavoriteSpotIds,
  parseLocalFavorites,
  readLocalFavorites,
  removeLocalFavorite,
  serializeLocalFavorites,
  writeLocalFavorites,
  type FavoritesStorage,
} from '@/lib/spots/local-favorites';

const SPOT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SPOT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

function memoryStorage(initial: string | null = null): FavoritesStorage & {
  value: string | null;
} {
  return {
    value: initial,
    getItem(key) {
      return key === LOCAL_FAVORITES_STORAGE_KEY ? this.value : null;
    },
    setItem(key, value) {
      if (key === LOCAL_FAVORITES_STORAGE_KEY) this.value = value;
    },
  };
}

describe('local favorites data', () => {
  it('starts empty when no value is stored', () => {
    expect(parseLocalFavorites(null)).toEqual({ version: 1, spotIds: [] });
  });

  it('adds a favorite', () => {
    expect(addLocalFavorite([], SPOT_A)).toEqual([SPOT_A]);
  });

  it('removes a favorite', () => {
    expect(removeLocalFavorite([SPOT_A, SPOT_B], SPOT_A)).toEqual([SPOT_B]);
  });

  it('prevents duplicates and canonicalizes UUID casing', () => {
    expect(addLocalFavorite([SPOT_A], ` ${SPOT_A.toUpperCase()} `)).toEqual([
      SPOT_A,
    ]);
  });

  it('recovers from malformed JSON', () => {
    expect(parseLocalFavorites('{not-json')).toEqual({
      version: 1,
      spotIds: [],
    });
  });

  it('rejects unsupported versions', () => {
    expect(
      parseLocalFavorites(JSON.stringify({ version: 2, spotIds: [SPOT_A] }))
    ).toEqual({ version: 1, spotIds: [] });
  });

  it('ignores invalid spot IDs and malformed array entries', () => {
    expect(
      normalizeFavoriteSpotIds([
        SPOT_A,
        'not-a-uuid',
        '',
        null,
        123,
        {},
      ])
    ).toEqual([SPOT_A]);
  });

  it('serializes and deserializes the versioned payload', () => {
    const serialized = serializeLocalFavorites([SPOT_A, SPOT_B]);
    expect(JSON.parse(serialized)).toEqual({
      version: 1,
      spotIds: [SPOT_A, SPOT_B],
    });
    expect(parseLocalFavorites(serialized).spotIds).toEqual([SPOT_A, SPOT_B]);
  });

  it('reads and writes through the storage boundary', () => {
    const storage = memoryStorage();
    writeLocalFavorites(storage, [SPOT_A]);
    expect(readLocalFavorites(storage)).toEqual([SPOT_A]);
  });

  it('maps relevant cross-tab events and ignores unrelated keys', () => {
    const newValue = serializeLocalFavorites([SPOT_B]);
    expect(
      favoritesFromStorageEvent({
        key: LOCAL_FAVORITES_STORAGE_KEY,
        newValue,
      })
    ).toEqual([SPOT_B]);
    expect(
      favoritesFromStorageEvent({ key: 'another-key', newValue })
    ).toBeNull();
    expect(favoritesFromStorageEvent({ key: null, newValue: null })).toEqual(
      []
    );
  });
});
