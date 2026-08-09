import { describe, expect, it } from 'vitest';
import {
  isForecastComparisonResponse,
  isForecastContextResponse,
  isForecastStreamEvent,
} from '@/lib/forecast-ui/validation';

function context(coverage: 'today' | 'week') {
  return {
    schemaVersion: 1,
    coverage,
    timeZone: 'Africa/Casablanca',
    spot: { id: '1', slug: 'tifnit' },
    range: { startDate: '2026-08-02', endDate: '2026-08-08' },
    days: [],
    periods: { '30m': [], '1h': [], '3h': [], '6h': [] },
  };
}

describe('forecast response validation', () => {
  it('rejects incomplete forecast and comparison payloads', () => {
    expect(isForecastContextResponse({ schemaVersion: 1 })).toBe(false);
    expect(
      isForecastComparisonResponse({ schemaVersion: 1, items: [] })
    ).toBe(false);
  });

  it('accepts the normalized top-level forecast contract', () => {
    expect(
      isForecastContextResponse(context('week'))
    ).toBe(true);
  });

  it('requires matching typed progressive phases', () => {
    expect(
      isForecastStreamEvent({
        type: 'today',
        data: context('today'),
        elapsedMs: 12.5,
      })
    ).toBe(true);
    expect(
      isForecastStreamEvent({
        type: 'week',
        data: context('week'),
        elapsedMs: 20,
        cacheStatus: 'hit',
      })
    ).toBe(true);
    expect(
      isForecastStreamEvent({
        type: 'today',
        data: context('week'),
        elapsedMs: 12.5,
      })
    ).toBe(false);
    expect(
      isForecastStreamEvent({
        type: 'error',
        stage: 'week',
        code: 'forecast_unavailable',
      })
    ).toBe(true);
  });
});
