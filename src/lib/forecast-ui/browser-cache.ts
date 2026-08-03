import type { ForecastContextResponse } from '@/lib/forecast-ui/types';
import { isForecastContextResponse } from '@/lib/forecast-ui/validation';
import { todayProductDate } from '@/lib/time/casablanca';

export const FORECAST_BROWSER_FRESH_MS = 2 * 60 * 1000;
export const FORECAST_BROWSER_RETAIN_MS = 30 * 60 * 1000;
export const FORECAST_BROWSER_MAX_SPOTS = 3;

export type ForecastCacheFreshness = 'fresh' | 'stale' | 'expired';

interface ForecastCacheEntry {
  data: ForecastContextResponse;
  storedAt: number;
}

export interface ForecastCacheSnapshot extends ForecastCacheEntry {
  freshness: Exclude<ForecastCacheFreshness, 'expired'>;
}

export function forecastBrowserCacheKey(
  spot: string,
  rangeStart: string
): string {
  return `forecast-context:v1:${encodeURIComponent(spot)}:${rangeStart}`;
}

export function forecastCacheFreshness(
  storedAt: number,
  now: number,
  freshMs = FORECAST_BROWSER_FRESH_MS,
  retainMs = FORECAST_BROWSER_RETAIN_MS
): ForecastCacheFreshness {
  const age = Math.max(0, now - storedAt);
  if (age <= freshMs) return 'fresh';
  return age <= retainMs ? 'stale' : 'expired';
}

export function selectForecastDate(
  data: ForecastContextResponse,
  selectedDate: string
): ForecastContextResponse {
  if (!data.days.some((day) => day.date === selectedDate)) return data;
  return {
    ...data,
    selectedDate,
    interpretation:
      data.interpretations[selectedDate] ?? data.interpretation,
  };
}

export class ForecastMemoryCache {
  private readonly entries = new Map<string, ForecastCacheEntry>();

  constructor(private readonly maxEntries = FORECAST_BROWSER_MAX_SPOTS) {}

  read(key: string, now = Date.now()): ForecastCacheSnapshot | null {
    const entry = this.entries.get(key);
    if (!entry || !isForecastContextResponse(entry.data)) {
      if (entry) this.entries.delete(key);
      return null;
    }
    const freshness = forecastCacheFreshness(entry.storedAt, now);
    if (freshness === 'expired') {
      this.entries.delete(key);
      return null;
    }
    // Refresh insertion order so the bounded map behaves as a small LRU.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return { ...entry, freshness };
  }

  write(key: string, value: unknown, storedAt = Date.now()): boolean {
    if (!isForecastContextResponse(value)) {
      this.entries.delete(key);
      return false;
    }
    this.entries.delete(key);
    this.entries.set(key, { data: value, storedAt });
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.entries.delete(oldestKey);
    }
    return true;
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

export type ProviderAvailability =
  | { status: 'complete'; message: null }
  | { status: 'partial'; message: string }
  | { status: 'unavailable'; message: string };

export function providerAvailability(
  data: ForecastContextResponse
): ProviderAvailability {
  const forecast = data.sourceTimestamps.forecastFetchedAt !== null;
  const marine = data.sourceTimestamps.marineFetchedAt !== null;
  if (forecast && marine) return { status: 'complete', message: null };
  if (forecast) {
    return {
      status: 'partial',
      message:
        'Wave, swell, current or modelled tide data could not be refreshed. Available weather and wind data are still shown.',
    };
  }
  if (marine) {
    return {
      status: 'partial',
      message:
        'Weather and wind data could not be refreshed. Available marine conditions are still shown.',
    };
  }
  return {
    status: 'unavailable',
    message:
      'Current provider data could not be refreshed. Cached or unavailable values are clearly marked.',
  };
}

export function forecastRefreshLabel({
  refreshing,
  sourceAgeMinutes,
  refreshFailed,
}: {
  refreshing: boolean;
  sourceAgeMinutes: number | null;
  refreshFailed: boolean;
}): string | null {
  const age =
    sourceAgeMinutes === null
      ? 'Cached forecast'
      : `Cached ${sourceAgeMinutes} min ago`;
  if (refreshing) return `${age} · Refreshing`;
  if (refreshFailed) return `${age} · Refresh failed`;
  return null;
}

const forecastMemoryCache = new ForecastMemoryCache();

interface PendingForecastRequest {
  controller: AbortController;
  promise: Promise<ForecastContextResponse>;
  consumers: Set<symbol>;
}

const pendingRequests = new Map<string, PendingForecastRequest>();
let navigationPrime:
  | { key: string; release: () => void }
  | null = null;

function rangeStart(): string {
  return todayProductDate();
}

export function forecastRequestIdentity(spot: string): {
  key: string;
  rangeStart: string;
} {
  const start = rangeStart();
  return { key: forecastBrowserCacheKey(spot, start), rangeStart: start };
}

export function readBrowserForecast(
  spot: string,
  selectedDate: string,
  now = Date.now()
): (ForecastCacheSnapshot & { data: ForecastContextResponse }) | null {
  const snapshot = forecastMemoryCache.read(
    forecastRequestIdentity(spot).key,
    now
  );
  return snapshot
    ? { ...snapshot, data: selectForecastDate(snapshot.data, selectedDate) }
    : null;
}

function friendlyForecastError(error: unknown): Error {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return new Error('You appear to be offline. Check your connection and retry.');
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return error;
  }
  return new Error('Forecast could not be refreshed. Please try again.');
}

export function subscribeForecastRequest(
  spot: string,
  selectedDate: string
): {
  promise: Promise<ForecastContextResponse>;
  release: () => void;
} {
  const { key } = forecastRequestIdentity(spot);
  const consumer = Symbol(key);
  let pending = pendingRequests.get(key);
  if (!pending) {
    const controller = new AbortController();
    const params = new URLSearchParams({ spot, date: selectedDate });
    const promise = fetch(`/api/forecast?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Forecast request failed (${response.status})`);
        const data: unknown = await response.json();
        if (!forecastMemoryCache.write(key, data)) {
          throw new Error('Forecast response was invalid');
        }
        return data as ForecastContextResponse;
      })
      .catch((error: unknown) => {
        throw friendlyForecastError(error);
      })
      .finally(() => {
        if (pendingRequests.get(key)?.promise === promise) {
          pendingRequests.delete(key);
        }
      });
    pending = { controller, promise, consumers: new Set() };
    pendingRequests.set(key, pending);
  }
  pending.consumers.add(consumer);
  let released = false;
  return {
    promise: pending.promise.then((data) =>
      selectForecastDate(data, selectedDate)
    ),
    release: () => {
      if (released) return;
      released = true;
      const current = pendingRequests.get(key);
      if (!current) return;
      current.consumers.delete(consumer);
      if (current.consumers.size === 0) {
        current.controller.abort();
        pendingRequests.delete(key);
      }
    },
  };
}

/** Starts only the explicitly selected spot; it never primes all six spots. */
export function primeBrowserForecast(
  spot: string,
  selectedDate: string
): void {
  const { key } = forecastRequestIdentity(spot);
  const cached = readBrowserForecast(spot, selectedDate);
  if (cached?.freshness === 'fresh') return;
  if (navigationPrime?.key === key) return;
  navigationPrime?.release();
  const request = subscribeForecastRequest(spot, selectedDate);
  navigationPrime = { key, release: request.release };
  void request.promise
    .catch(() => undefined)
    .finally(() => {
      if (navigationPrime?.key === key) {
        navigationPrime.release();
        navigationPrime = null;
      }
    });
}
