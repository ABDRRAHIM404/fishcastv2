import {
  isDifficultyLevel,
  isSpotType,
  type DifficultyFactors,
  type Spot,
} from '@/types/spot';

/**
 * Raw row shape as read from the `spots` table. Phase 3 presentation columns
 * are typed as optional so the mapper compiles whether or not the generated
 * Supabase types have been regenerated after the Phase 3 migration.
 */
export interface RawSpotRow {
  id: string;
  slug?: string | null;
  name: string;
  description?: string | null;
  lat: number;
  lng: number;
  type: string;
  difficulty_level: string;
  difficulty_factors?: unknown;
  image_url?: string | null;
  region?: string | null;
  province?: string | null;
  active?: boolean | null;
  created_at: string;
  updated_at?: string | null;
}

function parseDifficultyFactors(value: unknown): DifficultyFactors | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: DifficultyFactors = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string') out[key] = raw;
  }
  return out;
}

/**
 * Validates and normalizes a raw `spots` row into the domain `Spot` model.
 * Returns null when required fields are missing or enums are invalid, so
 * malformed rows are skipped rather than crashing the page.
 */
export function mapSpotRow(row: RawSpotRow): Spot | null {
  const slug = row.slug ?? row.id;
  if (!slug || !row.name) return null;
  if (!isSpotType(row.type)) return null;
  if (!isDifficultyLevel(row.difficulty_level)) return null;
  if (typeof row.lat !== 'number' || typeof row.lng !== 'number') return null;

  return {
    id: row.id,
    slug,
    name: row.name,
    description: row.description ?? null,
    latitude: row.lat,
    longitude: row.lng,
    spotType: row.type,
    difficultyLevel: row.difficulty_level,
    difficultyFactors: parseDifficultyFactors(row.difficulty_factors),
    imageUrl: row.image_url ?? null,
    region: row.region ?? null,
    province: row.province ?? null,
    active: row.active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}
