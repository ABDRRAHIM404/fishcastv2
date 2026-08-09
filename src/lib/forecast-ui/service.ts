import 'server-only';
import {
  aggregateTimeline,
  summarizeTimeline,
} from '@/lib/forecast-ui/aggregate';
import { sortComparisonItems } from '@/lib/forecast-ui/comparison';
import { bestSpeciesForPeriod } from '@/lib/forecast-ui/species';
import { toForecastSpotIdentity } from '@/lib/forecast-ui/spots';
import type {
  ForecastComparisonItem,
  ForecastComparisonResponse,
  ForecastContextResponse,
  ForecastCoverage,
  ForecastHumanInterpretation,
  ForecastInterval,
  ForecastPeriod,
} from '@/lib/forecast-ui/types';
import { getSpotSpecies, getSpeciesCatalog } from '@/lib/species/queries';
import { getActiveSpots } from '@/lib/spots/queries';
import {
  addProductDays,
  productDateTimeToEpochMs,
  todayProductDate,
} from '@/lib/time/casablanca';
import {
  getTimelinesForSpot,
  getTimelinesForSpotProgressively,
} from '@/lib/timeline/service';
import type { Timeline } from '@/lib/timeline/types';
import type { Spot } from '@/types/spot';

const INTERVALS: readonly ForecastInterval[] = ['30m', '1h', '3h', '6h'];
export const FORECAST_CONTEXT_CACHE_TTL_MS = 2 * 60 * 1000;
const FORECAST_CONTEXT_CACHE_MAX_ENTRIES = 12;

interface ForecastContextCacheEntry {
  data: ForecastContextResponse & { coverage: 'week' };
  expiresAt: number;
}

const forecastContextCache = new Map<string, ForecastContextCacheEntry>();
const forecastContextInFlight = new Map<
  string,
  Promise<ForecastContextResponse & { coverage: 'week' }>
>();

export type ForecastContextCacheStatus = 'hit' | 'miss' | 'coalesced';

export function forecastContextCacheKey(
  spotId: string,
  rangeStart: string
): string {
  return `forecast-context:v1:${spotId}:${rangeStart}`;
}

export function selectContextDate<T extends ForecastContextResponse>(
  data: T,
  selectedDate: string
): T {
  if (!data.days.some((day) => day.date === selectedDate)) return data;
  return {
    ...data,
    selectedDate,
    interpretation:
      data.interpretations[selectedDate] ?? data.interpretation,
  } as T;
}

function retainBoundedForecastContextCache(): void {
  while (forecastContextCache.size > FORECAST_CONTEXT_CACHE_MAX_ENTRIES) {
    const oldestKey = forecastContextCache.keys().next().value as
      | string
      | undefined;
    if (!oldestKey) return;
    forecastContextCache.delete(oldestKey);
  }
}

function spotInput(spot: Spot) {
  return {
    id: spot.id,
    slug: spot.slug,
    latitude: spot.latitude,
    longitude: spot.longitude,
    spotType: spot.spotType,
    difficultyLevel: spot.difficultyLevel,
    difficultyFactors: spot.difficultyFactors,
  };
}

function maxIso(values: Array<string | null>): string | null {
  return values
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1) ?? null;
}

function minutesSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
}

function enrichSpecies(
  periods: ForecastPeriod[],
  linked: Awaited<ReturnType<typeof getSpotSpecies>>,
  catalog: Awaited<ReturnType<typeof getSpeciesCatalog>>
): ForecastPeriod[] {
  return periods.map((period) => ({
    ...period,
    bestSpecies: bestSpeciesForPeriod(period, linked, catalog),
  }));
}

function interpretationFor(
  timeline: Timeline,
  periods: ForecastPeriod[]
): ForecastHumanInterpretation {
  const recommended = timeline.recommendedWindow;
  const best = recommended
    ? periods.find(
        (period) =>
          new Date(period.start).getTime() <=
            new Date(recommended.peakTime).getTime() &&
          new Date(period.end).getTime() >
            new Date(recommended.peakTime).getTime()
      ) ?? periods[0]
    : periods.reduce<ForecastPeriod | undefined>(
        (current, period) =>
          !current || period.fishing.score > current.fishing.score
            ? period
            : current,
        undefined
      );
  const missing = best?.confidence.missingInputs ?? [];
  return {
    bestPeriod: recommended
      ? `${recommended.start} to ${recommended.end}`
      : 'No recommended fishing window for this day.',
    qualityReason: best
      ? `${best.fishing.label} fishing quality (${best.fishing.score}/100), with ${
          best.wind.speedKmh === null
            ? 'wind unavailable'
            : `${Math.round(best.wind.speedKmh)} km/h wind`
        } and ${
          best.waves.heightM === null
            ? 'waves unavailable'
            : `${best.waves.heightM.toFixed(1)} m waves`
        }.`
      : 'Fishing quality is unavailable.',
    safetyConcern:
      best?.safety.primaryWarning ??
      (best?.safety.status === 'Safe'
        ? 'No active modelled safety warning in the best period.'
        : 'Safety cannot be fully assessed.'),
    technique:
      'No technique recommendation is available because FishCast has no verified technique dataset yet.',
    missingData:
      missing.length > 0
        ? `Missing inputs: ${missing.join(', ')}.`
        : 'No forecast inputs are missing for the best period.',
    confidenceLimitation: best
      ? `${best.confidence.label} confidence (${best.confidence.completenessPercentage}% complete). Forecast confidence describes data completeness and freshness, not certainty.`
      : 'Forecast confidence is unavailable.',
    orientationLimitation:
      'Onshore, offshore and cross-shore labels use an unverified editorial shoreline orientation.',
  };
}

function projectForecastContext<T extends ForecastCoverage>(
  spot: Spot,
  timelines: Timeline[],
  dates: string[],
  selectedDate: string,
  linkedSpecies: Awaited<ReturnType<typeof getSpotSpecies>>,
  catalog: Awaited<ReturnType<typeof getSpeciesCatalog>>,
  coverage: T,
  now: Date
): ForecastContextResponse & { coverage: T } {
  const firstTimeline = timelines[0];
  const startDate = dates[0];
  const endDate = dates[6];
  if (!firstTimeline || !startDate || !endDate) {
    throw new Error('Forecast context requires at least one timeline');
  }
  const periods = Object.fromEntries(
    INTERVALS.map((interval) => [
      interval,
      enrichSpecies(
        timelines.flatMap((timeline) =>
          aggregateTimeline(timeline, interval, now)
        ),
        linkedSpecies,
        catalog
      ),
    ])
  ) as Record<ForecastInterval, ForecastPeriod[]>;
  const days = timelines.map((timeline) => {
    const summary = summarizeTimeline(timeline);
    const dayPeriods = periods['1h'].filter(
      (period) => period.date === timeline.date
    );
    const representative = timeline.recommendedWindow
      ? dayPeriods.find(
          (period) =>
            period.start <= timeline.recommendedWindow!.peakTime &&
            period.end > timeline.recommendedWindow!.peakTime
        )
      : dayPeriods[0];
    return { ...summary, bestSpecies: representative?.bestSpecies ?? null };
  });
  const selectedTimeline =
    timelines.find((timeline) => timeline.date === selectedDate) ?? firstTimeline;
  const selectedPeriods = periods['1h'].filter(
    (period) => period.date === selectedTimeline.date
  );
  const interpretations = Object.fromEntries(
    timelines.map((timeline) => [
      timeline.date,
      interpretationFor(
        timeline,
        periods['1h'].filter((period) => period.date === timeline.date)
      ),
    ])
  );
  const forecastFetchedAt = maxIso(
    timelines.map((timeline) => timeline.sourceTimestamps.forecastFetchedAt)
  );
  const marineFetchedAt = maxIso(
    timelines.map((timeline) => timeline.sourceTimestamps.marineFetchedAt)
  );
  const oldestTimestamp = [forecastFetchedAt, marineFetchedAt]
    .filter((value): value is string => value !== null)
    .sort()[0] ?? null;

  return {
    schemaVersion: 1,
    coverage,
    spot: toForecastSpotIdentity(spot),
    timeZone: 'Africa/Casablanca',
    range: { startDate, endDate },
    selectedDate: selectedTimeline.date,
    generatedAt: now.toISOString(),
    sourceTimestamps: { forecastFetchedAt, marineFetchedAt },
    freshnessMinutes: minutesSince(oldestTimestamp, now),
    days,
    periods,
    interpretation: interpretationFor(selectedTimeline, selectedPeriods),
    interpretations,
    orientationVerified: false,
  };
}

export async function getForecastContext(
  spot: Spot,
  selectedDate: string,
  now: Date = new Date()
): Promise<ForecastContextResponse & { coverage: 'week' }> {
  const startDate = todayProductDate(now);
  const dates = Array.from({ length: 7 }, (_, index) =>
    addProductDays(startDate, index)
  );
  const [timelines, linkedSpecies, catalog] = await Promise.all([
    getTimelinesForSpot(spotInput(spot), dates),
    getSpotSpecies(spot.id).catch(() => []),
    getSpeciesCatalog().catch(() => []),
  ]);
  return projectForecastContext(
    spot,
    timelines,
    dates,
    selectedDate,
    linkedSpecies,
    catalog,
    'week',
    now
  );
}

/**
 * Best-effort per-process cache for the normalized, evaluated browser context.
 * Durable five-minute timelines remain in the private Supabase cache; this
 * short layer only avoids rebuilding identical UI projections and species
 * enrichment during rapid navigation or concurrent requests.
 */
export async function getCachedForecastContext(
  spot: Spot,
  selectedDate: string,
  now: Date = new Date()
): Promise<{
  data: ForecastContextResponse;
  cacheStatus: ForecastContextCacheStatus;
}> {
  const startDate = todayProductDate(now);
  const key = forecastContextCacheKey(spot.id, startDate);
  const cached = forecastContextCache.get(key);
  if (cached && cached.expiresAt > now.getTime()) {
    forecastContextCache.delete(key);
    forecastContextCache.set(key, cached);
    return {
      data: selectContextDate(cached.data, selectedDate),
      cacheStatus: 'hit',
    };
  }
  if (cached) forecastContextCache.delete(key);

  const existing = forecastContextInFlight.get(key);
  if (existing) {
    return {
      data: selectContextDate(await existing, selectedDate),
      cacheStatus: 'coalesced',
    };
  }

  const request = getForecastContext(spot, startDate, now);
  forecastContextInFlight.set(key, request);
  try {
    const data = await request;
    forecastContextCache.set(key, {
      data,
      expiresAt: now.getTime() + FORECAST_CONTEXT_CACHE_TTL_MS,
    });
    retainBoundedForecastContextCache();
    return {
      data: selectContextDate(data, selectedDate),
      cacheStatus: 'miss',
    };
  } finally {
    if (forecastContextInFlight.get(key) === request) {
      forecastContextInFlight.delete(key);
    }
  }
}

/**
 * Builds a browser forecast in two deterministic phases. A complete in-memory
 * context remains the fastest path and emits only the week result. On a miss,
 * today's fully enriched projection is exposed through `onToday` before the
 * same operation evaluates and caches the remaining six days.
 */
export async function getProgressiveForecastContext(
  spot: Spot,
  selectedDate: string,
  onToday: (
    data: ForecastContextResponse & { coverage: 'today' }
  ) => void | Promise<void>,
  now: Date = new Date()
): Promise<{
  data: ForecastContextResponse & { coverage: 'week' };
  cacheStatus: ForecastContextCacheStatus;
}> {
  const startDate = todayProductDate(now);
  const dates = Array.from({ length: 7 }, (_, index) =>
    addProductDays(startDate, index)
  );
  const key = forecastContextCacheKey(spot.id, startDate);
  const cached = forecastContextCache.get(key);
  if (cached && cached.expiresAt > now.getTime()) {
    forecastContextCache.delete(key);
    forecastContextCache.set(key, cached);
    return {
      data: selectContextDate(cached.data, selectedDate),
      cacheStatus: 'hit',
    };
  }
  if (cached) forecastContextCache.delete(key);

  const existing = forecastContextInFlight.get(key);
  if (existing) {
    return {
      data: selectContextDate(await existing, selectedDate),
      cacheStatus: 'coalesced',
    };
  }

  // Species queries start with cache/provider work so today's period retains
  // the exact enrichment behavior of the previous all-at-once response.
  const enrichmentPromise = Promise.all([
    getSpotSpecies(spot.id).catch(() => []),
    getSpeciesCatalog().catch(() => []),
  ]);
  const request = (async () => {
    const timelines = await getTimelinesForSpotProgressively(
      spotInput(spot),
      dates,
      async (todayTimeline) => {
        const [linkedSpecies, catalog] = await enrichmentPromise;
        const todayContext = projectForecastContext(
          spot,
          [todayTimeline],
          dates,
          startDate,
          linkedSpecies,
          catalog,
          'today',
          now
        );
        await onToday(todayContext);
      },
      now
    );
    const [linkedSpecies, catalog] = await enrichmentPromise;
    return projectForecastContext(
      spot,
      timelines,
      dates,
      selectedDate,
      linkedSpecies,
      catalog,
      'week',
      now
    );
  })();
  forecastContextInFlight.set(key, request);
  try {
    const data = await request;
    forecastContextCache.set(key, {
      data,
      expiresAt: now.getTime() + FORECAST_CONTEXT_CACHE_TTL_MS,
    });
    retainBoundedForecastContextCache();
    return {
      data: selectContextDate(data, selectedDate),
      cacheStatus: 'miss',
    };
  } finally {
    if (forecastContextInFlight.get(key) === request) {
      forecastContextInFlight.delete(key);
    }
  }
}

function nearestPeriod(
  periods: ForecastPeriod[],
  targetMs: number
): ForecastPeriod | null {
  return periods.find(
    (period) =>
      new Date(period.start).getTime() <= targetMs &&
      new Date(period.end).getTime() > targetMs
  ) ?? null;
}

export async function getForecastComparison(
  date: string,
  time: string,
  now: Date = new Date()
): Promise<ForecastComparisonResponse> {
  const [hour, minute] = time.split(':').map(Number);
  const targetMs = productDateTimeToEpochMs(date, hour, minute);
  const spots = await getActiveSpots();
  const results = await Promise.allSettled(
    spots.map(async (spot): Promise<ForecastComparisonItem> => {
      const [timeline] = await getTimelinesForSpot(spotInput(spot), [date]);
      if (!timeline) throw new Error('Timeline unavailable');
      const period = nearestPeriod(aggregateTimeline(timeline, '1h', now), targetMs);
      if (!period) throw new Error('Selected period unavailable');
      return {
        spot: toForecastSpotIdentity(spot),
        timestamp: new Date(targetMs).toISOString(),
        fishing: period.fishing,
        safety: period.safety,
        waveHeightM: period.waves.heightM,
        wavePeriodS: period.waves.periodS,
        windSpeedKmh: period.wind.speedKmh,
        windRelationship: period.wind.relationship,
        confidence: period.confidence,
        bestWindow: timeline.recommendedWindow,
      };
    })
  );
  const items: ForecastComparisonItem[] = [];
  const failures: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') items.push(result.value);
    else failures.push(toForecastSpotIdentity(spots[index]!).displayName);
  });
  return {
    schemaVersion: 1,
    date,
    timestamp: new Date(targetMs).toISOString(),
    items: sortComparisonItems(items),
    failures,
  };
}
