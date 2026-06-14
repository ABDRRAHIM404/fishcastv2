import 'server-only';
import { degreesToCompass, type WindConditions } from '@/types/marine';
import type { OpenMeteoForecastResponse } from '@/lib/weather/client';

function num(value: number | undefined): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

/**
 * Maps the wind fields of a raw Open-Meteo forecast payload to WindConditions.
 * Wind shares the forecast request with weather (single upstream call).
 */
export function normalizeWind(raw: OpenMeteoForecastResponse): WindConditions {
  const c = raw.current ?? {};
  const directionDeg = num(c.wind_direction_10m);
  return {
    observedAt: c.time ?? new Date().toISOString(),
    speedKmh: num(c.wind_speed_10m),
    gustKmh: num(c.wind_gusts_10m),
    directionDeg,
    directionCompass: degreesToCompass(directionDeg),
  };
}
