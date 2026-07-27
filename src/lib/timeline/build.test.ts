import { describe, expect, it } from 'vitest';
import { buildTimeline, windowMarks } from '@/lib/timeline/build';
import type { ForecastAnchors } from '@/lib/timeline/types';
import type { ForecastEvaluationSpot } from '@/lib/forecast/evaluate';
import { evaluateForecast } from '@/lib/forecast/evaluate';
import { productDayRange } from '@/lib/time/casablanca';
import { calculateAstronomy } from '@/lib/daylight/solar';
import { deriveModelledTideConditions } from '@/lib/tides/derive';
import { degreesToCompass, type MarineConditions } from '@/types/marine';

const DATE = '2026-06-14';
const RANGE = productDayRange(DATE);
const NOW = new Date('2026-06-14T06:00:00.000Z');
const SPOT: ForecastEvaluationSpot = {
  id: 'spot-1',
  slug: 'sidi-rbat',
  latitude: 30.0561,
  longitude: -9.6531,
  spotType: 'beach',
  difficultyLevel: 'beginner',
  difficultyFactors: { access: 'easy', terrain: 'sand', hazards: 'low' },
};

function hourlyTimes(): string[] {
  const count = Math.round((RANGE.endMs - RANGE.startMs) / 3_600_000) + 1;
  return Array.from({ length: count }, (_, index) =>
    new Date(RANGE.startMs + index * 3_600_000).toISOString()
  );
}

function flatAnchors(): ForecastAnchors {
  const time = hourlyTimes();
  const count = time.length;
  const fetchedAt = NOW.toISOString();
  return {
    wind: {
      time,
      speedKmh: Array(count).fill(8),
      gustKmh: Array(count).fill(11),
      directionDeg: Array(count).fill(270),
      fetchedAt,
    },
    waves: {
      time,
      heightM: Array(count).fill(0.4),
      periodS: Array(count).fill(7),
      directionDeg: Array(count).fill(275),
      swellHeightM: Array(count).fill(0.5),
      swellPeriodS: Array(count).fill(9),
      swellDirectionDeg: Array(count).fill(280),
      secondarySwellHeightM: Array(count).fill(0.1),
      secondarySwellPeriodS: Array(count).fill(6),
      secondarySwellDirectionDeg: Array(count).fill(180),
      seaSurfaceTemperatureC: Array(count).fill(20),
      oceanCurrentVelocityKmh: Array(count).fill(0.4),
      oceanCurrentDirectionDeg: Array(count).fill(180),
      fetchedAt,
    },
    weather: {
      time,
      precipitationMm: Array(count).fill(0),
      cloudCoverPct: Array(count).fill(60),
      pressureMb: Array(count).fill(1018),
      temperatureC: Array(count).fill(22),
      visibilityM: Array(count).fill(20_000),
      weatherCode: Array(count).fill(1),
      fetchedAt,
    },
    tide: {
      source: 'open-meteo-hourly',
      intervalMinutes: 60,
      points: time.map((timestamp, index) => ({
        time: timestamp,
        heightM: 1 + Math.sin((index / 12) * Math.PI * 2),
      })),
      fetchedAt,
    },
  };
}

function emptyAnchors(): ForecastAnchors {
  return {
    wind: {
      time: [],
      speedKmh: [],
      gustKmh: [],
      directionDeg: [],
      fetchedAt: null,
    },
    waves: {
      time: [],
      heightM: [],
      periodS: [],
      directionDeg: [],
      swellHeightM: [],
      swellPeriodS: [],
      swellDirectionDeg: [],
      secondarySwellHeightM: [],
      secondarySwellPeriodS: [],
      secondarySwellDirectionDeg: [],
      seaSurfaceTemperatureC: [],
      oceanCurrentVelocityKmh: [],
      oceanCurrentDirectionDeg: [],
      fetchedAt: null,
    },
    weather: {
      time: [],
      precipitationMm: [],
      cloudCoverPct: [],
      pressureMb: [],
      temperatureC: [],
      visibilityM: [],
      weatherCode: [],
      fetchedAt: null,
    },
    tide: {
      source: 'open-meteo-hourly',
      intervalMinutes: 60,
      points: [],
      fetchedAt: null,
    },
  };
}

describe('windowMarks', () => {
  it('uses the exact start-inclusive/end-exclusive day range', () => {
    const marks = windowMarks(RANGE.startMs, RANGE.endMs);
    expect(marks).toHaveLength(288);
    expect(new Date(marks[0]!).toISOString()).toBe(RANGE.startIso);
    expect(marks[marks.length - 1]!).toBe(RANGE.endMs - 5 * 60_000);
  });

  it('adapts point count on Casablanca offset-transition days', () => {
    const longDay = productDayRange('2026-02-15');
    const shortDay = productDayRange('2026-03-22');
    expect(windowMarks(longDay.startMs, longDay.endMs)).toHaveLength(300);
    expect(windowMarks(shortDay.startMs, shortDay.endMs)).toHaveLength(276);
  });
});

describe('buildTimeline', () => {
  it('builds only the requested Casablanca calendar day', () => {
    const timeline = buildTimeline(
      SPOT,
      DATE,
      RANGE.startMs,
      RANGE.endMs,
      flatAnchors(),
      NOW
    );
    expect(timeline.schemaVersion).toBe(2);
    expect(timeline.date).toBe(DATE);
    expect(timeline.range.start).toBe(RANGE.startIso);
    expect(timeline.range.endExclusive).toBe(RANGE.endIso);
    expect(timeline.points).toHaveLength(288);
    expect(timeline.points[0]!.time).toBe(RANGE.startIso);
  });

  it('is deterministic for identical inputs', () => {
    const anchors = flatAnchors();
    const first = buildTimeline(
      SPOT,
      DATE,
      RANGE.startMs,
      RANGE.endMs,
      anchors,
      NOW
    );
    const second = buildTimeline(
      SPOT,
      DATE,
      RANGE.startMs,
      RANGE.endMs,
      anchors,
      NOW
    );
    expect(first).toEqual(second);
  });

  it('distinguishes provider anchors from interpolated estimates', () => {
    const timeline = buildTimeline(
      SPOT,
      DATE,
      RANGE.startMs,
      RANGE.endMs,
      flatAnchors(),
      NOW
    );
    const anchor = timeline.points[0]!;
    const interpolated = timeline.points[6]!;
    expect(
      anchor.integrity.inputs.find((input) => input.key === 'waveHeight')
        ?.availability
    ).toBe('available');
    expect(
      interpolated.integrity.inputs.find(
        (input) => input.key === 'waveHeight'
      )?.availability
    ).toBe('interpolated');
  });

  it('does not extrapolate a single provider anchor across the day', () => {
    const anchors = emptyAnchors();
    const time = [RANGE.startIso];
    anchors.wind = {
      time,
      speedKmh: [10],
      gustKmh: [12],
      directionDeg: [180],
      fetchedAt: NOW.toISOString(),
    };
    const timeline = buildTimeline(
      SPOT,
      DATE,
      RANGE.startMs,
      RANGE.endMs,
      anchors,
      NOW
    );
    expect(timeline.points[0]!.windSpeedKmh).toBe(10);
    expect(timeline.points[1]!.windSpeedKmh).toBeNull();
  });

  it('uses smooth tide interpolation between native hourly points', () => {
    const timeline = buildTimeline(
      SPOT,
      DATE,
      RANGE.startMs,
      RANGE.endMs,
      flatAnchors(),
      NOW
    );
    const halfHour = timeline.points[6]!;
    expect(halfHour.tideHeightM).not.toBeNull();
    expect(halfHour.tideHeightM!).toBeGreaterThan(1);
    expect(halfHour.tideHeightM!).toBeLessThan(1.5);
  });

  it('returns Unknown safety and no window when primary inputs are missing', () => {
    const timeline = buildTimeline(
      SPOT,
      DATE,
      RANGE.startMs,
      RANGE.endMs,
      emptyAnchors(),
      NOW
    );
    expect(
      timeline.points.every((point) => point.safety.status === 'Unknown')
    ).toBe(true);
    expect(timeline.windows).toEqual([]);
    expect(timeline.recommendedWindow).toBeNull();
    expect(timeline.noRecommendedWindowReason).toContain(
      'No recommended window'
    );
  });

  it('matches current evaluation for the same timestamp and inputs', () => {
    const anchors = flatAnchors();
    const timeline = buildTimeline(
      SPOT,
      DATE,
      RANGE.startMs,
      RANGE.endMs,
      anchors,
      NOW
    );
    const point = timeline.points[0]!;
    const tide = deriveModelledTideConditions(
      anchors.tide.points,
      new Date(point.time)
    );
    if (!tide) throw new Error('fixture');
    tide.heightM = point.tideHeightM;
    const marine: MarineConditions = {
      spotId: SPOT.id,
      generatedAt: point.time,
      weather: {
        status: 'ok',
        cachedAt: NOW.toISOString(),
        data: {
          observedAt: point.time,
          temperatureC: point.temperatureC,
          apparentTemperatureC: null,
          humidityPct: null,
          cloudCoverPct: 60,
          precipitationMm: point.precipitationMm,
          pressureMb: point.pressureMb,
          pressureTrendMbPerHr: null,
          weatherCode: point.weatherCode,
          visibilityM: point.visibilityM,
        },
      },
      wind: {
        status: 'ok',
        cachedAt: NOW.toISOString(),
        data: {
          observedAt: point.time,
          speedKmh: point.windSpeedKmh,
          gustKmh: point.windGustKmh,
          directionDeg: point.windDirectionDeg,
          directionCompass: degreesToCompass(point.windDirectionDeg),
        },
      },
      waves: {
        status: 'ok',
        cachedAt: NOW.toISOString(),
        data: {
          observedAt: point.time,
          waveHeightM: point.waveHeightM,
          wavePeriodS: point.wavePeriodS,
          waveDirectionDeg: point.waveDirectionDeg,
          swellHeightM: point.swellHeightM,
          swellPeriodS: point.swellPeriodS,
          swellDirectionDeg: point.swellDirectionDeg,
          secondarySwellHeightM: point.secondarySwellHeightM,
          secondarySwellPeriodS: point.secondarySwellPeriodS,
          secondarySwellDirectionDeg: point.secondarySwellDirectionDeg,
          seaSurfaceTemperatureC: point.seaSurfaceTemperatureC,
          oceanCurrentVelocityKmh: point.oceanCurrentVelocityKmh,
          oceanCurrentDirectionDeg: point.oceanCurrentDirectionDeg,
          derived: point.waveMetrics,
        },
      },
      tide: {
        status: 'ok',
        cachedAt: NOW.toISOString(),
        data: tide,
      },
      astronomy: {
        status: 'ok',
        cachedAt: point.time,
        data: calculateAstronomy(
          SPOT.latitude,
          SPOT.longitude,
          new Date(point.time)
        ),
      },
    };
    const current = evaluateForecast(marine, SPOT);
    expect(point.score).toBe(current.fishing.overallScore);
    expect(point.grade).toBe(current.fishing.grade);
    expect(point.safety.status).toBe(current.safety.status);
    expect(point.interpretation).toEqual(current.interpretation);
  });
});
