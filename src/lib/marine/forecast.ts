import 'server-only';
import { buildUrl, fetchJson } from '@/lib/marine/http';
import {
  OPEN_METEO_FORECAST_URL,
  OPEN_METEO_MARINE_URL,
  WORLDTIDES_URL,
} from '@/lib/marine/constants';
import { MissingTideKeyError } from '@/lib/tides/client';

/**
 * Additive hourly forecast-series fetchers for the timeline. These DO NOT touch
 * the Phase 5 current-conditions path; they request `hourly=` arrays used as the
 * anchor points the interpolation engine fills to 5-minute resolution.
 *
 * Raw provider response shapes are kept internal to this module.
 */

export interface HourlyForecastSeries {
  /** ISO timestamps for each hourly anchor point. */
  time: string[];
  windSpeedKmh: (number | null)[];
  windDirectionDeg: (number | null)[];
  /** Open-Meteo weather code per hour (for future use). */
  weatherCode: (number | null)[];
  precipitationMm: (number | null)[];
  cloudCoverPct: (number | null)[];
}

export interface HourlyMarineSeries {
  time: string[];
  waveHeightM: (number | null)[];
  swellHeightM: (number | null)[];
}

export interface TideSeriesPoint {
  /** ISO timestamp. */
  time: string;
  heightM: number;
}

interface RawOpenMeteoForecast {
  hourly?: {
    time?: string[];
    wind_speed_10m?: (number | null)[];
    wind_direction_10m?: (number | null)[];
    weather_code?: (number | null)[];
    precipitation?: (number | null)[];
    cloud_cover?: (number | null)[];
  };
}

interface RawOpenMeteoMarine {
  hourly?: {
    time?: string[];
    wave_height?: (number | null)[];
    swell_wave_height?: (number | null)[];
  };
}

interface RawWorldTides {
  error?: string;
  heights?: { dt?: number; date?: string; height?: number }[];
}

function arr<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/** Fetches the hourly weather + wind series for a local day. */
export async function fetchHourlyForecast(
  lat: number,
  lng: number
): Promise<HourlyForecastSeries> {
  const url = buildUrl(OPEN_METEO_FORECAST_URL, {
    latitude: lat,
    longitude: lng,
    hourly:
      'wind_speed_10m,wind_direction_10m,weather_code,precipitation,cloud_cover',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    forecast_days: 3,
  });
  const raw = await fetchJson<RawOpenMeteoForecast>(url);
  const h = raw.hourly ?? {};
  return {
    time: arr(h.time),
    windSpeedKmh: arr(h.wind_speed_10m),
    windDirectionDeg: arr(h.wind_direction_10m),
    weatherCode: arr(h.weather_code),
    precipitationMm: arr(h.precipitation),
    cloudCoverPct: arr(h.cloud_cover),
  };
}

/** Fetches the hourly wave series for a local day. */
export async function fetchHourlyMarine(
  lat: number,
  lng: number
): Promise<HourlyMarineSeries> {
  const url = buildUrl(OPEN_METEO_MARINE_URL, {
    latitude: lat,
    longitude: lng,
    hourly: 'wave_height,swell_wave_height',
    timezone: 'auto',
    forecast_days: 3,
  });
  const raw = await fetchJson<RawOpenMeteoMarine>(url);
  const h = raw.hourly ?? {};
  return {
    time: arr(h.time),
    waveHeightM: arr(h.wave_height),
    swellHeightM: arr(h.swell_wave_height),
  };
}

/** Fetches the tide height series (already sub-hourly) from WorldTides. */
export async function fetchTideSeries(
  lat: number,
  lng: number
): Promise<TideSeriesPoint[]> {
  const key = process.env.WORLDTIDES_API_KEY;
  if (!key) throw new MissingTideKeyError();

  const url = buildUrl(WORLDTIDES_URL, {
    heights: '',
    lat,
    lon: lng,
    key,
    days: 3,
  });
  const raw = await fetchJson<RawWorldTides>(url);
  if (raw.error) throw new Error(`WorldTides error: ${raw.error}`);

  return arr(raw.heights)
    .map((p): TideSeriesPoint | null => {
      const time =
        p.date ?? (p.dt ? new Date(p.dt * 1000).toISOString() : null);
      if (!time || typeof p.height !== 'number') return null;
      return { time, heightM: p.height };
    })
    .filter((p): p is TideSeriesPoint => p !== null)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}
