import 'server-only';
import type { WeatherConditions } from '@/types/marine';
import type { OpenMeteoForecastResponse } from '@/lib/weather/client';
import { openMeteoTimeToIso } from '@/lib/tides/derive';

function num(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Maps a raw Open-Meteo forecast payload to WeatherConditions. */
export function normalizeWeather(
  raw: OpenMeteoForecastResponse
): WeatherConditions {
  const c = raw.current ?? {};
  const observedAt =
    c.time !== undefined
      ? openMeteoTimeToIso(c.time, raw.utc_offset_seconds ?? 0)
      : null;
  const currentNumber = (value: number | undefined): number | null =>
    observedAt === null ? null : num(value);
  return {
    observedAt: observedAt ?? '1970-01-01T00:00:00.000Z',
    temperatureC: currentNumber(c.temperature_2m),
    apparentTemperatureC: currentNumber(c.apparent_temperature),
    humidityPct: currentNumber(c.relative_humidity_2m),
    cloudCoverPct: currentNumber(c.cloud_cover),
    precipitationMm: currentNumber(c.precipitation),
    pressureMb: currentNumber(c.surface_pressure),
    pressureTrendMbPerHr: null,
    weatherCode: currentNumber(c.weather_code),
    visibilityM: currentNumber(c.visibility),
  };
}
