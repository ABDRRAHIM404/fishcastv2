/**
 * Deterministic fishing score engine. Pure function: same MarineConditions in
 * -> same ScoreResult out. No I/O, no randomness, no UI. Consumes ONLY the
 * Phase 5 normalized domain model, never raw provider payloads.
 */
import {
  FACTOR_WEIGHTS,
  ENABLED_FACTORS,
  GRADE_THRESHOLDS,
  CRITICAL_SCORE_FACTORS,
  NON_CRITICAL_MISSING_SCORE,
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
import type { ForecastIntegrity } from '@/types/forecast';
import { assessForecastIntegrity } from '@/lib/forecast/integrity';

const FACTOR_LABELS: Record<FactorKey, string> = {
  wind: 'Wind',
  wave: 'Wave height',
  swell: 'Swell',
  weather: 'Weather',
  tide: 'Modelled tide',
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

export function scoreLabelFor(
  percentage: number
): ScoreResult['label'] {
  if (percentage >= 80) return 'Excellent';
  if (percentage >= 60) return 'Good';
  if (percentage >= 40) return 'Moderate';
  return 'Poor';
}

/**
 * Runs the deterministic engine with fixed weights. Critical missing factors
 * contribute 0; non-critical missing factors contribute an explicit neutral
 * 0.5. Missing critical forecast inputs also cap the headline score.
 */
export function computeScore(
  marine: MarineConditions,
  integrity: ForecastIntegrity = assessForecastIntegrity(marine)
): ScoreResult {
  const raw = ENABLED_FACTORS.map((key) => ({
    key,
    score: rawFactorScore(key, marine),
  }));

  const factors: FactorScore[] = raw.map(({ key, score }) => {
    const unavailable = score === null;
    const appliedScore =
      score ??
      (CRITICAL_SCORE_FACTORS.has(key)
        ? 0
        : NON_CRITICAL_MISSING_SCORE);
    return {
      key,
      label: FACTOR_LABELS[key],
      score,
      weight: FACTOR_WEIGHTS[key],
      appliedScore,
      explanation: explainFactor(key, score, marine),
      unavailable,
    };
  });

  const hasAnyMeasuredFactor = raw.some((factor) => factor.score !== null);
  const rawPercentage = hasAnyMeasuredFactor
    ? Math.round(
        factors.reduce(
          (sum, factor) => sum + factor.appliedScore * factor.weight,
          0
        ) * 100
      )
    : 0;
  const criticalMissingCount = integrity.missingCriticalInputs.length;
  const cap =
    criticalMissingCount >= 2
      ? 59
      : criticalMissingCount === 1
        ? 79
        : 100;
  const percentage = Math.min(rawPercentage, cap);
  const overallScore = Math.round(percentage) / 10;

  return {
    overallScore,
    percentage,
    grade: gradeFor(percentage),
    label: scoreLabelFor(percentage),
    factors,
    computedAt: marine.generatedAt,
    integrity,
    missingDataPolicy: 'fixed-weights-conservative-v1',
  };
}
