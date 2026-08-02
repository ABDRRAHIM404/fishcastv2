import { describe, expect, it } from 'vitest';
import {
  dateInForecastRange,
  isForecastInterval,
  isForecastScope,
  isForecastView,
  periodsForScope,
  validClockTime,
} from '@/lib/forecast-ui/query';

describe('forecast query validation', () => {
  it('accepts only supported URL state values', () => {
    expect(isForecastInterval('30m')).toBe(true);
    expect(isForecastInterval('2h')).toBe(false);
    expect(isForecastView('timeline')).toBe(true);
    expect(isForecastView('cards')).toBe(false);
    expect(isForecastScope('seven-days')).toBe(true);
    expect(isForecastScope('month')).toBe(false);
  });

  it('validates the current seven-day range and clock inputs', () => {
    expect(dateInForecastRange('2026-08-08', '2026-08-02')).toBe(true);
    expect(dateInForecastRange('2026-08-09', '2026-08-02')).toBe(false);
    expect(dateInForecastRange('not-a-date', '2026-08-02')).toBe(false);
    expect(validClockTime('23:59')).toBe(true);
    expect(validClockTime('24:00')).toBe(false);
  });

  it('switches deterministically between selected-day and seven-day scope', () => {
    const periods = [
      { date: '2026-08-02', value: 1 },
      { date: '2026-08-03', value: 2 },
    ];
    expect(periodsForScope(periods, '2026-08-03', 'day')).toEqual([
      periods[1],
    ]);
    expect(periodsForScope(periods, '2026-08-03', 'seven-days')).toEqual(
      periods
    );
  });
});

