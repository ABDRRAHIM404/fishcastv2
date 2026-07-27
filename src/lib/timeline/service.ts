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
    timeline.schemaVersion !== 2 ||
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

/**
 * Cache-aware timeline resolver. Returns a fresh cached timeline when present,
 * otherwise fetches forecast anchor series, builds the deterministic timeline,
 * caches it, and returns it.
 */
export async function getTimelineForSpot(
  spot: TimelineSpotInput,
  date: string
): Promise<Timeline> {
  const cached = await readCache(spot.id, date);
  if (cached) return cached;

  const [forecast, marine] = await Promise.allSettled([
    fetchHourlyForecast(spot.latitude, spot.longitude),
    fetchHourlyMarine(spot.latitude, spot.longitude),
  ]);

  const anchors: ForecastAnchors = {
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

  const now = new Date();
  const range = productDayRange(date);
  const timeline = buildTimeline(
    spot,
    date,
    range.startMs,
    range.endMs,
    anchors,
    now
  );
  await writeCache(spot.id, date, timeline);
  return timeline;
}
