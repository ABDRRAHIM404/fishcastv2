/**
 * Deterministic scoring constants. Pure data only — no UI, no I/O. Changing
 * these changes the score in a predictable, testable way.
 *
 * Phase 2 integrity scope evaluates marine, weather, tide, calculated
 * daylight, and lunar timing through one fixed-weight contract.
 */
import type { FactorKey } from '@/lib/scoring/types';

/** Score TTL (ms) for score_cache freshness — aligned with marine data TTLs. */
export const SCORE_TTL_MS = 30 * 60 * 1000;

/**
 * Fixed weights per factor. They are never renormalized around missing data.
 */
export const FACTOR_WEIGHTS: Record<FactorKey, number> = {
  wind: 0.24,
  wave: 0.18,
  swell: 0.12,
  weather: 0.14,
  tide: 0.12,
  pressure: 0.1,
  moon: 0.05,
  timeOfDay: 0.05,
};

/** Factors evaluated by current and timeline paths. */
export const ENABLED_FACTORS: readonly FactorKey[] = [
  'wind',
  'wave',
  'swell',
  'weather',
  'tide',
  'pressure',
  'moon',
  'timeOfDay',
] as const;

/** Missing critical data contributes zero; non-critical gaps are neutral 0.5. */
export const CRITICAL_SCORE_FACTORS = new Set<FactorKey>([
  'wind',
  'wave',
  'tide',
]);
export const NON_CRITICAL_MISSING_SCORE = 0.5;

/**
 * Wind speed (km/h) thresholds. Light/moderate wind is ideal; strong wind
 * degrades fishability. Values chosen for shore/coastal fishing.
 */
export const WIND_KMH = {
  ideal: 12, // <= ideal -> full marks
  good: 20,
  fair: 30,
  poor: 40, // >= poor -> zero
} as const;

/** Wave height (m) thresholds. Small chop is fine; big surf is poor. */
export const WAVE_M = {
  ideal: 0.5,
  good: 1.0,
  fair: 1.8,
  poor: 3.0,
} as const;

/** Swell height (m) thresholds (secondary to wind waves). */
export const SWELL_M = {
  ideal: 0.6,
  good: 1.2,
  fair: 2.0,
  poor: 3.5,
} as const;

/** Cloud cover (%) is mildly favorable; precipitation penalizes weather. */
export const WEATHER = {
  /** Precipitation (mm) at/above which weather scores zero. */
  precipPoorMm: 5,
  /** Cloud cover considered ideal (overcast often fishes well). */
  cloudIdealPct: 60,
} as const;

/**
 * Grade thresholds on the 0-100 percentage scale (inclusive lower bounds),
 * evaluated high-to-low.
 */
export const GRADE_THRESHOLDS: readonly { min: number; grade: string }[] = [
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A' },
  { min: 65, grade: 'B' },
  { min: 45, grade: 'C' },
  { min: 0, grade: 'D' },
] as const;
