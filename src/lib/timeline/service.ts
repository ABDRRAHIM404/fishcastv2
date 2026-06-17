import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { buildTimeline } from '@/lib/timeline/build';
import {
  fetchHourlyForecast,
  fetchHourlyMarine,
  fetchTideSeries,
} from '@/lib/marine/forecast';
import type { ForecastAnchors, Timeline } from '@/lib/timeline/types';
import type { Json } from '@/lib/supabase/types';

/** Timeline cache TTL: 30 min, aligned with marine data TTLs. */
export const TIMELINE_TTL_MS = 30 * 60 * 1000;

export interface TimelineSpotInput {
  id: string;
  latitude: number;
  longitude: number;
}

// never[] inference workaround for the new marine_timeline_cache table (same
// pattern as favorites / marine_cache / score_cache).
interface TimelineCacheRow {
  payload: Json;
  expires_at: string;
}

/** Returns today's local date as YYYY-MM-DD. */
export function todayLocalDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local-day start epoch (ms) for a YYYY-MM-DD date string. */
export function dayStartMs(date: string): number {
  return new Date(`${date}T00:00:00`).getTime();
}

async function readCache(
  spotId: string,
  date: string
): Promise<Timeline | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('marine_timeline_cache')
    .select('payload, expires_at')
    .eq('spot_id', spotId)
    .eq('date', date)
    .maybeSingle();

  const row = data as TimelineCacheRow | null;
  if (error || !row) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  return row.payload as unknown as Timeline;
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

  const [forecast, marine, tide] = await Promise.allSettled([
    fetchHourlyForecast(spot.latitude, spot.longitude),
    fetchHourlyMarine(spot.latitude, spot.longitude),
    fetchTideSeries(spot.latitude, spot.longitude),
  ]);

  const anchors: ForecastAnchors = {
    wind:
      forecast.status === 'fulfilled'
        ? {
            time: forecast.value.time,
            speedKmh: forecast.value.windSpeedKmh,
            directionDeg: forecast.value.windDirectionDeg,
          }
        : { time: [], speedKmh: [], directionDeg: [] },
    waves:
      marine.status === 'fulfilled'
        ? { time: marine.value.time, heightM: marine.value.waveHeightM }
        : { time: [], heightM: [] },
    weather:
      forecast.status === 'fulfilled'
        ? {
            time: forecast.value.time,
            precipitationMm: forecast.value.precipitationMm,
            cloudCoverPct: forecast.value.cloudCoverPct,
          }
        : { time: [], precipitationMm: [], cloudCoverPct: [] },
    tide: tide.status === 'fulfilled' ? tide.value : [],
  };

  const now = new Date();
  const timeline = buildTimeline(
    spot.id,
    date,
    now.getTime(),
    anchors,
    now
  );
  await writeCache(spot.id, date, timeline);
  return timeline;
}
