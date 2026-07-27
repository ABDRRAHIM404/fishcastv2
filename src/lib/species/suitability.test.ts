import { describe, it, expect } from 'vitest';
import { evaluateSuitability } from '@/lib/species/suitability';
import type { PreferredConditions } from '@/types/species';
import type { MarineConditions } from '@/types/marine';
import { deriveWaveMetrics } from '@/lib/waves/derived';

const ISO = '2026-06-14T06:30:00.000Z';
const DAWN = new Date('2026-06-14T06:30:00.000Z');
const MIDDAY = new Date('2026-06-14T13:00:00.000Z');

function marine(overrides?: {
  windKmh?: number | null;
  waveM?: number | null;
  trend?: 'rising' | 'falling' | 'slack' | null;
  nextExtreme?: 'high' | 'low' | null;
  windOk?: boolean;
  wavesOk?: boolean;
  tideOk?: boolean;
}): MarineConditions {
  const o = overrides ?? {};
  return {
    spotId: 'spot-1',
    generatedAt: ISO,
    weather: { status: 'error', message: 'n/a' },
    wind:
      o.windOk === false
        ? { status: 'error', message: 'n/a' }
        : {
            status: 'ok',
            cachedAt: ISO,
            data: {
              observedAt: ISO,
              speedKmh: o.windKmh ?? 10,
              gustKmh: null,
              directionDeg: 270,
              directionCompass: 'W',
            },
          },
    waves:
      o.wavesOk === false
        ? { status: 'error', message: 'n/a' }
        : {
            status: 'ok',
            cachedAt: ISO,
            data: {
              observedAt: ISO,
              waveHeightM: o.waveM ?? 0.5,
              wavePeriodS: null,
              waveDirectionDeg: null,
              swellHeightM: null,
              swellPeriodS: null,
              swellDirectionDeg: null,
              secondarySwellHeightM: null,
              secondarySwellPeriodS: null,
              secondarySwellDirectionDeg: null,
              seaSurfaceTemperatureC: null,
              oceanCurrentVelocityKmh: null,
              oceanCurrentDirectionDeg: null,
              derived: deriveWaveMetrics({
                waveHeightM: o.waveM ?? 0.5,
                wavePeriodS: null,
                swellHeightM: null,
                swellDirectionDeg: null,
                secondarySwellHeightM: null,
                secondarySwellDirectionDeg: null,
              }),
            },
          },
    tide:
      o.tideOk === false
        ? { status: 'error', message: 'n/a' }
        : {
            status: 'ok',
            cachedAt: ISO,
            data: {
              observedAt: ISO,
              source: 'open-meteo-modelled',
              datum: 'mean-sea-level',
              sourceIntervalMinutes: 60,
              heightM: 1.2,
              trend: o.trend ?? 'rising',
              extremes: o.nextExtreme
                ? [{ time: ISO, state: o.nextExtreme, heightM: 1.8 }]
                : [],
              minutesToNextExtreme: o.nextExtreme ? 0 : null,
              dailyRangeM: 1.2,
              rateMPerHour: 0.2,
              minutesSincePreviousExtreme: 120,
            },
          },
    astronomy: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        source: 'calculated-noaa',
        sunrise: '2026-06-14T07:00:00.000Z',
        sunset: '2026-06-14T19:00:00.000Z',
        civilDawn: '2026-06-14T06:00:00.000Z',
        civilDusk: '2026-06-14T20:00:00.000Z',
        daylightState: 'civil-twilight',
        isDaylight: false,
        moonPhase: null,
        moonIlluminationPct: null,
        moonTransitScore: null,
        timeOfDayScore: null,
      },
    },
  };
}

describe('evaluateSuitability', () => {
  it('returns not favored for null preferred_conditions', () => {
    expect(evaluateSuitability(null, marine(), DAWN)).toEqual({
      favored: false,
      reason: null,
    });
  });

  it('returns not favored for empty preferred_conditions', () => {
    expect(evaluateSuitability({}, marine(), DAWN)).toEqual({
      favored: false,
      reason: null,
    });
  });

  it('favors when all specified constraints are met', () => {
    const pc: PreferredConditions = {
      tide_state: 'rising',
      wind_max_kmh: 20,
      wave_max_m: 1,
      time_of_day: ['dawn', 'dusk'],
    };
    const res = evaluateSuitability(
      pc,
      marine({ windKmh: 10, waveM: 0.5, trend: 'rising' }),
      DAWN
    );
    expect(res.favored).toBe(true);
    expect(res.reason).toContain('modelled rising tide');
  });

  it('not favored when one constraint fails (wind too high)', () => {
    const pc: PreferredConditions = { wind_max_kmh: 15 };
    const res = evaluateSuitability(pc, marine({ windKmh: 40 }), DAWN);
    expect(res.favored).toBe(false);
    expect(res.reason).toBeNull();
  });

  it('not favored when time_of_day does not match', () => {
    const pc: PreferredConditions = { time_of_day: ['dawn'] };
    expect(evaluateSuitability(pc, marine(), MIDDAY).favored).toBe(false);
    expect(evaluateSuitability(pc, marine(), DAWN).favored).toBe(true);
  });

  it('treats missing live data as constraint NOT met', () => {
    const pc: PreferredConditions = { wind_max_kmh: 20 };
    expect(
      evaluateSuitability(pc, marine({ windOk: false }), DAWN).favored
    ).toBe(false);
  });

  it('matches high/low via the next upcoming extreme', () => {
    const pc: PreferredConditions = { tide_state: 'high' };
    expect(
      evaluateSuitability(pc, marine({ nextExtreme: 'high' }), DAWN).favored
    ).toBe(true);
    expect(
      evaluateSuitability(pc, marine({ nextExtreme: 'low' }), DAWN).favored
    ).toBe(false);
  });

  it('is deterministic for identical inputs', () => {
    const pc: PreferredConditions = { wind_max_kmh: 20, wave_max_m: 1 };
    const m = marine();
    expect(evaluateSuitability(pc, m, DAWN)).toEqual(
      evaluateSuitability(pc, m, DAWN)
    );
  });
});
