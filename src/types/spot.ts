import type { Enums } from '@/lib/supabase/types';

/** Enum types derived from the generated Supabase schema (single source of truth). */
export type SpotType = Enums<'spot_type'>;
export type DifficultyLevel = Enums<'difficulty_level'>;

/** Free-form difficulty breakdown stored as jsonb. */
export interface DifficultyFactors {
  access?: string;
  terrain?: string;
  hazards?: string;
  [key: string]: string | undefined;
}

/**
 * Domain model for a fishing spot, normalized from the `spots` table row.
 * Phase 3 intentionally excludes marine conditions and scores.
 */
export interface Spot {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  spotType: SpotType;
  difficultyLevel: DifficultyLevel;
  difficultyFactors: DifficultyFactors | null;
  imageUrl: string | null;
  region: string | null;
  province: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Ordered list of valid spot types. */
export const SPOT_TYPES: readonly SpotType[] = [
  'beach',
  'rocks',
  'river_mouth',
  'port',
  'pier',
] as const;

/** Ordered list of valid difficulty levels (easy → hard). */
export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
] as const;

export const SPOT_TYPE_LABELS: Record<SpotType, string> = {
  beach: 'Beach',
  rocks: 'Rocks',
  river_mouth: 'River Mouth',
  port: 'Port',
  pier: 'Pier',
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

/** Badge variant per difficulty, reusing the Phase 1 condition tokens. */
export const DIFFICULTY_BADGE_VARIANT: Record<
  DifficultyLevel,
  'good' | 'moderate' | 'poor'
> = {
  beginner: 'good',
  intermediate: 'good',
  advanced: 'moderate',
  expert: 'poor',
};

export function isSpotType(value: unknown): value is SpotType {
  return typeof value === 'string' && SPOT_TYPES.includes(value as SpotType);
}

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return (
    typeof value === 'string' &&
    DIFFICULTY_LEVELS.includes(value as DifficultyLevel)
  );
}
