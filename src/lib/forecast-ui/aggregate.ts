import { dataQualityLabel } from '@/lib/forecast-ui/labels';
import type {
  ForecastConfidenceValue,
  ForecastDailySummary,
  ForecastDataQuality,
  ForecastFishingValue,
  ForecastInterval,
  ForecastPeriod,
  ForecastSafetyValue,
} from '@/lib/forecast-ui/types';
import { gradeFor } from '@/lib/scoring/engine';
import type { SafetyStatus, SafetyWarning } from '@/lib/safety/types';
import type { Timeline, TimelinePoint } from '@/lib/timeline/types';
import { labelForScore } from '@/lib/timeline/windows';
import { deriveWaveMetrics } from '@/lib/waves/derived';
import type { ConfidenceLabel, ForecastInputKey } from '@/types/forecast';

const INTERVAL_MINUTES: Readonly<Record<ForecastInterval, number>> = {
  '30m': 30,
  '1h': 60,
  '3h': 180,
  '6h': 360,
};

const SAFETY_RANK: Readonly<Record<SafetyStatus, number>> = {
  Safe: 0,
  Caution: 1,
  Unknown: 2,
  Dangerous: 3,
};

const CONFIDENCE_RANK: Readonly<Record<ConfidenceLabel, number>> = {
  low: 0,
  medium: 1,
  high: 2,
};

function finite(values: Array<number | null>): number[] {
  return values.filter(
    (value): value is number => value !== null && Number.isFinite(value)
  );
}

function mean(values: Array<number | null>): number | null {
  const present = finite(values);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

function maximum(values: Array<number | null>): number | null {
  const present = finite(values);
  return present.length === 0 ? null : Math.max(...present);
}

function sum(values: Array<number | null>): number | null {
  const present = finite(values);
  if (present.length === 0) return null;
  return present.reduce((total, value) => total + value, 0);
}

function minimum(values: Array<number | null>): number | null {
  const present = finite(values);
  return present.length === 0 ? null : Math.min(...present);
}

/** Circular mean prevents north-facing bearings such as 359° and 1° averaging south. */
export function circularMeanDeg(
  values: Array<number | null>
): number | null {
  const present = finite(values);
  if (present.length === 0) return null;
  const vector = present.reduce(
    (sum, value) => {
      const radians = (value * Math.PI) / 180;
      return {
        x: sum.x + Math.cos(radians),
        y: sum.y + Math.sin(radians),
      };
    },
    { x: 0, y: 0 }
  );
  if (Math.abs(vector.x) < 1e-12 && Math.abs(vector.y) < 1e-12) {
    return null;
  }
  return ((Math.atan2(vector.y, vector.x) * 180) / Math.PI + 360) % 360;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function warningsFor(points: TimelinePoint[]): SafetyWarning[] {
  const byCode = new Map<string, SafetyWarning>();
  for (const point of points) {
    for (const warning of point.safety.warnings) {
      const existing = byCode.get(warning.code);
      if (!existing || warning.severity === 'critical') {
        byCode.set(warning.code, warning);
      }
    }
  }
  return [...byCode.values()];
}

function safetyFor(points: TimelinePoint[]): ForecastSafetyValue {
  const worst = points.reduce(
    (current, point) =>
      SAFETY_RANK[point.safety.status] > SAFETY_RANK[current.safety.status]
        ? point
        : current,
    points[0]!
  );
  const warnings = warningsFor(points);
  return {
    score: minimum(points.map((point) => point.safety.score)),
    status: worst.safety.status,
    warnings,
    primaryWarning:
      warnings.find((warning) => warning.severity === 'critical')?.message ??
      warnings[0]?.message ??
      null,
    containsDangerous: points.some(
      (point) => point.safety.status === 'Dangerous'
    ),
  };
}

function confidenceFor(points: TimelinePoint[]): ForecastConfidenceValue {
  const weakest = points.reduce(
    (current, point) =>
      CONFIDENCE_RANK[point.integrity.confidence] <
      CONFIDENCE_RANK[current.integrity.confidence]
        ? point
        : current,
    points[0]!
  );
  return {
    completenessPercentage: Math.min(
      ...points.map((point) => point.integrity.completenessPercentage)
    ),
    label: weakest.integrity.confidence,
    missingInputs: unique(
      points.flatMap((point) => point.integrity.missingInputs)
    ),
    missingCriticalInputs: unique(
      points.flatMap((point) => point.integrity.missingCriticalInputs)
    ),
    forecastAgeMinutes: maximum(
      points.map((point) => point.integrity.forecastAgeMinutes)
    ),
  };
}

function fishingFor(score: number): ForecastFishingValue {
  const rounded = Math.round(score * 10) / 10;
  return {
    score: Math.round(rounded * 10),
    scoreOutOfTen: rounded,
    label: labelForScore(rounded),
    grade: gradeFor(rounded * 10),
  };
}

function qualityFor(point: TimelinePoint): ForecastDataQuality {
  const sourceInputs = point.integrity.inputs.filter(
    (input) => input.key !== 'daylight'
  );
  if (
    sourceInputs.length === 0 ||
    sourceInputs.every(
      (input) => input.availability === 'missing' || input.availability === 'stale'
    )
  ) {
    return 'unavailable';
  }
  if (
    sourceInputs.some(
      (input) => input.availability === 'missing' || input.availability === 'stale'
    )
  ) {
    return 'mixed';
  }
  return sourceInputs.some((input) => input.availability === 'interpolated')
    ? 'interpolated'
    : 'provider';
}

function eventInRange(
  eventTime: string | null,
  startMs: number,
  endMs: number
): boolean {
  if (!eventTime) return false;
  const eventMs = new Date(eventTime).getTime();
  return eventMs >= startMs && eventMs < endMs;
}

function overlapsWindow(
  startMs: number,
  endMs: number,
  timeline: Timeline
): boolean {
  return timeline.windows.some((window) => {
    const windowStart = new Date(window.start).getTime();
    const windowEnd = new Date(window.end).getTime();
    return startMs < windowEnd && endMs > windowStart;
  });
}

function periodNote(
  fishing: ForecastFishingValue,
  safety: ForecastSafetyValue,
  confidence: ForecastConfidenceValue
): string {
  if (safety.status === 'Dangerous') {
    return safety.primaryWarning ?? 'Dangerous conditions are possible in this interval.';
  }
  if (safety.status === 'Unknown') {
    return 'Safety cannot be assessed because critical marine inputs are unavailable.';
  }
  if (confidence.missingCriticalInputs.length > 0) {
    return 'Fishing quality is limited by missing critical forecast inputs.';
  }
  if (safety.status === 'Caution') {
    return safety.primaryWarning ?? 'Use extra caution during this interval.';
  }
  return `${fishing.label} fishing quality with no active modelled safety warning.`;
}

function aggregatePeriod(
  timeline: Timeline,
  points: TimelinePoint[],
  interval: ForecastInterval,
  startMs: number,
  endMs: number,
  nowMs: number
): ForecastPeriod {
  const sampled = points[0]!;
  const aggregated = interval === '3h' || interval === '6h';
  const value = (selector: (point: TimelinePoint) => number | null) =>
    aggregated ? mean(points.map(selector)) : selector(sampled);
  const conservativeMax = (selector: (point: TimelinePoint) => number | null) =>
    aggregated ? maximum(points.map(selector)) : selector(sampled);
  const direction = (selector: (point: TimelinePoint) => number | null) =>
    aggregated ? circularMeanDeg(points.map(selector)) : selector(sampled);
  const fishing = fishingFor(
    aggregated
      ? mean(points.map((point) => point.score)) ?? 0
      : sampled.score
  );
  const safety = safetyFor(points);
  const confidence = confidenceFor(points);
  const waveHeightM = conservativeMax((point) => point.waveHeightM);
  const wavePeriodS = value((point) => point.wavePeriodS);
  const swellHeightM = conservativeMax((point) => point.swellHeightM);
  const swellDirectionDeg = direction((point) => point.swellDirectionDeg);
  const secondarySwellHeightM = conservativeMax(
    (point) => point.secondarySwellHeightM
  );
  const secondarySwellDirectionDeg = direction(
    (point) => point.secondarySwellDirectionDeg
  );
  const derived = deriveWaveMetrics({
    waveHeightM,
    wavePeriodS,
    swellHeightM,
    swellDirectionDeg,
    secondarySwellHeightM,
    secondarySwellDirectionDeg,
  });
  const quality = aggregated ? 'aggregated' : qualityFor(sampled);
  const nextExtreme = points.find((point) =>
    eventInRange(point.tideNextExtremeTime, startMs, endMs)
  );

  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    date: timeline.date,
    interval,
    dataQuality: quality,
    dataQualityLabel: dataQualityLabel(quality),
    safetyAggregatedAcrossInterval: true,
    recommended: overlapsWindow(startMs, endMs, timeline),
    fishing,
    safety,
    confidence,
    bestSpecies: null,
    recommendedTechnique: null,
    note: periodNote(fishing, safety, confidence),
    wind: {
      speedKmh: value((point) => point.windSpeedKmh),
      gustKmh: conservativeMax((point) => point.windGustKmh),
      directionDeg: direction((point) => point.windDirectionDeg),
      relationship: sampled.interpretation.wind,
    },
    waves: {
      heightM: waveHeightM,
      directionDeg: direction((point) => point.waveDirectionDeg),
      periodS: wavePeriodS,
      swellHeightM,
      swellDirectionDeg,
      swellPeriodS: value((point) => point.swellPeriodS),
      secondarySwellHeightM,
      secondarySwellDirectionDeg,
      secondarySwellPeriodS: value(
        (point) => point.secondarySwellPeriodS
      ),
      derived,
    },
    tide: {
      heightM: value((point) => point.tideHeightM),
      trend: sampled.tideTrend,
      rateMPerHour: value((point) => point.tideRateMPerHour),
      dailyRangeM: maximum(points.map((point) => point.tideDailyRangeM)),
      nextExtremeState:
        nextExtreme?.tideNextExtremeState ?? sampled.tideNextExtremeState,
      nextExtremeTime:
        nextExtreme?.tideNextExtremeTime ?? sampled.tideNextExtremeTime,
      minutesToNextExtreme:
        nextExtreme?.tideMinutesToNextExtreme ??
        sampled.tideMinutesToNextExtreme,
    },
    weather: {
      temperatureC: value((point) => point.temperatureC),
      pressureMb: value((point) => point.pressureMb),
      pressureTrendMbPerHr: value(
        (point) => point.pressureTrendMbPerHr
      ),
      precipitationMm: aggregated
        ? sum(points.map((point) => point.precipitationMm))
        : sampled.precipitationMm,
      cloudCoverPct: value((point) => point.cloudCoverPct),
      visibilityM: aggregated
        ? minimum(points.map((point) => point.visibilityM))
        : sampled.visibilityM,
      weatherCode: sampled.weatherCode,
    },
    environment: {
      seaSurfaceTemperatureC: value(
        (point) => point.seaSurfaceTemperatureC
      ),
      oceanCurrentVelocityKmh: conservativeMax(
        (point) => point.oceanCurrentVelocityKmh
      ),
      oceanCurrentDirectionDeg: direction(
        (point) => point.oceanCurrentDirectionDeg
      ),
      daylightState: sampled.daylightState,
    },
    markers: {
      currentTime: nowMs >= startMs && nowMs < endMs,
      sunrise: points.some((point) =>
        eventInRange(point.sunrise, startMs, endMs)
      ),
      sunset: points.some((point) =>
        eventInRange(point.sunset, startMs, endMs)
      ),
      tideHigh:
        nextExtreme?.tideNextExtremeState === 'high' &&
        eventInRange(nextExtreme.tideNextExtremeTime, startMs, endMs),
      tideLow:
        nextExtreme?.tideNextExtremeState === 'low' &&
        eventInRange(nextExtreme.tideNextExtremeTime, startMs, endMs),
    },
  };
}

/**
 * Converts the source five-minute decision timeline into display intervals.
 * 30-minute and hourly rows sample aligned timeline points; 3h/6h rows are
 * explicit display aggregates. Safety is always worst-case across each bucket.
 */
export function aggregateTimeline(
  timeline: Timeline,
  interval: ForecastInterval,
  now: Date = new Date()
): ForecastPeriod[] {
  const bucketMs = INTERVAL_MINUTES[interval] * 60_000;
  const rangeEndMs = new Date(timeline.range.endExclusive).getTime();
  const groups = new Map<number, TimelinePoint[]>();

  for (const point of timeline.points) {
    const pointMs = new Date(point.time).getTime();
    const bucketStart =
      new Date(timeline.range.start).getTime() +
      Math.floor(
        (pointMs - new Date(timeline.range.start).getTime()) / bucketMs
      ) *
        bucketMs;
    const existing = groups.get(bucketStart);
    if (existing) existing.push(point);
    else groups.set(bucketStart, [point]);
  }

  return [...groups.entries()].map(([startMs, points]) =>
    aggregatePeriod(
      timeline,
      points,
      interval,
      startMs,
      Math.min(startMs + bucketMs, rangeEndMs),
      now.getTime()
    )
  );
}

function closestPoint(points: TimelinePoint[], time: string): TimelinePoint {
  const target = new Date(time).getTime();
  return points.reduce((closest, point) =>
    Math.abs(new Date(point.time).getTime() - target) <
    Math.abs(new Date(closest.time).getTime() - target)
      ? point
      : closest
  );
}

/** Daily headline uses the recommended-window peak, or the best scored point. */
export function summarizeTimeline(timeline: Timeline): ForecastDailySummary {
  const points = timeline.points;
  if (points.length === 0) {
    throw new Error(`Timeline ${timeline.date} has no points`);
  }
  const bestPoint = timeline.recommendedWindow
    ? closestPoint(points, timeline.recommendedWindow.peakTime)
    : points.reduce((best, point) => (point.score > best.score ? point : best));
  return {
    date: timeline.date,
    fishing: fishingFor(bestPoint.score),
    safety: safetyFor(points),
    confidence: confidenceFor([bestPoint]),
    maxWaveHeightM: maximum(points.map((point) => point.waveHeightM)),
    representativeWavePeriodS: bestPoint.wavePeriodS,
    representativeWindKmh: bestPoint.windSpeedKmh,
    maxWindGustKmh: maximum(points.map((point) => point.windGustKmh)),
    weatherCode: bestPoint.weatherCode,
    bestWindow: timeline.recommendedWindow,
    bestSpecies: null,
    sunrise: bestPoint.sunrise,
    sunset: bestPoint.sunset,
    noRecommendedWindowReason: timeline.noRecommendedWindowReason,
  };
}

export function worstSafetyStatus(
  values: ForecastSafetyValue[]
): SafetyStatus {
  return values.reduce<SafetyStatus>(
    (worst, value) =>
      SAFETY_RANK[value.status] > SAFETY_RANK[worst] ? value.status : worst,
    'Safe'
  );
}

export function uniqueMissingInputs(
  values: ForecastConfidenceValue[]
): ForecastInputKey[] {
  return unique(values.flatMap((value) => value.missingInputs));
}
