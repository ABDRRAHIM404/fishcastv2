import 'server-only';
import type { MarineKind } from '@/types/marine';

/**
 * Cache TTLs per marine kind (milliseconds). Approved Phase 5 strategy:
 * weather/wind/waves 30 min, tide 60 min.
 */
export const TTL_MS: Record<MarineKind, number> = {
  weather: 30 * 60 * 1000,
  wind: 30 * 60 * 1000,
  waves: 30 * 60 * 1000,
  tide: 60 * 60 * 1000,
};

export const PROVIDERS = {
  // Version suffix invalidates normalized cache rows created before the
  // expanded integrity/safety domain contract.
  openMeteoForecast: 'open-meteo-forecast-v2',
  openMeteoMarine: 'open-meteo-marine-v2',
} as const;

export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_MARINE_URL =
  'https://marine-api.open-meteo.com/v1/marine';
