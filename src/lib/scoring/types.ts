/**
 * Scoring domain types. The engine is pure: it maps the Phase 5
 * MarineConditions model to a structured ScoreResult. No text generation —
 * explanations are short structured strings only.
 */

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
  /** Effective weight used in the overall score (renormalized, sums to 1). */
  weight: number;
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
  /** Per-factor breakdown, including unavailable factors (weight 0). */
  factors: FactorScore[];
  /** ISO timestamp the score was computed. */
  computedAt: string;
}
