/**
 * Re-export of the canonical Database types.
 *
 * The source of truth lives at `src/lib/supabase/types.ts` (next to the
 * Supabase clients). This alias exists so imports from `@/types/database.types`
 * resolve to the same definitions.
 */
export type {
  Database,
  Json,
  SpotType,
  DifficultyLevel,
  Prevalence,
} from '@/lib/supabase/types';
