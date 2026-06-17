import { describe, it, expect } from 'vitest';
import {
  clamp01,
  decreasingScore,
  scoreWind,
  scoreWave,
  scoreTide,
  scoreWeather,
} from '@/lib/scoring/rules';
import { WIND_KMH } from '@/lib/scoring/constants';
import type {
  WindConditions,
  WaveConditions,
  WeatherConditions,
  TideConditions,
} from '@/types/marine';

const ISO = '2026-06-14T10:00:00.000Z';

function wind(partial: Partial<WindConditions>): WindConditions {
  return {
    observedAt: ISO,
    speedKmh: null,
    gustKmh: null,
    directionDeg: null,
    directionCompass: null,
    ...partial,
  };
}

describe('clamp01', () => {
  it('clamps to the [0, 1] range', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.5)).toBe(0.5);
  });
});

describe('decreasingScore', () => {
  it('returns 1 at/below ideal and 0 at/above poor', () => {
    expect(decreasingScore(WIND_KMH.ideal, WIND_KMH)).toBe(1);
    expect(decreasingScore(0, WIND_KMH)).toBe(1);
    expect(decreasingScore(WIND_KMH.poor, WIND_KMH)).toBe(0);
    expect(decreasingScore(999, WIND_KMH)).toBe(0);
  });

  it('is monotonically non-increasing', () => {
    let prev = decreasingScore(0, WIND_KMH);
    for (let v = 0; v <= 50; v += 2) {
      const s = decreasingScore(v, WIND_KMH);
      expect(s).toBeLessThanOrEqual(prev + 1e-9);
      prev = s;
    }
  });
});

describe('factor rules return null on missing data', () => {
  it('wind/wave/weather/tide handle nulls', () => {
    expect(scoreWind(wind({ speedKmh: null }))).toBeNull();
    const waves: WaveConditions = {
      observedAt: ISO,
      waveHeightM: null,
      wavePeriodS: null,
      waveDirectionDeg: null,
      swellHeightM: null,
      swellPeriodS: null,
      swellDirectionDeg: null,
    };
    expect(scoreWave(waves)).toBeNull();
    const weather: WeatherConditions = {
      observedAt: ISO,
      temperatureC: null,
      apparentTemperatureC: null,
      humidityPct: null,
      cloudCoverPct: null,
      precipitationMm: null,
      pressureMb: null,
      pressureTrendMbPerHr: null,
      weatherCode: null,
    };
    expect(scoreWeather(weather)).toBeNull();
    const tide: TideConditions = {
      observedAt: ISO,
      heightM: null,
      trend: null,
      extremes: [],
    };
    expect(scoreTide(tide)).toBeNull();
  });
});

describe('scoreWind', () => {
  it('rewards light wind and penalizes strong wind', () => {
    const light = scoreWind(wind({ speedKmh: 6, gustKmh: 8 }));
    const strong = scoreWind(wind({ speedKmh: 38, gustKmh: 45 }));
    expect(light).not.toBeNull();
    expect(strong).not.toBeNull();
    expect(light as number).toBeGreaterThan(strong as number);
  });

  it('applies a gust penalty when gusts greatly exceed sustained wind', () => {
    const calm = scoreWind(wind({ speedKmh: 10, gustKmh: 11 }));
    const gusty = scoreWind(wind({ speedKmh: 10, gustKmh: 30 }));
    expect((gusty as number)).toBeLessThan(calm as number);
  });
});

describe('scoreTide', () => {
  it('rewards a moving tide over slack', () => {
    const moving = scoreTide({
      observedAt: ISO,
      heightM: 1,
      trend: 'rising',
      extremes: [],
    });
    const slack = scoreTide({
      observedAt: ISO,
      heightM: 1,
      trend: null,
      extremes: [{ time: ISO, state: 'high', heightM: 2 }],
    });
    expect(moving).toBe(1);
    expect(slack).toBe(0.5);
  });
});
