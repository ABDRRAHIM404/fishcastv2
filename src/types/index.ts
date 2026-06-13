/**
 * Shared domain types.
 *
 * Phase 1 only declares lightweight UI-facing types used by placeholder
 * components. Full domain models arrive with their respective phases.
 */

export type SpotType = 'beach' | 'rocks' | 'port' | 'river_mouth' | 'pier';

export type DifficultyLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export type ConditionLabel = 'excellent' | 'good' | 'moderate' | 'poor';

/** Minimal shape used by the premium SpotCard shell (placeholder data only). */
export interface SpotPreview {
  id: string;
  name: string;
  type: SpotType;
  difficulty: DifficultyLevel;
  imageUrl: string;
}
