import 'server-only';
import type {
  MarineConditions,
  MarineSection,
  WeatherConditions,
  WindConditions,
  WaveConditions,
  TideConditions,
} from '@/types/marine';
import { withCache, type CacheEntry } from '@/lib/marine/cache';
import { PROVIDERS } from '@/lib/marine/constants';
import { fetchOpenMeteoForecast } from '@/lib/weather/client';
import { normalizeWeather } from '@/lib/weather/normalize';
import { normalizeWind } from '@/lib/wind/normalize';
import { fetchOpenMeteoMarine } from '@/lib/waves/client';
import { normalizeWaves } from '@/lib/waves/normalize';
import { fetchWorldTides } from '@/lib/tides/client';
import { normalizeTides } from '@/lib/tides/normalize';

/** Minimal spot shape the marine service needs. */
export interface MarineSpotInput {
  id: string;
  latitude: number;
  longitude: number;
}

function toSection<T>(
  result: PromiseSettledResult<CacheEntry<T>>
): MarineSection<T> {
  if (result.status === 'fulfilled') {
    return {
      status: 'ok',
      data: result.value.data,
      cachedAt: result.value.cachedAt,
    };
  }
  const message =
    result.reason instanceof Error
      ? result.reason.message
      : 'Unavailable';
  return { status: 'error', message };
}

/**
 * Resolves normalized marine conditions for a spot. Weather and wind share a
 * single Open-Meteo forecast call (cached per kind); waves use the Marine API;
 * tides use WorldTides. Each section resolves independently so one provider
 * failure never blocks the others. Cache-aware with per-kind TTLs.
 */
export async function getMarineConditionsForSpot(
  spot: MarineSpotInput
): Promise<MarineConditions> {
  const { id, latitude, longitude } = spot;

  const weatherPromise = withCache<WeatherConditions>(
    id,
    'weather',
    PROVIDERS.openMeteoForecast,
    async () => {
      const raw = await fetchOpenMeteoForecast(latitude, longitude);
      return { normalized: normalizeWeather(raw), raw };
    }
  );

  const windPromise = withCache<WindConditions>(
    id,
    'wind',
    PROVIDERS.openMeteoForecast,
    async () => {
      const raw = await fetchOpenMeteoForecast(latitude, longitude);
      return { normalized: normalizeWind(raw), raw };
    }
  );

  const wavesPromise = withCache<WaveConditions>(
    id,
    'waves',
    PROVIDERS.openMeteoMarine,
    async () => {
      const raw = await fetchOpenMeteoMarine(latitude, longitude);
      return { normalized: normalizeWaves(raw), raw };
    }
  );

  const tidePromise = withCache<TideConditions>(
    id,
    'tide',
    PROVIDERS.worldTides,
    async () => {
      const raw = await fetchWorldTides(latitude, longitude);
      return { normalized: normalizeTides(raw), raw };
    }
  );

  const [weather, wind, waves, tide] = await Promise.allSettled([
    weatherPromise,
    windPromise,
    wavesPromise,
    tidePromise,
  ]);

  return {
    spotId: id,
    generatedAt: new Date().toISOString(),
    weather: toSection(weather),
    wind: toSection(wind),
    waves: toSection(waves),
    tide: toSection(tide),
  };
}
