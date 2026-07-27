/**
 * Scoring domain types. The engine is pure: it maps the Phase 5
 * MarineConditions model to a structured ScoreResult. No text generation —
 * explanations are short structured strings only.
 */
import type { ForecastIntegrity } from '@/types/forecast';

export type FactorKey =
  | 'wind'
  | 'wave'
  | 'swell'
  | 'weather'
  | 'tide'
  | 'pressure'
  | 'moon'
  | 'timeOfDay';

/** A single evaluated factor. */
export interface FactorScore {
  key: FactorKey;
  /** Human label, e.g. "Wind". */
  label: string;
  /** Normalized factor score in [0, 1], or null when data is unavailable. */
  score: number | null;
  /** Fixed configured weight used in the overall score (all factors sum to 1). */
  weight: number;
  /** Deterministic value actually multiplied by weight. */
  appliedScore: number;
  /** Short structured explanation (no prose generation). */
  explanation: string;
  /** True when the factor was skipped due to missing data. */
  unavailable: boolean;
}

/** The complete, deterministic scoring breakdown for a spot. */
export interface ScoreResult {
  /** Overall score on a 0-10 scale (1 decimal). */
  overallScore: number;
  /** Overall score on a 0-100 scale (integer). */
  percentage: number;
  /** Letter grade derived from percentage (A+, A, B, C, D). */
  grade: string;
  /** Human fishing-quality label; independent from safety. */
  label: 'Excellent' | 'Good' | 'Moderate' | 'Poor';
  /** Per-factor breakdown, including unavailable factors with fixed weights. */
  factors: FactorScore[];
  /** ISO timestamp the score was computed. */
  computedAt: string;
  integrity: ForecastIntegrity;
  missingDataPolicy: 'fixed-weights-conservative-v1';
}
