/**
 * Deterministic fishing score engine. Pure function: same MarineConditions in
 * -> same ScoreResult out. No I/O, no randomness, no UI. Consumes ONLY the
 * Phase 5 normalized domain model, never raw provider payloads.
 */
import {
  FACTOR_WEIGHTS,
  ENABLED_FACTORS,
  GRADE_THRESHOLDS,
} from '@/lib/scoring/constants';
import {
  scoreWind,
  scoreWave,
  scoreSwell,
  scoreWeather,
  scoreTide,
  scorePressure,
  scoreMoon,
  scoreTimeOfDay,
} from '@/lib/scoring/rules';
import { explainFactor } from '@/lib/scoring/explain';
import type { FactorKey, FactorScore, ScoreResult } from '@/lib/scoring/types';
import type { MarineConditions } from '@/types/marine';

const FACTOR_LABELS: Record<FactorKey, string> = {
  wind: 'Wind',
  wave: 'Wave height',
  swell: 'Swell',
  weather: 'Weather',
  tide: 'Tide',
  pressure: 'Pressure',
  moon: 'Moon phase',
  timeOfDay: 'Time of day',
};

/** Computes the raw [0,1] score for a factor from the marine model. */
function rawFactorScore(
  key: FactorKey,
  marine: MarineConditions
): number | null {
  switch (key) {
    case 'wind':
      return marine.wind.status === 'ok' ? scoreWind(marine.wind.data) : null;
    case 'wave':
      return marine.waves.status === 'ok' ? scoreWave(marine.waves.data) : null;
    case 'swell':
      return marine.waves.status === 'ok'
        ? scoreSwell(marine.waves.data)
        : null;
    case 'weather':
      return marine.weather.status === 'ok'
        ? scoreWeather(marine.weather.data)
        : null;
    case 'tide':
      return marine.tide.status === 'ok' ? scoreTide(marine.tide.data) : null;
    case 'pressure':
      return marine.weather.status === 'ok'
        ? scorePressure(marine.weather.data)
        : null;
    case 'moon':
      return scoreMoon(marine);
    case 'timeOfDay':
      return scoreTimeOfDay(marine);
  }
}

/** Derives the letter grade from a 0-100 percentage. */
export function gradeFor(percentage: number): string {
  for (const { min, grade } of GRADE_THRESHOLDS) {
    if (percentage >= min) return grade;
  }
  // GRADE_THRESHOLDS always ends with min 0; this is a safety fallback.
  return 'D';
}

/**
 * Runs the deterministic engine. Missing factors are dropped and the remaining
 * weights are renormalized so the overall score stays on a true 0-1 basis.
 * When no factor has data, the overall score is 0 with grade D.
 */
export function computeScore(marine: MarineConditions): ScoreResult {
  const raw = ENABLED_FACTORS.map((key) => ({
    key,
    score: rawFactorScore(key, marine),
  }));

  const available = raw.filter(
    (f): f is { key: FactorKey; score: number } => f.score !== null
  );
  const totalWeight = available.reduce(
    (sum, f) => sum + FACTOR_WEIGHTS[f.key],
    0
  );

  const factors: FactorScore[] = raw.map(({ key, score }) => {
    const unavailable = score === null;
    const weight =
      unavailable || totalWeight === 0
        ? 0
        : FACTOR_WEIGHTS[key] / totalWeight;
    return {
      key,
      label: FACTOR_LABELS[key],
      score,
      weight,
      explanation: explainFactor(key, score, marine),
      unavailable,
    };
  });

  const overall01 =
    totalWeight === 0
      ? 0
      : available.reduce(
          (sum, f) => sum + f.score * (FACTOR_WEIGHTS[f.key] / totalWeight),
          0
        );

  const percentage = Math.round(overall01 * 100);
  const overallScore = Math.round(overall01 * 100) / 10;

  return {
    overallScore,
    percentage,
    grade: gradeFor(percentage),
    factors,
    computedAt: marine.generatedAt,
  };
}
