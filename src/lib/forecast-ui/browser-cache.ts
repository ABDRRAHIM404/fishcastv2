import type {
  ForecastContextResponse,
  ForecastStreamEvent,
} from '@/lib/forecast-ui/types';
import {
  isForecastContextResponse,
  isForecastStreamEvent,
} from '@/lib/forecast-ui/validation';
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

export function shouldRequestForecast(
  cached: ForecastCacheSnapshot | null,
  forced = false
): boolean {
  return (
    forced ||
    !cached ||
    cached.freshness === 'stale' ||
    cached.data.coverage === 'today'
  );
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
    const current = this.entries.get(key);
    // A streamed today update must never replace a complete stale-while-
    // revalidate week that is already useful to the visitor.
    if (current?.data.coverage === 'week' && value.coverage === 'today') {
      return true;
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
  consumers: Map<symbol, ForecastUpdateListener | null>;
  state: { latest: ForecastContextResponse | null };
}

export type ForecastUpdateListener = (data: ForecastContextResponse) => void;

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

function streamEventData(event: ForecastStreamEvent): ForecastContextResponse {
  if (event.type === 'error') {
    throw new Error(
      event.stage === 'today'
        ? 'Today\'s forecast is unavailable.'
        : 'The seven-day forecast could not be completed.'
    );
  }
  return event.data;
}

function parseForecastLine(line: string): ForecastContextResponse {
  let value: unknown;
  try {
    value = JSON.parse(line) as unknown;
  } catch {
    throw new Error('Forecast stream contained invalid JSON.');
  }
  if (isForecastStreamEvent(value)) return streamEventData(value);
  // Compatibility for a complete buffered response from an older edge cache.
  if (isForecastContextResponse(value)) return value;
  throw new Error('Forecast stream contained an invalid event.');
}

async function consumeForecastStream(
  response: Response,
  onData: ForecastUpdateListener
): Promise<ForecastContextResponse> {
  if (!response.ok) {
    throw new Error(`Forecast request failed (${response.status})`);
  }

  let latest: ForecastContextResponse | null = null;
  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    latest = parseForecastLine(trimmed);
    onData(latest);
  };

  if (!response.body) {
    const text = await response.text();
    text.split(/\r?\n/).forEach(consumeLine);
  } else {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        lines.forEach(consumeLine);
      }
      buffer += decoder.decode();
      consumeLine(buffer);
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  const completed = latest as ForecastContextResponse | null;
  if (!completed || completed.coverage !== 'week') {
    throw new Error('The seven-day forecast could not be completed.');
  }
  return completed;
}

function beginForecastRequest(
  key: string,
  spot: string,
  selectedDate: string
): PendingForecastRequest {
  const controller = new AbortController();
  const consumers = new Map<symbol, ForecastUpdateListener | null>();
  const state: PendingForecastRequest['state'] = { latest: null };
  const params = new URLSearchParams({ spot, date: selectedDate });
  const performanceId = encodeURIComponent(key);
  const requestStartMark = `fishcast:forecast:request-start:${performanceId}`;
  let todayMeasured = false;
  let weekMeasured = false;

  try {
    if (typeof performance !== 'undefined') {
      performance.mark(requestStartMark);
    }
  } catch {
    // Performance marks are diagnostic only and never block the forecast.
  }

  const measureUsableStage = (coverage: ForecastContextResponse['coverage']) => {
    const measures: Array<{ name: string; measured: boolean }> =
      coverage === 'week' && !todayMeasured
        ? [
            { name: 'today-usable', measured: todayMeasured },
            { name: 'week-complete', measured: weekMeasured },
          ]
        : coverage === 'today'
          ? [{ name: 'today-usable', measured: todayMeasured }]
          : [{ name: 'week-complete', measured: weekMeasured }];
    for (const measure of measures) {
      if (measure.measured) continue;
      try {
        if (typeof performance !== 'undefined') {
          performance.measure(`fishcast:forecast:${measure.name}`, {
            start: requestStartMark,
            detail: { key, coverage },
          });
        }
      } catch {
        // Older browsers can still load forecasts without diagnostics.
      }
      if (measure.name === 'today-usable') todayMeasured = true;
      else weekMeasured = true;
    }
  };

  const publish = (data: ForecastContextResponse) => {
    const current = forecastMemoryCache.read(key);
    if (data.coverage === 'today' && current?.data.coverage === 'week') {
      return;
    }
    if (!forecastMemoryCache.write(key, data)) {
      throw new Error('Forecast response was invalid');
    }
    state.latest = data;
    measureUsableStage(data.coverage);
    for (const listener of consumers.values()) {
      listener?.(data);
    }
  };

  const promise = fetch(`/api/forecast?${params.toString()}`, {
    cache: 'no-store',
    signal: controller.signal,
  })
    .then((response) => consumeForecastStream(response, publish))
    .catch((error: unknown) => {
      throw friendlyForecastError(error);
    })
    .finally(() => {
      if (pendingRequests.get(key)?.promise === promise) {
        pendingRequests.delete(key);
      }
    });

  return { controller, promise, consumers, state };
}

export function subscribeForecastRequest(
  spot: string,
  selectedDate: string,
  onUpdate?: ForecastUpdateListener
): {
  promise: Promise<ForecastContextResponse>;
  release: () => void;
} {
  const { key } = forecastRequestIdentity(spot);
  const consumer = Symbol(key);
  let pending = pendingRequests.get(key);
  if (!pending) {
    pending = beginForecastRequest(key, spot, selectedDate);
    pendingRequests.set(key, pending);
  }
  const listener = onUpdate
    ? (data: ForecastContextResponse) =>
        onUpdate(selectForecastDate(data, selectedDate))
    : null;
  pending.consumers.set(consumer, listener);
  if (listener && pending.state.latest) {
    const latest = pending.state.latest;
    queueMicrotask(() => listener(latest));
  }
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
  if (
    cached?.freshness === 'fresh' &&
    cached.data.coverage === 'week'
  ) {
    return;
  }
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
