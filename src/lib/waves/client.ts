import 'server-only';
import { buildUrl, fetchJson } from '@/lib/marine/http';
import { OPEN_METEO_MARINE_URL } from '@/lib/marine/constants';

/** Raw Open-Meteo Marine payload (subset). Internal only. */
export interface OpenMeteoMarineResponse {
  utc_offset_seconds?: number;
  current?: {
    time?: string;
    wave_height?: number;
    wave_period?: number;
    wave_direction?: number;
    swell_wave_height?: number;
    swell_wave_period?: number;
    swell_wave_direction?: number;
  };
  hourly?: {
    time?: string[];
    wave_height?: (number | null)[];
    swell_wave_height?: (number | null)[];
    sea_level_height_msl?: (number | null)[];
  };
}

const CURRENT_FIELDS = [
  'wave_height',
  'wave_period',
  'wave_direction',
  'swell_wave_height',
  'swell_wave_period',
  'swell_wave_direction',
].join(',');

const HOURLY_FIELDS = [
  'wave_height',
  'swell_wave_height',
  'sea_level_height_msl',
].join(',');
const RESPONSE_REUSE_MS = 60 * 1000;
const inFlight = new Map<string, Promise<OpenMeteoMarineResponse>>();
const recent = new Map<
  string,
  { data: OpenMeteoMarineResponse; expiresAt: number }
>();

/**
 * One shared Open-Meteo Marine request supplies current waves plus the native
 * hourly wave, swell, and modelled sea-level points used by the tide/timeline
 * paths. Concurrent consumers of the same coordinates reuse the in-flight
 * promise, and a short server-memory reuse window covers sequential requests
 * triggered by one page load. Durable normalized caching remains in Supabase.
 */
export async function fetchOpenMeteoMarine(
  lat: number,
  lng: number
): Promise<OpenMeteoMarineResponse> {
  const url = buildUrl(OPEN_METEO_MARINE_URL, {
    latitude: lat,
    longitude: lng,
    current: CURRENT_FIELDS,
    hourly: HOURLY_FIELDS,
    timezone: 'Africa/Casablanca',
    past_days: 1,
    forecast_days: 7,
    cell_selection: 'sea',
  });

  const cached = recent.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  if (cached) recent.delete(url);

  const existing = inFlight.get(url);
  if (existing) return existing;

  const request = fetchJson<OpenMeteoMarineResponse>(url);
  inFlight.set(url, request);
  try {
    const data = await request;
    recent.set(url, { data, expiresAt: Date.now() + RESPONSE_REUSE_MS });
    return data;
  } finally {
    inFlight.delete(url);
  }
}
