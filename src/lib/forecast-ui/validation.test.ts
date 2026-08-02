import { describe, expect, it } from 'vitest';
import {
  isForecastComparisonResponse,
  isForecastContextResponse,
} from '@/lib/forecast-ui/validation';

describe('forecast response validation', () => {
  it('rejects incomplete forecast and comparison payloads', () => {
    expect(isForecastContextResponse({ schemaVersion: 1 })).toBe(false);
    expect(
      isForecastComparisonResponse({ schemaVersion: 1, items: [] })
    ).toBe(false);
  });

  it('accepts the normalized top-level forecast contract', () => {
    expect(
      isForecastContextResponse({
        schemaVersion: 1,
        timeZone: 'Africa/Casablanca',
        spot: { id: '1', slug: 'tifnit' },
        range: { startDate: '2026-08-02', endDate: '2026-08-08' },
        days: [],
        periods: { '30m': [], '1h': [], '3h': [], '6h': [] },
      })
    ).toBe(true);
  });
});

