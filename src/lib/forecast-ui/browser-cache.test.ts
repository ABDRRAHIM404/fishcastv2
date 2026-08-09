import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FORECAST_BROWSER_FRESH_MS,
  FORECAST_BROWSER_RETAIN_MS,
  ForecastMemoryCache,
  forecastBrowserCacheKey,
  forecastCacheFreshness,
  forecastRefreshLabel,
  providerAvailability,
  readBrowserForecast,
  shouldRequestForecast,
  subscribeForecastRequest,
} from '@/lib/forecast-ui/browser-cache';
import type {
  ForecastContextResponse,
  ForecastDailySummary,
} from '@/lib/forecast-ui/types';

function response(
  slug: string,
  timestamps: { forecast: string | null; marine: string | null } = {
    forecast: '2026-08-03T08:00:00.000Z',
    marine: '2026-08-03T08:00:00.000Z',
  }
): ForecastContextResponse {
  return {
    schemaVersion: 1,
    coverage: 'week',
    timeZone: 'Africa/Casablanca',
    spot: { id: slug, slug, name: slug, displayName: slug },
    range: { startDate: '2026-08-03', endDate: '2026-08-09' },
    selectedDate: '2026-08-03',
    generatedAt: '2026-08-03T08:00:00.000Z',
    sourceTimestamps: {
      forecastFetchedAt: timestamps.forecast,
      marineFetchedAt: timestamps.marine,
    },
    freshnessMinutes: 18,
    days: [],
    periods: { '30m': [], '1h': [], '3h': [], '6h': [] },
    interpretation: {
      bestPeriod: '',
      qualityReason: '',
      safetyConcern: '',
      technique: '',
      missingData: '',
      confidenceLimitation: '',
      orientationLimitation: '',
    },
    interpretations: {},
    orientationVerified: false,
  };
}

function progressiveResponses(slug: string): {
  today: ForecastContextResponse & { coverage: 'today' };
  week: ForecastContextResponse & { coverage: 'week' };
} {
  const interpretation = (bestPeriod: string) => ({
    bestPeriod,
    qualityReason: '',
    safetyConcern: '',
    technique: '',
    missingData: '',
    confidenceLimitation: '',
    orientationLimitation: '',
  });
  const week = {
    ...response(slug),
    coverage: 'week' as const,
    days: [
      { date: '2026-08-03' },
      { date: '2026-08-04' },
    ] as ForecastDailySummary[],
    interpretations: {
      '2026-08-03': interpretation('today'),
      '2026-08-04': interpretation('tomorrow'),
    },
    interpretation: interpretation('today'),
  };
  return {
    today: {
      ...week,
      coverage: 'today',
      days: week.days.slice(0, 1),
    },
    week,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browser forecast cache', () => {
  it('constructs a stable versioned identity by spot and range', () => {
    expect(forecastBrowserCacheKey('sidi rbat', '2026-08-03')).toBe(
      'forecast-context:v1:sidi%20rbat:2026-08-03'
    );
  });

  it('classifies fresh, stale and expired entries deterministically', () => {
    expect(forecastCacheFreshness(0, FORECAST_BROWSER_FRESH_MS)).toBe('fresh');
    expect(forecastCacheFreshness(0, FORECAST_BROWSER_FRESH_MS + 1)).toBe('stale');
    expect(forecastCacheFreshness(0, FORECAST_BROWSER_RETAIN_MS + 1)).toBe('expired');
  });

  it('retains recently used spots, bounds memory and rejects invalid entries', () => {
    const cache = new ForecastMemoryCache(2);
    expect(cache.write('a', response('a'), 1)).toBe(true);
    expect(cache.write('b', response('b'), 1)).toBe(true);
    expect(cache.read('a', 1)?.data.spot.slug).toBe('a');
    expect(cache.write('c', response('c'), 1)).toBe(true);
    expect(cache.read('b', 1)).toBeNull();
    expect(cache.write('c', { broken: true }, 1)).toBe(false);
    expect(cache.read('c', 1)).toBeNull();
  });

  it('caches a usable today response without downgrading a complete week', () => {
    const cache = new ForecastMemoryCache();
    const complete = response('complete');
    const today = { ...complete, coverage: 'today' as const };

    expect(cache.write('spot', complete, 10)).toBe(true);
    expect(cache.write('spot', today, 20)).toBe(true);
    expect(cache.read('spot', 20)).toEqual(
      expect.objectContaining({ data: complete, storedAt: 10 })
    );

    const partialOnly = new ForecastMemoryCache();
    expect(partialOnly.write('spot', today, 20)).toBe(true);
    expect(partialOnly.read('spot', 20)?.data.coverage).toBe('today');
  });

  it('always completes a partial cache but reuses a fresh complete week', () => {
    const complete = response('complete');
    const today = { ...complete, coverage: 'today' as const };
    expect(
      shouldRequestForecast({ data: today, storedAt: 1, freshness: 'fresh' })
    ).toBe(true);
    expect(
      shouldRequestForecast({
        data: complete,
        storedAt: 1,
        freshness: 'fresh',
      })
    ).toBe(false);
    expect(
      shouldRequestForecast({
        data: complete,
        storedAt: 1,
        freshness: 'stale',
      })
    ).toBe(true);
  });

  it('multicasts one progressive request and selects each consumer date', async () => {
    const slug = 'progressive-multicast';
    const { today, week } = progressiveResponses(slug);
    const encoder = new TextEncoder();
    const fetchMock = vi.fn(async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({ type: 'today', data: today, elapsedMs: 12 })}\n`
              )
            );
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({ type: 'week', data: week, elapsedMs: 38, cacheStatus: 'miss' })}\n`
              )
            );
            controller.close();
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    const firstUpdates: ForecastContextResponse[] = [];
    const secondUpdates: ForecastContextResponse[] = [];
    const first = subscribeForecastRequest(
      slug,
      '2026-08-03',
      (data) => firstUpdates.push(data)
    );
    const second = subscribeForecastRequest(
      slug,
      '2026-08-04',
      (data) => secondUpdates.push(data)
    );

    const [firstResult, secondResult] = await Promise.all([
      first.promise,
      second.promise,
    ]);
    first.release();
    second.release();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(firstUpdates.map((data) => data.coverage)).toEqual([
      'today',
      'week',
    ]);
    expect(secondUpdates.map((data) => data.coverage)).toEqual([
      'today',
      'week',
    ]);
    expect(firstResult.selectedDate).toBe('2026-08-03');
    expect(secondResult.selectedDate).toBe('2026-08-04');
    expect(secondResult.interpretation.bestPeriod).toBe('tomorrow');
    expect(secondUpdates.at(-1)?.selectedDate).toBe('2026-08-04');
  });

  it('keeps today cached when weekly streaming fails', async () => {
    const slug = 'progressive-week-failure';
    const { today } = progressiveResponses(slug);
    const body = [
      JSON.stringify({ type: 'today', data: today, elapsedMs: 10 }),
      JSON.stringify({
        type: 'error',
        stage: 'week',
        code: 'forecast_unavailable',
      }),
    ].join('\n');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { status: 200 }))
    );
    vi.stubGlobal('navigator', { onLine: true });
    const updates: ForecastContextResponse[] = [];
    const request = subscribeForecastRequest(slug, '2026-08-03', (data) =>
      updates.push(data)
    );

    await expect(request.promise).rejects.toThrow(
      'Forecast could not be refreshed'
    );
    request.release();
    expect(updates.map((data) => data.coverage)).toEqual(['today']);
    expect(readBrowserForecast(slug, '2026-08-03')?.data.coverage).toBe(
      'today'
    );
  });

  it('maps partial-provider states without hiding available data', () => {
    expect(providerAvailability(response('a')).status).toBe('complete');
    expect(
      providerAvailability(response('a', { forecast: null, marine: 'marine' }))
    ).toEqual(expect.objectContaining({ status: 'partial' }));
    expect(
      providerAvailability(response('a', { forecast: null, marine: null }))
    ).toEqual(expect.objectContaining({ status: 'unavailable' }));
  });

  it('produces clear stale-while-revalidate and retry labels', () => {
    expect(
      forecastRefreshLabel({
        refreshing: true,
        sourceAgeMinutes: 18,
        refreshFailed: false,
      })
    ).toBe('Cached 18 min ago · Refreshing');
    expect(
      forecastRefreshLabel({
        refreshing: false,
        sourceAgeMinutes: 18,
        refreshFailed: true,
      })
    ).toBe('Cached 18 min ago · Refresh failed');
  });
});
