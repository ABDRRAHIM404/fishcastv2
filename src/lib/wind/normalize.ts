import 'server-only';
import { degreesToCompass, type WindConditions } from '@/types/marine';
import type { OpenMeteoForecastResponse } from '@/lib/weather/client';
import { openMeteoTimeToIso } from '@/lib/tides/derive';

function num(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Maps the wind fields of a raw Open-Meteo forecast payload to WindConditions.
 * Wind shares the forecast request with weather (single upstream call).
 */
export function normalizeWind(raw: OpenMeteoForecastResponse): WindConditions {
  const c = raw.current ?? {};
  const observedAt =
    c.time !== undefined
      ? openMeteoTimeToIso(c.time, raw.utc_offset_seconds ?? 0)
      : null;
  const currentNumber = (value: number | undefined): number | null =>
    observedAt === null ? null : num(value);
  const directionDeg = currentNumber(c.wind_direction_10m);
  return {
    observedAt: observedAt ?? '1970-01-01T00:00:00.000Z',
    speedKmh: currentNumber(c.wind_speed_10m),
    gustKmh: currentNumber(c.wind_gusts_10m),
    directionDeg,
    directionCompass: degreesToCompass(directionDeg),
  };
}
