import type { MarineConditions } from '@/types/marine';
import type {
  DifficultyFactors,
  DifficultyLevel,
  SpotType,
} from '@/types/spot';
import type { ForecastIntegrity } from '@/types/forecast';
import { assessForecastIntegrity } from '@/lib/forecast/integrity';
import { computeScore } from '@/lib/scoring/engine';
import type { ScoreResult } from '@/lib/scoring/types';
import { computeSafety } from '@/lib/safety/engine';
import type { SafetyResult } from '@/lib/safety/types';
import type {
  TideTrend,
  WaveDerivedMetrics,
} from '@/types/marine';
import {
  getSpotExposure,
  interpretDirections,
  type DirectionInterpretation,
} from '@/lib/spots/exposure';

export interface ForecastEvaluationSpot {
  id: string;
  slug: string;
  latitude: number;
  longitude: number;
  spotType: SpotType;
  difficultyLevel: DifficultyLevel;
  difficultyFactors: DifficultyFactors | null;
}

export interface CurrentForecastResult {
  schemaVersion: 2;
  spotId: string;
  evaluatedAt: string;
  fishing: ScoreResult;
  safety: SafetyResult;
  integrity: ForecastIntegrity;
  interpretation: DirectionInterpretation;
  /** Normalized decision inputs only; never a raw provider response. */
  conditions: {
    wind: {
      speedKmh: number | null;
      gustKmh: number | null;
      directionDeg: number | null;
      relationship: DirectionInterpretation['wind'];
    };
    waves: {
      heightM: number | null;
      periodS: number | null;
      directionDeg: number | null;
      swellHeightM: number | null;
      swellPeriodS: number | null;
      swellDirectionDeg: number | null;
      relationship: DirectionInterpretation['swell'];
      derived: WaveDerivedMetrics | null;
    };
    modelledTide: {
      source: 'open-meteo-modelled';
      heightM: number | null;
      trend: TideTrend | null;
      rateMPerHour: number | null;
      dailyRangeM: number | null;
      minutesToNextExtreme: number | null;
    } | null;
  };
}

export function evaluateForecast(
  marine: MarineConditions,
  spot: ForecastEvaluationSpot,
  integrity: ForecastIntegrity = assessForecastIntegrity(marine)
): CurrentForecastResult {
  const exposure = getSpotExposure(spot.slug);
  const windDirection =
    marine.wind.status === 'ok' ? marine.wind.data.directionDeg : null;
  const swellDirection =
    marine.waves.status === 'ok'
      ? marine.waves.data.swellDirectionDeg ??
        marine.waves.data.waveDirectionDeg
      : null;
  const interpretation = interpretDirections(
    windDirection,
    swellDirection,
    exposure
  );
  const fishing = computeScore(marine, integrity);
  const safety = computeSafety(marine, integrity, {
    slug: spot.slug,
    spotType: spot.spotType,
    difficultyLevel: spot.difficultyLevel,
    difficultyFactors: spot.difficultyFactors,
  });
  const wind = marine.wind.status === 'ok' ? marine.wind.data : null;
  const waves = marine.waves.status === 'ok' ? marine.waves.data : null;
  const tide = marine.tide.status === 'ok' ? marine.tide.data : null;

  return {
    schemaVersion: 2,
    spotId: spot.id,
    evaluatedAt: marine.generatedAt,
    fishing,
    safety,
    integrity,
    interpretation,
    conditions: {
      wind: {
        speedKmh: wind?.speedKmh ?? null,
        gustKmh: wind?.gustKmh ?? null,
        directionDeg: wind?.directionDeg ?? null,
        relationship: interpretation.wind,
      },
      waves: {
        heightM: waves?.waveHeightM ?? null,
        periodS: waves?.wavePeriodS ?? null,
        directionDeg: waves?.waveDirectionDeg ?? null,
        swellHeightM: waves?.swellHeightM ?? null,
        swellPeriodS: waves?.swellPeriodS ?? null,
        swellDirectionDeg: waves?.swellDirectionDeg ?? null,
        relationship: interpretation.swell,
        derived: waves?.derived ?? null,
      },
      modelledTide: tide
        ? {
            source: tide.source,
            heightM: tide.heightM,
            trend: tide.trend,
            rateMPerHour: tide.rateMPerHour,
            dailyRangeM: tide.dailyRangeM,
            minutesToNextExtreme: tide.minutesToNextExtreme,
          }
        : null,
    },
  };
}
