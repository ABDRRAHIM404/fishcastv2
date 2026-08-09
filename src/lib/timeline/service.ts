import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import { buildTimeline } from '@/lib/timeline/build';
import {
  fetchHourlyForecast,
  fetchHourlyMarine,
} from '@/lib/marine/forecast';
import type { ForecastAnchors, Timeline } from '@/lib/timeline/types';
import type { Json } from '@/lib/supabase/types';
import type { ForecastEvaluationSpot } from '@/lib/forecast/evaluate';
import {
  productDayRange,
  todayProductDate,
} from '@/lib/time/casablanca';

/** Timeline cache TTL: 30 min, aligned with marine data TTLs. */
export const TIMELINE_TTL_MS = 30 * 60 * 1000;

export type TimelineSpotInput = ForecastEvaluationSpot;

// never[] inference workaround for the new marine_timeline_cache table (same
// pattern as favorites / marine_cache / score_cache).
interface TimelineCacheRow {
  payload: Json;
  expires_at: string;
}

/** Returns today's local date as YYYY-MM-DD. */
export function todayLocalDate(now: Date = new Date()): string {
  return todayProductDate(now);
}

/** Local-day start epoch (ms) for a YYYY-MM-DD date string. */
export function dayStartMs(date: string): number {
  return productDayRange(date).startMs;
}

async function readCache(
  spotId: string,
  date: string
): Promise<Timeline | null> {
  const service = createServiceClient();
  if (!service) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service as any)
    .from('marine_timeline_cache')
    .select('payload, expires_at')
    .eq('spot_id', spotId)
    .eq('date', date)
    .maybeSingle();

  const row = data as TimelineCacheRow | null;
  if (error || !row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  const timeline = row.payload as unknown as Timeline;
  if (
    timeline.schemaVersion !== 3 ||
    timeline.tideMetadata?.source !== 'open-meteo-modelled' ||
    timeline.date !== date
  ) {
    return null;
  }
  return timeline;
}

async function writeCache(
  spotId: string,
  date: string,
  timeline: Timeline
): Promise<void> {
  const service = createServiceClient();
  if (!service) return;
  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt.getTime() + TIMELINE_TTL_MS);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any).from('marine_timeline_cache').upsert(
    {
      spot_id: spotId,
      date,
      payload: timeline as unknown as Json,
      fetched_at: fetchedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: 'spot_id,date' }
  );
}

/** Loads the complete seven-day anchor set with one request per provider. */
async function loadAnchors(spot: TimelineSpotInput): Promise<ForecastAnchors> {
  const [forecast, marine] = await Promise.allSettled([
    fetchHourlyForecast(spot.latitude, spot.longitude),
    fetchHourlyMarine(spot.latitude, spot.longitude),
  ]);

  return {
    wind:
      forecast.status === 'fulfilled'
        ? {
            time: forecast.value.time,
            speedKmh: forecast.value.windSpeedKmh,
            gustKmh: forecast.value.windGustKmh,
            directionDeg: forecast.value.windDirectionDeg,
            fetchedAt: forecast.value.fetchedAt,
          }
        : {
            time: [],
            speedKmh: [],
            gustKmh: [],
            directionDeg: [],
            fetchedAt: null,
          },
    waves:
      marine.status === 'fulfilled'
        ? {
            time: marine.value.time,
            heightM: marine.value.waveHeightM,
            periodS: marine.value.wavePeriodS,
            directionDeg: marine.value.waveDirectionDeg,
            swellHeightM: marine.value.swellHeightM,
            swellPeriodS: marine.value.swellPeriodS,
            swellDirectionDeg: marine.value.swellDirectionDeg,
            secondarySwellHeightM: marine.value.secondarySwellHeightM,
            secondarySwellPeriodS: marine.value.secondarySwellPeriodS,
            secondarySwellDirectionDeg:
              marine.value.secondarySwellDirectionDeg,
            seaSurfaceTemperatureC:
              marine.value.seaSurfaceTemperatureC,
            oceanCurrentVelocityKmh:
              marine.value.oceanCurrentVelocityKmh,
            oceanCurrentDirectionDeg:
              marine.value.oceanCurrentDirectionDeg,
            fetchedAt: marine.value.fetchedAt,
          }
        : {
            time: [],
            heightM: [],
            periodS: [],
            directionDeg: [],
            swellHeightM: [],
            swellPeriodS: [],
            swellDirectionDeg: [],
            secondarySwellHeightM: [],
            secondarySwellPeriodS: [],
            secondarySwellDirectionDeg: [],
            seaSurfaceTemperatureC: [],
            oceanCurrentVelocityKmh: [],
            oceanCurrentDirectionDeg: [],
            fetchedAt: null,
          },
    weather:
      forecast.status === 'fulfilled'
        ? {
            time: forecast.value.time,
            precipitationMm: forecast.value.precipitationMm,
            cloudCoverPct: forecast.value.cloudCoverPct,
            pressureMb: forecast.value.pressureMb,
            temperatureC: forecast.value.temperatureC,
            visibilityM: forecast.value.visibilityM,
            weatherCode: forecast.value.weatherCode,
            fetchedAt: forecast.value.fetchedAt,
          }
        : {
            time: [],
            precipitationMm: [],
            cloudCoverPct: [],
            pressureMb: [],
            temperatureC: [],
            visibilityM: [],
            weatherCode: [],
            fetchedAt: null,
          },
    tide: {
      source: 'open-meteo-hourly',
      intervalMinutes: 60,
      points: marine.status === 'fulfilled' ? marine.value.seaLevelPoints : [],
      fetchedAt:
        marine.status === 'fulfilled' ? marine.value.fetchedAt : null,
    },
  };
}

/**
 * Resolves multiple local days in one operation. Fresh per-day cache entries
 * are reused; all cache misses share one hourly forecast and one marine load.
 */
export async function getTimelinesForSpot(
  spot: TimelineSpotInput,
  dates: string[]
): Promise<Timeline[]> {
  if (dates.length === 0) return [];
  const cached = await Promise.all(
    dates.map((date) => readCache(spot.id, date))
  );
  if (cached.every((timeline) => timeline !== null)) {
    return cached as Timeline[];
  }

  const anchors = await loadAnchors(spot);
  const now = new Date();
  const timelines = dates.map((date, index) => {
    const existing = cached[index];
    if (existing) return existing;
    const range = productDayRange(date);
    return buildTimeline(
      spot,
      date,
      range.startMs,
      range.endMs,
      anchors,
      now
    );
  });

  await Promise.all(
    timelines.map((timeline, index) =>
      cached[index]
        ? Promise.resolve()
        : writeCache(spot.id, timeline.date, timeline)
    )
  );
  return timelines;
}

/**
 * Resolves a forecast range in two phases without loading provider anchors
 * twice. The first requested date is made available as soon as its durable
 * cache row can be read or rebuilt. Remaining cache reads begin concurrently,
 * but their CPU-heavy timeline builds wait until the first-day callback has
 * run so a streaming caller can flush useful data before the week is prepared.
 *
 * The provider-anchor promise is lazy: an entirely cached range performs no
 * provider request, while any number of missing days share exactly one
 * forecast request and one marine request within this operation.
 */
export async function getTimelinesForSpotProgressively(
  spot: TimelineSpotInput,
  dates: string[],
  onFirstTimeline: (timeline: Timeline) => void | Promise<void>,
  now: Date = new Date()
): Promise<Timeline[]> {
  const firstDate = dates[0];
  if (!firstDate) return [];

  const remainingDates = dates.slice(1);
  const remainingCachePromise = Promise.all(
    remainingDates.map((date) => readCache(spot.id, date))
  );
  let anchorsPromise: Promise<ForecastAnchors> | null = null;
  const sharedAnchors = () => {
    anchorsPromise ??= loadAnchors(spot);
    return anchorsPromise;
  };

  const firstCached = await readCache(spot.id, firstDate);
  let firstTimeline = firstCached;
  if (!firstTimeline) {
    const range = productDayRange(firstDate);
    firstTimeline = buildTimeline(
      spot,
      firstDate,
      range.startMs,
      range.endMs,
      await sharedAnchors(),
      now
    );
  }

  // Start persistence now, but do not put this network write on the critical
  // path to the first streamed forecast event.
  const firstWritePromise = firstCached
    ? Promise.resolve()
    : writeCache(spot.id, firstTimeline.date, firstTimeline);

  await onFirstTimeline(firstTimeline);

  const remainingCached = await remainingCachePromise;
  const hasMissingRemaining = remainingCached.some(
    (timeline) => timeline === null
  );
  const anchors = hasMissingRemaining ? await sharedAnchors() : null;
  const remainingTimelines = remainingDates.map((date, index) => {
    const cached = remainingCached[index];
    if (cached) return cached;
    const range = productDayRange(date);
    return buildTimeline(
      spot,
      date,
      range.startMs,
      range.endMs,
      anchors!,
      now
    );
  });

  await Promise.all([
    firstWritePromise,
    ...remainingTimelines.map((timeline, index) =>
      remainingCached[index]
        ? Promise.resolve()
        : writeCache(spot.id, timeline.date, timeline)
    ),
  ]);

  return [firstTimeline, ...remainingTimelines];
}

/** Cache-aware resolver for one Casablanca calendar day. */
export async function getTimelineForSpot(
  spot: TimelineSpotInput,
  date: string
): Promise<Timeline> {
  const [timeline] = await getTimelinesForSpot(spot, [date]);
  if (!timeline) throw new Error('Timeline could not be generated');
  return timeline;
}
