import 'server-only';
import { buildUrl, fetchJson } from '@/lib/marine/http';
import { OPEN_METEO_FORECAST_URL } from '@/lib/marine/constants';
import { createRequestReuse } from '@/lib/marine/request-reuse';

/**
 * Raw Open-Meteo forecast payload (subset we consume). Kept internal so the
 * rest of the app never depends on provider response shapes. One request
 * supplies both weather and wind fields.
 */
export interface OpenMeteoForecastResponse {
  utc_offset_seconds?: number;
  current?: {
    time?: string | number;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    cloud_cover?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
    wind_direction_10m?: number;
    surface_pressure?: number;
    visibility?: number;
  };
}

const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'cloud_cover',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'surface_pressure',
  'visibility',
].join(',');
const reuseCurrentForecastRequest =
  createRequestReuse<OpenMeteoForecastResponse>();

export async function fetchOpenMeteoForecast(
  lat: number,
  lng: number
): Promise<OpenMeteoForecastResponse> {
  const url = buildUrl(OPEN_METEO_FORECAST_URL, {
    latitude: lat,
    longitude: lng,
    current: CURRENT_FIELDS,
    wind_speed_unit: 'kmh',
    timezone: 'Africa/Casablanca',
    forecast_days: 7,
    timeformat: 'unixtime',
  });
  return reuseCurrentForecastRequest(url, () =>
    fetchJson<OpenMeteoForecastResponse>(url)
  );
}
