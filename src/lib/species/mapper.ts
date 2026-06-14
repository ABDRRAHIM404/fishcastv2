import type { Species, PreferredConditions } from '@/types/species';

/** Raw `species` table row shape (catalog). */
export interface RawSpeciesRow {
  id: string;
  common_name?: string | null;
  local_name?: string | null;
  scientific_name?: string | null;
  image_url?: string | null;
  description?: string | null;
  preferred_conditions?: unknown;
}

/** Parses the preferred_conditions jsonb into the typed schema (lenient). */
export function parsePreferredConditions(
  value: unknown
): PreferredConditions | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const out: PreferredConditions = {};
  if (typeof v.tide_state === 'string') out.tide_state = v.tide_state;
  if (typeof v.wind_max_kmh === 'number') out.wind_max_kmh = v.wind_max_kmh;
  if (typeof v.wave_max_m === 'number') out.wave_max_m = v.wave_max_m;
  if (Array.isArray(v.time_of_day)) {
    out.time_of_day = v.time_of_day.filter(
      (t): t is string => typeof t === 'string'
    );
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Normalizes a raw species row into the catalog domain model. */
export function mapSpeciesRow(row: RawSpeciesRow): Species | null {
  if (!row.id || !row.common_name) return null;
  return {
    id: row.id,
    commonName: row.common_name,
    localName: row.local_name ?? null,
    scientificName: row.scientific_name ?? null,
    imageUrl: row.image_url ?? null,
    description: row.description ?? null,
    preferredConditions: parsePreferredConditions(row.preferred_conditions),
  };
}
