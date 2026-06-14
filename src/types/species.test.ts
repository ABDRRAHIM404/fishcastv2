import { describe, it, expect } from 'vitest';
import {
  formatSeasonMonths,
  isInSeason,
  summarizePreferredConditions,
} from '@/types/species';

describe('formatSeasonMonths', () => {
  it('returns null for empty input', () => {
    expect(formatSeasonMonths([])).toBeNull();
  });
  it('returns "All year" for all 12 months', () => {
    expect(formatSeasonMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe(
      'All year'
    );
  });
  it('collapses contiguous runs and lists singletons', () => {
    expect(formatSeasonMonths([3, 4, 5, 9])).toBe('Mar-May, Sep');
  });
  it('dedupes and sorts unordered input', () => {
    expect(formatSeasonMonths([9, 3, 4, 4, 5])).toBe('Mar-May, Sep');
  });
  it('ignores out-of-range months', () => {
    expect(formatSeasonMonths([0, 13, 6])).toBe('Jun');
  });
});

describe('isInSeason', () => {
  it('is true when the month is present', () => {
    expect(isInSeason([5, 6, 7], 6)).toBe(true);
  });
  it('is false when the month is absent', () => {
    expect(isInSeason([5, 6, 7], 1)).toBe(false);
  });
  it('is false for empty season data', () => {
    expect(isInSeason([], 6)).toBe(false);
  });
});

describe('summarizePreferredConditions', () => {
  it('returns null for null/empty', () => {
    expect(summarizePreferredConditions(null)).toBeNull();
    expect(summarizePreferredConditions({})).toBeNull();
  });
  it('summarizes present fields only', () => {
    const s = summarizePreferredConditions({
      tide_state: 'rising',
      wind_max_kmh: 20,
      time_of_day: ['dawn', 'dusk'],
    });
    expect(s).toContain('rising tide');
    expect(s).toContain('20 km/h');
    expect(s).toContain('dawn/dusk');
  });
});
