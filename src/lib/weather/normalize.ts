import 'server-only';
import type { WeatherConditions } from '@/types/marine';
import type { OpenMeteoForecastResponse } from '@/lib/weather/client';

function num(value: number | undefined): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

/** Maps a raw Open-Meteo forecast payload to WeatherConditions. */
export function normalizeWeather(
  raw: OpenMeteoForecastResponse
): WeatherConditions {
  const c = raw.current ?? {};
  return {
    observedAt: c.time ?? new Date().toISOString(),
    temperatureC: num(c.temperature_2m),
    apparentTemperatureC: num(c.apparent_temperature),
    humidityPct: num(c.relative_humidity_2m),
    cloudCoverPct: num(c.cloud_cover),
    precipitationMm: num(c.precipitation),
    weatherCode: num(c.weather_code),
  };
}
