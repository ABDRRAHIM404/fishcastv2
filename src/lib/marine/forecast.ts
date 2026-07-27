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
  windGustKmh: (number | null)[];
  windDirectionDeg: (number | null)[];
  /** Open-Meteo weather code per hour (for future use). */
  weatherCode: (number | null)[];
  precipitationMm: (number | null)[];
  cloudCoverPct: (number | null)[];
  pressureMb: (number | null)[];
  temperatureC: (number | null)[];
  visibilityM: (number | null)[];
  fetchedAt: string;
}

export interface HourlyMarineSeries {
  time: string[];
  waveHeightM: (number | null)[];
  wavePeriodS: (number | null)[];
  waveDirectionDeg: (number | null)[];
  swellHeightM: (number | null)[];
  swellPeriodS: (number | null)[];
  swellDirectionDeg: (number | null)[];
  secondarySwellHeightM: (number | null)[];
  secondarySwellPeriodS: (number | null)[];
  secondarySwellDirectionDeg: (number | null)[];
  seaSurfaceTemperatureC: (number | null)[];
  oceanCurrentVelocityKmh: (number | null)[];
  oceanCurrentDirectionDeg: (number | null)[];
  /** Native hourly Open-Meteo sea-level source points, not interpolated. */
  seaLevelPoints: ModelledSeaLevelPoint[];
  fetchedAt: string;
}

interface RawOpenMeteoForecast {
  utc_offset_seconds?: number;
  hourly?: {
    time?: (string | number)[];
    wind_speed_10m?: (number | null)[];
    wind_gusts_10m?: (number | null)[];
    wind_direction_10m?: (number | null)[];
    weather_code?: (number | null)[];
    precipitation?: (number | null)[];
    cloud_cover?: (number | null)[];
    surface_pressure?: (number | null)[];
    temperature_2m?: (number | null)[];
    visibility?: (number | null)[];
  };
}

function numericArray(
  value: (number | null)[] | undefined
): (number | null)[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) =>
    typeof item === 'number' && Number.isFinite(item) ? item : null
  );
}

function normalizeTimes(
  times: (string | number)[] | undefined,
  utcOffsetSeconds: number
): string[] {
  if (!Array.isArray(times)) return [];
  return times.map(
    (time) =>
      openMeteoTimeToIso(time, utcOffsetSeconds) ?? 'invalid-provider-time'
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
      'wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,precipitation,cloud_cover,surface_pressure,temperature_2m,visibility',
    wind_speed_unit: 'kmh',
    timezone: 'Africa/Casablanca',
    forecast_days: 7,
    timeformat: 'unixtime',
  });
  const raw = await fetchJson<RawOpenMeteoForecast>(url);
  const h = raw.hourly ?? {};
  const fetchedAt = new Date().toISOString();
  return {
    time: normalizeTimes(h.time, raw.utc_offset_seconds ?? 0),
    windSpeedKmh: numericArray(h.wind_speed_10m),
    windGustKmh: numericArray(h.wind_gusts_10m),
    windDirectionDeg: numericArray(h.wind_direction_10m),
    weatherCode: numericArray(h.weather_code),
    precipitationMm: numericArray(h.precipitation),
    cloudCoverPct: numericArray(h.cloud_cover),
    pressureMb: numericArray(h.surface_pressure),
    temperatureC: numericArray(h.temperature_2m),
    visibilityM: numericArray(h.visibility),
    fetchedAt,
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
    waveHeightM: numericArray(h.wave_height),
    wavePeriodS: numericArray(h.wave_period),
    waveDirectionDeg: numericArray(h.wave_direction),
    swellHeightM: numericArray(h.swell_wave_height),
    swellPeriodS: numericArray(h.swell_wave_period),
    swellDirectionDeg: numericArray(h.swell_wave_direction),
    secondarySwellHeightM: numericArray(h.secondary_swell_wave_height),
    secondarySwellPeriodS: numericArray(h.secondary_swell_wave_period),
    secondarySwellDirectionDeg: numericArray(
      h.secondary_swell_wave_direction
    ),
    seaSurfaceTemperatureC: numericArray(h.sea_surface_temperature),
    oceanCurrentVelocityKmh: numericArray(h.ocean_current_velocity),
    oceanCurrentDirectionDeg: numericArray(h.ocean_current_direction),
    seaLevelPoints: toModelledSeaLevelPoints(
      h.time,
      h.sea_level_height_msl,
      raw.utc_offset_seconds ?? 0
    ),
    fetchedAt: new Date().toISOString(),
  };
}
