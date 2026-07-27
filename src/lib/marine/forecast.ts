import 'server-only';
import { buildUrl, fetchJson } from '@/lib/marine/http';
import { OPEN_METEO_FORECAST_URL } from '@/lib/marine/constants';
import { fetchOpenMeteoMarine } from '@/lib/waves/client';
import {
  openMeteoTimeToIso,
  toModelledSeaLevelPoints,
} from '@/lib/tides/derive';
import type { ModelledSeaLevelPoint } from '@/types/marine';

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
  pressureMb: (number | null)[];
}

export interface HourlyMarineSeries {
  time: string[];
  waveHeightM: (number | null)[];
  swellHeightM: (number | null)[];
  /** Native hourly Open-Meteo sea-level source points, not interpolated. */
  seaLevelPoints: ModelledSeaLevelPoint[];
}

interface RawOpenMeteoForecast {
  utc_offset_seconds?: number;
  hourly?: {
    time?: string[];
    wind_speed_10m?: (number | null)[];
    wind_direction_10m?: (number | null)[];
    weather_code?: (number | null)[];
    precipitation?: (number | null)[];
    cloud_cover?: (number | null)[];
    surface_pressure?: (number | null)[];
  };
}

function arr<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeTimes(
  times: string[] | undefined,
  utcOffsetSeconds: number
): string[] {
  return arr(times).map(
    (time) => openMeteoTimeToIso(time, utcOffsetSeconds) ?? time
  );
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
      'wind_speed_10m,wind_direction_10m,weather_code,precipitation,cloud_cover,surface_pressure',
    wind_speed_unit: 'kmh',
    timezone: 'Africa/Casablanca',
    forecast_days: 7,
  });
  const raw = await fetchJson<RawOpenMeteoForecast>(url);
  const h = raw.hourly ?? {};
  return {
    time: normalizeTimes(h.time, raw.utc_offset_seconds ?? 0),
    windSpeedKmh: arr(h.wind_speed_10m),
    windDirectionDeg: arr(h.wind_direction_10m),
    weatherCode: arr(h.weather_code),
    precipitationMm: arr(h.precipitation),
    cloudCoverPct: arr(h.cloud_cover),
    pressureMb: arr(h.surface_pressure),
  };
}

/** Fetches hourly waves plus native modelled sea-level source points. */
export async function fetchHourlyMarine(
  lat: number,
  lng: number
): Promise<HourlyMarineSeries> {
  const raw = await fetchOpenMeteoMarine(lat, lng);
  const h = raw.hourly ?? {};
  return {
    time: normalizeTimes(h.time, raw.utc_offset_seconds ?? 0),
    waveHeightM: arr(h.wave_height),
    swellHeightM: arr(h.swell_wave_height),
    seaLevelPoints: toModelledSeaLevelPoints(
      h.time,
      h.sea_level_height_msl,
      raw.utc_offset_seconds ?? 0
    ),
  };
}
