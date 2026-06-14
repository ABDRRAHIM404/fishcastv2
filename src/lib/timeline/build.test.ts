import { describe, it, expect } from 'vitest';
import { buildTimeline, dayMarks, STEPS_PER_DAY } from '@/lib/timeline/build';
import type { ForecastAnchors } from '@/lib/timeline/types';

const date = '2026-06-14';
const dayStart = new Date(`${date}T00:00:00.000Z`).getTime();
const NOW = new Date('2026-06-14T06:00:00.000Z');

function hourly(values: number, hours = 25): string[] {
  return Array.from({ length: hours }, (_, i) =>
    new Date(dayStart + i * 3600_000).toISOString()
  ).map((t) => t);
}

function flatAnchors(): ForecastAnchors {
  const time = hourly(0);
  const n = time.length;
  return {
    wind: {
      time,
      speedKmh: Array(n).fill(8),
      directionDeg: Array(n).fill(270),
    },
    waves: { time, heightM: Array(n).fill(0.4) },
    weather: {
      time,
      precipitationMm: Array(n).fill(0),
      cloudCoverPct: Array(n).fill(60),
    },
    tide: time.map((t, i) => ({
      time: t,
      heightM: 1 + Math.sin((i / 24) * Math.PI * 2),
    })),
  };
}

describe('dayMarks', () => {
  it('produces 288 five-minute marks', () => {
    expect(dayMarks(dayStart)).toHaveLength(STEPS_PER_DAY);
  });
});

describe('buildTimeline', () => {
  it('builds 288 points with scores and windows', () => {
    const tl = buildTimeline('spot-1', date, dayStart, flatAnchors(), NOW);
    expect(tl.points).toHaveLength(STEPS_PER_DAY);
    expect(tl.windows.length).toBeGreaterThan(0);
    expect(tl.date).toBe(date);
  });

  it('is deterministic for identical anchors', () => {
    const a = buildTimeline('spot-1', date, dayStart, flatAnchors(), NOW);
    const b = buildTimeline('spot-1', date, dayStart, flatAnchors(), NOW);
    expect(a).toEqual(b);
  });

  it('produces favorable scores for good flat conditions', () => {
    const tl = buildTimeline('spot-1', date, dayStart, flatAnchors(), NOW);
    const avg =
      tl.points.reduce((s, p) => s + p.score, 0) / tl.points.length;
    expect(avg).toBeGreaterThan(6);
  });

  it('handles missing data: scores 0 across the day', () => {
    const empty: ForecastAnchors = {
      wind: { time: [], speedKmh: [], directionDeg: [] },
      waves: { time: [], heightM: [] },
      weather: { time: [], precipitationMm: [], cloudCoverPct: [] },
      tide: [],
    };
    const tl = buildTimeline('spot-1', date, dayStart, empty, NOW);
    expect(tl.points.every((p) => p.score === 0)).toBe(true);
    expect(tl.windows).toHaveLength(1);
    expect(tl.windows[0]!.label).toBe('Poor');
  });

  it('interpolates a single anchor as a flat line', () => {
    const t = [new Date(dayStart).toISOString()];
    const single: ForecastAnchors = {
      wind: { time: t, speedKmh: [10], directionDeg: [180] },
      waves: { time: t, heightM: [0.5] },
      weather: { time: t, precipitationMm: [0], cloudCoverPct: [50] },
      tide: [{ time: t[0]!, heightM: 1.5 }],
    };
    const tl = buildTimeline('spot-1', date, dayStart, single, NOW);
    expect(tl.points.every((p) => p.windSpeedKmh === 10)).toBe(true);
    expect(tl.points.every((p) => p.waveHeightM === 0.5)).toBe(true);
  });
});
