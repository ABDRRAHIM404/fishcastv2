import { describe, expect, it } from 'vitest';
import {
  FORECAST_BROWSER_FRESH_MS,
  FORECAST_BROWSER_RETAIN_MS,
  ForecastMemoryCache,
  forecastBrowserCacheKey,
  forecastCacheFreshness,
  forecastRefreshLabel,
  providerAvailability,
} from '@/lib/forecast-ui/browser-cache';
import type { ForecastContextResponse } from '@/lib/forecast-ui/types';

function response(
  slug: string,
  timestamps: { forecast: string | null; marine: string | null } = {
    forecast: '2026-08-03T08:00:00.000Z',
    marine: '2026-08-03T08:00:00.000Z',
  }
): ForecastContextResponse {
  return {
    schemaVersion: 1,
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

