import { describe, expect, it } from 'vitest';
import {
  aggregateTimeline,
  circularMeanDeg,
  summarizeTimeline,
} from '@/lib/forecast-ui/aggregate';
import { buildTimeline } from '@/lib/timeline/build';
import { productDayRange } from '@/lib/time/casablanca';
import type { ForecastEvaluationSpot } from '@/lib/forecast/evaluate';
import type { ForecastAnchors, Timeline } from '@/lib/timeline/types';

const DATE = '2026-06-14';
const RANGE = productDayRange(DATE);
const NOW = new Date(RANGE.startMs + 6 * 60 * 60_000 + 12 * 60_000);
const SPOT: ForecastEvaluationSpot = {
  id: 'spot-forecast-ui',
  slug: 'sidi-rbat',
  latitude: 30.0561,
  longitude: -9.6531,
  spotType: 'beach',
  difficultyLevel: 'beginner',
  difficultyFactors: null,
};

function anchors(partialWaves = false): ForecastAnchors {
  const count = 25;
  const time = Array.from({ length: count }, (_, index) =>
    new Date(RANGE.startMs + index * 60 * 60_000).toISOString()
  );
  const values = (value: number | null) =>
    Array<number | null>(count).fill(value);
  const fetchedAt = NOW.toISOString();
  return {
    wind: {
      time,
      speedKmh: time.map((_, index) => index * 10),
      gustKmh: values(14),
      directionDeg: values(270),
      fetchedAt,
    },
    waves: {
      time,
      heightM: partialWaves ? values(null) : values(0.5),
      periodS: partialWaves ? values(null) : values(8),
      directionDeg: partialWaves ? values(null) : values(275),
      swellHeightM: partialWaves ? values(null) : values(0.6),
      swellPeriodS: partialWaves ? values(null) : values(10),
      swellDirectionDeg: partialWaves ? values(null) : values(280),
      secondarySwellHeightM: values(0.1),
      secondarySwellPeriodS: values(6),
      secondarySwellDirectionDeg: values(180),
      seaSurfaceTemperatureC: values(20),
      oceanCurrentVelocityKmh: values(0.4),
      oceanCurrentDirectionDeg: values(180),
      fetchedAt,
    },
    weather: {
      time,
      precipitationMm: values(0),
      cloudCoverPct: values(30),
      pressureMb: values(1018),
      temperatureC: values(22),
      visibilityM: values(20_000),
      weatherCode: values(1),
      fetchedAt,
    },
    tide: {
      source: 'open-meteo-hourly',
      intervalMinutes: 60,
      points: time.map((timestamp, index) => ({
        time: timestamp,
        heightM: Math.sin((index / 12) * Math.PI * 2),
      })),
      fetchedAt,
    },
  };
}

function timeline(partialWaves = false): Timeline {
  return buildTimeline(
    SPOT,
    DATE,
    RANGE.startMs,
    RANGE.endMs,
    anchors(partialWaves),
    NOW
  );
}

describe('forecast interval aggregation', () => {
  it('samples 30-minute and native-hour boundaries without changing source points', () => {
    const source = timeline();
    const halfHours = aggregateTimeline(source, '30m', NOW);
    const hours = aggregateTimeline(source, '1h', NOW);
    expect(source.points).toHaveLength(288);
    expect(halfHours).toHaveLength(48);
    expect(hours).toHaveLength(24);
    expect(halfHours[0]!.wind.speedKmh).toBe(0);
    expect(halfHours[1]!.wind.speedKmh).toBe(5);
    expect(hours[1]!.wind.speedKmh).toBe(10);
    expect(hours[0]!.dataQuality).toBe('provider');
    expect(halfHours[1]!.dataQuality).toBe('interpolated');
  });

  it('creates deterministic 3-hour and 6-hour display aggregates', () => {
    const source = timeline();
    const threeHours = aggregateTimeline(source, '3h', NOW);
    const sixHours = aggregateTimeline(source, '6h', NOW);
    expect(threeHours).toHaveLength(8);
    expect(sixHours).toHaveLength(4);
    expect(threeHours[0]!.dataQuality).toBe('aggregated');
    expect(sixHours[0]!.dataQualityLabel).toBe('Aggregated estimate');
    expect(threeHours[0]!.wind.speedKmh).toBeCloseTo(14.58, 1);
  });

  it('uses circular direction aggregation around north', () => {
    expect(circularMeanDeg([359, 1])).toBeCloseTo(0, 5);
    expect(circularMeanDeg([90, 270])).toBeNull();
  });

  it('does not hide a brief Dangerous point in a larger interval', () => {
    const source = timeline();
    source.points[7]!.safety = {
      ...source.points[7]!.safety,
      score: 15,
      status: 'Dangerous',
      warnings: [
        { code: 'fixture-danger', severity: 'critical', message: 'Brief danger' },
      ],
    };
    const period = aggregateTimeline(source, '3h', NOW)[0]!;
    expect(period.safety.status).toBe('Dangerous');
    expect(period.safety.containsDangerous).toBe(true);
    expect(period.safety.primaryWarning).toBe('Brief danger');
  });

  it('marks current time and recommended-window overlaps', () => {
    const periods = aggregateTimeline(timeline(), '30m', NOW);
    expect(periods.filter((period) => period.markers.currentTime)).toHaveLength(1);
    expect(periods.some((period) => period.recommended)).toBe(true);
  });

  it('preserves a usable partial forecast and exposes missing wave values', () => {
    const periods = aggregateTimeline(timeline(true), '1h', NOW);
    expect(periods).toHaveLength(24);
    expect(periods[0]!.waves.heightM).toBeNull();
    expect(periods[0]!.dataQuality).toBe('mixed');
    expect(periods[0]!.confidence.missingCriticalInputs).toContain('waveHeight');
  });
});

describe('daily forecast summary', () => {
  it('uses a recommended peak and conservative whole-day safety', () => {
    const source = timeline();
    source.points[200]!.safety = {
      ...source.points[200]!.safety,
      score: 20,
      status: 'Dangerous',
      warnings: [
        { code: 'late-danger', severity: 'critical', message: 'Late danger' },
      ],
    };
    const summary = summarizeTimeline(source);
    expect(summary.date).toBe(DATE);
    expect(summary.bestWindow).toEqual(source.recommendedWindow);
    expect(summary.safety.status).toBe('Dangerous');
    expect(summary.safety.warnings.map((warning) => warning.message)).toContain(
      'Late danger'
    );
    expect(summary.maxWaveHeightM).toBe(0.5);
  });
});
