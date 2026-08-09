import type {
  ModelledSeaLevelPoint,
  TideConditions,
  TideExtreme,
  TideTrend,
} from '@/types/marine';
import {
  monotoneCubicAt,
  toSamples,
  type Sample,
} from '@/lib/timeline/interpolate';

export const TIDE_TIME_ZONE = 'Africa/Casablanca';
export const TIDE_SOURCE_INTERVAL_MINUTES = 60 as const;

const TREND_WINDOW_MS = 30 * 60 * 1000;
const SLACK_DELTA_M = 0.02;
const localDateFormatters = new Map<string, Intl.DateTimeFormat>();

export interface PreparedModelledTideDeriver {
  /** Derives conditions without rebuilding immutable source-series metadata. */
  derive(now?: Date): TideConditions | null;
}

/**
 * Converts Open-Meteo's timezone-local ISO timestamps to absolute ISO values
 * using the response's utc_offset_seconds.
 */
export function openMeteoTimeToIso(
  value: string | number,
  utcOffsetSeconds: number
): string | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return new Date(value * 1000).toISOString();
  }
  const hasExplicitOffset = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const parsed = Date.parse(hasExplicitOffset ? value : `${value}Z`);
  if (Number.isNaN(parsed)) return null;
  const epochMs = hasExplicitOffset
    ? parsed
    : parsed - utcOffsetSeconds * 1000;
  return new Date(epochMs).toISOString();
}

/** Builds clean, ordered hourly provider points from parallel API arrays. */
export function toModelledSeaLevelPoints(
  times: (string | number)[] | undefined,
  heights: (number | null)[] | undefined,
  utcOffsetSeconds = 0
): ModelledSeaLevelPoint[] {
  if (!Array.isArray(times) || !Array.isArray(heights)) return [];

  const points: ModelledSeaLevelPoint[] = [];
  for (let index = 0; index < times.length; index++) {
    const time = times[index];
    const heightM = heights[index];
    if (
      time === undefined ||
      typeof heightM !== 'number' ||
      !Number.isFinite(heightM)
    ) {
      continue;
    }
    const normalizedTime = openMeteoTimeToIso(time, utcOffsetSeconds);
    if (!normalizedTime) continue;
    points.push({ time: normalizedTime, heightM });
  }

  return points.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

function samplesFrom(points: ModelledSeaLevelPoint[]): Sample[] {
  return toSamples(
    points.map((point) => point.time),
    points.map((point) => point.heightM)
  );
}

/** Monotone-cubic modelled sea-level estimate at an arbitrary timestamp. */
export function modelledTideHeightAt(
  points: ModelledSeaLevelPoint[],
  epochMs: number
): number | null {
  return monotoneCubicAt(samplesFrom(points), epochMs);
}

/**
 * Classifies trend from a centered one-hour modelled-height delta. Small
 * changes around a turning point are explicitly classified as slack.
 */
export function modelledTideTrendAt(
  points: ModelledSeaLevelPoint[],
  epochMs: number
): TideTrend | null {
  if (points.length < 2) return null;
  const samples = samplesFrom(points);
  const before = monotoneCubicAt(samples, epochMs - TREND_WINDOW_MS);
  const after = monotoneCubicAt(samples, epochMs + TREND_WINDOW_MS);
  if (before === null || after === null) return null;

  const delta = after - before;
  if (Math.abs(delta) <= SLACK_DELTA_M) return 'slack';
  return delta > 0 ? 'rising' : 'falling';
}

/** Centered modelled sea-level change in metres per hour. */
export function modelledTideRateAt(
  points: ModelledSeaLevelPoint[],
  epochMs: number
): number | null {
  if (points.length < 2) return null;
  const samples = samplesFrom(points);
  const before = monotoneCubicAt(samples, epochMs - TREND_WINDOW_MS);
  const after = monotoneCubicAt(samples, epochMs + TREND_WINDOW_MS);
  if (before === null || after === null) return null;
  return after - before;
}

/**
 * Detects local highs/lows in the native hourly provider series. Equal-height
 * plateaus are treated as one turning event at the plateau's midpoint.
 */
export function detectModelledTideExtremes(
  points: ModelledSeaLevelPoint[]
): TideExtreme[] {
  const extremes: TideExtreme[] = [];
  let index = 1;
  while (index < points.length - 1) {
    const plateauStart = index;
    let plateauEnd = index;
    while (
      plateauEnd + 1 < points.length &&
      points[plateauEnd + 1]!.heightM === points[plateauStart]!.heightM
    ) {
      plateauEnd++;
    }

    if (plateauEnd >= points.length - 1) break;
    const previous = points[plateauStart - 1]!;
    const next = points[plateauEnd + 1]!;
    const event = points[Math.floor((plateauStart + plateauEnd) / 2)]!;

    if (
      event.heightM > previous.heightM &&
      event.heightM > next.heightM
    ) {
      extremes.push({
        time: event.time,
        state: 'high',
        heightM: event.heightM,
      });
    } else if (
      event.heightM < previous.heightM &&
      event.heightM < next.heightM
    ) {
      extremes.push({
        time: event.time,
        state: 'low',
        heightM: event.heightM,
      });
    }

    index = plateauEnd + 1;
  }
  return extremes;
}

function localDateKey(date: Date, timeZone: string): string {
  let formatter = localDateFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    localDateFormatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

function dailyTidalRanges(
  points: ModelledSeaLevelPoint[],
  timeZone: string
): Map<string, number | null> {
  const heightsByDate = new Map<string, number[]>();
  for (const point of points) {
    const key = localDateKey(new Date(point.time), timeZone);
    const heights = heightsByDate.get(key);
    if (heights) heights.push(point.heightM);
    else heightsByDate.set(key, [point.heightM]);
  }

  return new Map(
    [...heightsByDate.entries()].map(([key, heights]) => [
      key,
      heights.length < 2
        ? null
        : Math.max(...heights) - Math.min(...heights),
    ])
  );
}

/** Daily max-minus-min range from native provider points in the local day. */
export function modelledDailyTidalRange(
  points: ModelledSeaLevelPoint[],
  day: Date,
  timeZone = TIDE_TIME_ZONE
): number | null {
  const key = localDateKey(day, timeZone);
  const heights = points
    .filter((point) => localDateKey(new Date(point.time), timeZone) === key)
    .map((point) => point.heightM);
  if (heights.length < 2) return null;
  return Math.max(...heights) - Math.min(...heights);
}

/**
 * Prepares the immutable parts of modelled-tide derivation once for a provider
 * series. Timeline generation evaluates the same source points hundreds of
 * times, so rebuilding samples, extrema and local-day ranges per point adds
 * substantial work without changing the result.
 */
export function prepareModelledTideDeriver(
  points: ModelledSeaLevelPoint[],
  timeZone = TIDE_TIME_ZONE
): PreparedModelledTideDeriver {
  if (points.length === 0) {
    return { derive: () => null };
  }

  const samples = samplesFrom(points);
  const extremes = detectModelledTideExtremes(points).map((extreme) => ({
    extreme,
    epochMs: new Date(extreme.time).getTime(),
  }));
  const ranges = dailyTidalRanges(points, timeZone);

  return {
    derive(now: Date = new Date()): TideConditions {
      // Preserve the one-off function's invalid-Date failure behavior before
      // doing any additional formatting work.
      const observedAt = now.toISOString();
      const nowMs = now.getTime();
      const upcomingExtremes = extremes
        .filter((item) => item.epochMs >= nowMs)
        .map((item) => ({ ...item.extreme }));
      let previousExtremeMs: number | null = null;
      for (let index = extremes.length - 1; index >= 0; index--) {
        const candidate = extremes[index]!;
        if (candidate.epochMs < nowMs) {
          previousExtremeMs = candidate.epochMs;
          break;
        }
      }
      const next = upcomingExtremes[0] ?? null;

      let rateMPerHour: number | null = null;
      if (points.length >= 2) {
        const before = monotoneCubicAt(samples, nowMs - TREND_WINDOW_MS);
        const after = monotoneCubicAt(samples, nowMs + TREND_WINDOW_MS);
        if (before !== null && after !== null) {
          rateMPerHour = after - before;
        }
      }
      const trend: TideTrend | null =
        rateMPerHour === null
          ? null
          : Math.abs(rateMPerHour) <= SLACK_DELTA_M
            ? 'slack'
            : rateMPerHour > 0
              ? 'rising'
              : 'falling';
      const dayKey = localDateKey(now, timeZone);

      return {
        observedAt,
        source: 'open-meteo-modelled',
        datum: 'mean-sea-level',
        sourceIntervalMinutes: TIDE_SOURCE_INTERVAL_MINUTES,
        heightM: monotoneCubicAt(samples, nowMs),
        trend,
        extremes: upcomingExtremes,
        minutesToNextExtreme: next
          ? Math.max(
              0,
              Math.ceil((new Date(next.time).getTime() - nowMs) / 60_000)
            )
          : null,
        dailyRangeM: ranges.get(dayKey) ?? null,
        rateMPerHour,
        minutesSincePreviousExtreme:
          previousExtremeMs === null
            ? null
            : Math.max(
                0,
                Math.floor((nowMs - previousExtremeMs) / 60_000)
              ),
      };
    },
  };
}

/**
 * Derives the current compatible TideConditions domain object entirely from
 * hourly modelled sea-level source points.
 */
export function deriveModelledTideConditions(
  points: ModelledSeaLevelPoint[],
  now: Date = new Date()
): TideConditions | null {
  return prepareModelledTideDeriver(points).derive(now);
}
