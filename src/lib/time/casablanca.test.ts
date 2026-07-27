import { describe, expect, it } from 'vitest';
import {
  addProductDays,
  isProductDate,
  productDateKey,
  productDateTimeToEpochMs,
  productDayRange,
} from '@/lib/time/casablanca';

describe('Africa/Casablanca product dates', () => {
  it('validates real calendar dates and adds days without server timezone use', () => {
    expect(isProductDate('2026-02-29')).toBe(false);
    expect(isProductDate('2026-02-28')).toBe(true);
    expect(addProductDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('maps absolute instants across a local midnight boundary', () => {
    expect(productDateKey('2026-07-26T22:59:59.000Z')).toBe('2026-07-26');
    expect(productDateKey('2026-07-26T23:00:00.000Z')).toBe('2026-07-27');
    expect(productDateTimeToEpochMs('2026-07-27')).toBe(
      Date.parse('2026-07-26T23:00:00.000Z')
    );
  });

  it('returns exact start-inclusive/end-exclusive day ranges', () => {
    const range = productDayRange('2026-07-27');
    expect(range.startIso).toBe('2026-07-26T23:00:00.000Z');
    expect(range.endIso).toBe('2026-07-27T23:00:00.000Z');
    expect(range.durationMinutes).toBe(1440);
    expect(productDateKey(range.startMs)).toBe('2026-07-27');
    expect(productDateKey(range.endMs - 1)).toBe('2026-07-27');
    expect(productDateKey(range.endMs)).toBe('2026-07-28');
  });

  it('honours Morocco offset transitions instead of forcing 24 hours', () => {
    expect(productDayRange('2026-02-15').durationMinutes).toBe(1500);
    expect(productDayRange('2026-03-22').durationMinutes).toBe(1380);
  });
});
