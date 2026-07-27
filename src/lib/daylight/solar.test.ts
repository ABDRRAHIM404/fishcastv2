import { describe, expect, it } from 'vitest';
import {
  calculateAstronomy,
  daylightStateAt,
} from '@/lib/daylight/solar';

const TIMES = {
  civilDawn: '2026-06-14T04:30:00.000Z',
  sunrise: '2026-06-14T05:00:00.000Z',
  sunset: '2026-06-14T19:00:00.000Z',
  civilDusk: '2026-06-14T19:30:00.000Z',
};

describe('daylightStateAt', () => {
  it('classifies exact dawn, sunrise, sunset, and dusk boundaries', () => {
    expect(daylightStateAt('2026-06-14T04:29:59.000Z', TIMES)).toBe('night');
    expect(daylightStateAt(TIMES.civilDawn, TIMES)).toBe('civil-twilight');
    expect(daylightStateAt(TIMES.sunrise, TIMES)).toBe('daylight');
    expect(daylightStateAt(TIMES.sunset, TIMES)).toBe('civil-twilight');
    expect(daylightStateAt(TIMES.civilDusk, TIMES)).toBe('night');
  });

  it('returns unknown when an event is missing', () => {
    expect(
      daylightStateAt('2026-06-14T12:00:00.000Z', {
        ...TIMES,
        civilDawn: null,
      })
    ).toBe('unknown');
  });
});

describe('calculateAstronomy', () => {
  it('is deterministic and orders calculated solar events', () => {
    const instant = new Date('2026-06-14T12:00:00.000Z');
    const first = calculateAstronomy(30.0561, -9.6531, instant);
    const second = calculateAstronomy(30.0561, -9.6531, instant);
    expect(first).toEqual(second);
    expect(first.source).toBe('calculated-noaa');
    expect(first.daylightState).toBe('daylight');
    expect([
      first.civilDawn,
      first.sunrise,
      first.sunset,
      first.civilDusk,
    ].map((value) => Date.parse(value!))).toEqual(
      [...[
        first.civilDawn,
        first.sunrise,
        first.sunset,
        first.civilDusk,
      ].map((value) => Date.parse(value!))].sort((a, b) => a - b)
    );
  });
});
