import { describe, it, expect } from 'vitest';
import {
  toSamples,
  linearAt,
  circularAt,
  monotoneCubicAt,
  linearWithinAt,
  circularWithinAt,
  monotoneCubicWithinAt,
} from '@/lib/timeline/interpolate';

const t0 = '2026-06-14T00:00:00.000Z';
const t1 = '2026-06-14T01:00:00.000Z';
const t2 = '2026-06-14T02:00:00.000Z';
const ms = (s: string) => new Date(s).getTime();

describe('toSamples', () => {
  it('drops nulls/non-finite values and sorts by time', () => {
    const s = toSamples(
      [t2, t0, t1, '2026-06-14T03:00:00.000Z'],
      [2, null, 1, Number.POSITIVE_INFINITY]
    );
    expect(s.map((x) => x.value)).toEqual([1, 2]);
    expect(s[0]!.ms).toBeLessThan(s[1]!.ms);
  });
});

describe('linearAt', () => {
  it('interpolates the midpoint', () => {
    const s = toSamples([t0, t1], [0, 10]);
    expect(linearAt(s, ms('2026-06-14T00:30:00.000Z'))).toBeCloseTo(5, 6);
  });
  it('clamps outside the range to the nearest sample', () => {
    const s = toSamples([t0, t1], [4, 8]);
    expect(linearAt(s, ms('2026-06-13T00:00:00.000Z'))).toBe(4);
    expect(linearAt(s, ms('2026-06-15T00:00:00.000Z'))).toBe(8);
  });
  it('returns null with no samples', () => {
    expect(linearAt([], ms(t0))).toBeNull();
  });
});

describe('circularAt', () => {
  it('takes the shortest arc across the 0/360 boundary', () => {
    const s = toSamples([t0, t1], [350, 10]);
    // Midpoint should be ~0/360, not ~180.
    const v = circularAt(s, ms('2026-06-14T00:30:00.000Z'))!;
    const distToZero = Math.min(v, 360 - v);
    expect(distToZero).toBeLessThan(1);
  });
  it('normalizes into [0, 360)', () => {
    const s = toSamples([t0, t1], [10, 20]);
    const v = circularAt(s, ms('2026-06-14T00:30:00.000Z'))!;
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(360);
  });
});

describe('monotoneCubicAt', () => {
  it('passes through anchor points exactly', () => {
    const s = toSamples([t0, t1, t2], [0, 2, 1]);
    expect(monotoneCubicAt(s, ms(t0))).toBeCloseTo(0, 6);
    expect(monotoneCubicAt(s, ms(t1))).toBeCloseTo(2, 6);
    expect(monotoneCubicAt(s, ms(t2))).toBeCloseTo(1, 6);
  });
  it('does not overshoot beyond local anchor bounds', () => {
    const s = toSamples([t0, t1, t2], [0, 2, 1]);
    const mid = monotoneCubicAt(s, ms('2026-06-14T01:30:00.000Z'))!;
    expect(mid).toBeLessThanOrEqual(2);
    expect(mid).toBeGreaterThanOrEqual(1);
  });
  it('falls back to linear with two samples', () => {
    const s = toSamples([t0, t1], [0, 10]);
    expect(monotoneCubicAt(s, ms('2026-06-14T00:30:00.000Z'))).toBeCloseTo(5, 6);
  });
});

describe('bounded timeline interpolation', () => {
  it('does not extrapolate provider values outside their source range', () => {
    const samples = toSamples([t0, t1], [4, 8]);
    const before = ms('2026-06-13T23:00:00.000Z');
    const after = ms('2026-06-14T02:00:00.000Z');
    expect(linearWithinAt(samples, before)).toBeNull();
    expect(circularWithinAt(samples, after)).toBeNull();
    expect(monotoneCubicWithinAt(samples, after)).toBeNull();
  });

  it('keeps native anchors and interior interpolated values available', () => {
    const samples = toSamples([t0, t1], [350, 10]);
    expect(linearWithinAt(samples, ms(t0))).toBe(350);
    const direction = circularWithinAt(
      samples,
      ms('2026-06-14T00:30:00.000Z')
    )!;
    expect(Math.min(direction, 360 - direction)).toBeLessThan(1);
  });
});
