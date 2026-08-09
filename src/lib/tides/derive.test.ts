import { describe, expect, it } from 'vitest';
import {
  deriveModelledTideConditions,
  detectModelledTideExtremes,
  modelledDailyTidalRange,
  modelledTideHeightAt,
  modelledTideRateAt,
  modelledTideTrendAt,
  openMeteoTimeToIso,
  prepareModelledTideDeriver,
  toModelledSeaLevelPoints,
} from '@/lib/tides/derive';
import type { ModelledSeaLevelPoint } from '@/types/marine';

const START_MS = Date.parse('2026-06-14T00:00:00.000Z');

function hourly(heights: number[]): ModelledSeaLevelPoint[] {
  return heights.map((heightM, index) => ({
    time: new Date(START_MS + index * 60 * 60 * 1000).toISOString(),
    heightM,
  }));
}

function oneOffReference(
  points: ModelledSeaLevelPoint[],
  now: Date
) {
  if (points.length === 0) return null;
  const nowMs = now.getTime();
  const allExtremes = detectModelledTideExtremes(points);
  const upcomingExtremes = allExtremes.filter(
    (extreme) => new Date(extreme.time).getTime() >= nowMs
  );
  const previous =
    [...allExtremes]
      .reverse()
      .find((extreme) => new Date(extreme.time).getTime() < nowMs) ?? null;
  const next = upcomingExtremes[0] ?? null;
  return {
    observedAt: now.toISOString(),
    source: 'open-meteo-modelled',
    datum: 'mean-sea-level',
    sourceIntervalMinutes: 60,
    heightM: modelledTideHeightAt(points, nowMs),
    trend: modelledTideTrendAt(points, nowMs),
    extremes: upcomingExtremes,
    minutesToNextExtreme: next
      ? Math.max(
          0,
          Math.ceil((new Date(next.time).getTime() - nowMs) / 60_000)
        )
      : null,
    dailyRangeM: modelledDailyTidalRange(points, now),
    rateMPerHour: modelledTideRateAt(points, nowMs),
    minutesSincePreviousExtreme: previous
      ? Math.max(
          0,
          Math.floor(
            (nowMs - new Date(previous.time).getTime()) / 60_000
          )
        )
      : null,
  };
}

describe('modelled tide trend', () => {
  it('detects a rising tide', () => {
    const points = hourly([0, 1, 2]);
    expect(modelledTideTrendAt(points, START_MS + 60 * 60 * 1000)).toBe(
      'rising'
    );
  });

  it('detects a falling tide', () => {
    const points = hourly([2, 1, 0]);
    expect(modelledTideTrendAt(points, START_MS + 60 * 60 * 1000)).toBe(
      'falling'
    );
  });

  it('detects slack near a turning point', () => {
    const points = hourly([0, 1, 2, 1, 0]);
    expect(modelledTideTrendAt(points, START_MS + 2 * 60 * 60 * 1000)).toBe(
      'slack'
    );
  });
});

describe('modelled tide extremes', () => {
  const points = hourly([0, 1, 2, 1, 0, -1, 0]);

  it('detects local high tide events', () => {
    expect(detectModelledTideExtremes(points)).toContainEqual({
      time: '2026-06-14T02:00:00.000Z',
      state: 'high',
      heightM: 2,
    });
  });

  it('detects local low tide events', () => {
    expect(detectModelledTideExtremes(points)).toContainEqual({
      time: '2026-06-14T05:00:00.000Z',
      state: 'low',
      heightM: -1,
    });
  });

  it('treats a flat turning plateau as one event', () => {
    const plateau = hourly([0, 1, 2, 2, 1]);
    expect(detectModelledTideExtremes(plateau)).toEqual([
      {
        time: '2026-06-14T02:00:00.000Z',
        state: 'high',
        heightM: 2,
      },
    ]);
  });

  it('calculates time until the next extreme', () => {
    const result = deriveModelledTideConditions(
      points,
      new Date('2026-06-14T00:30:00.000Z')
    );
    expect(result?.extremes[0]?.state).toBe('high');
    expect(result?.minutesToNextExtreme).toBe(90);
  });

  it('calculates rate and time since the previous extreme', () => {
    const result = deriveModelledTideConditions(
      points,
      new Date('2026-06-14T03:00:00.000Z')
    );
    expect(
      modelledTideRateAt(points, START_MS + 60 * 60 * 1000)
    ).toBeCloseTo(1.125, 6);
    expect(result?.minutesSincePreviousExtreme).toBe(60);
  });

  it('calculates the daily range from native hourly points', () => {
    expect(
      modelledDailyTidalRange(
        points,
        new Date('2026-06-14T03:00:00.000Z')
      )
    ).toBe(3);
  });
});

describe('modelled tide source handling and interpolation', () => {
  it('interpolates tide height between hourly provider points', () => {
    const points = hourly([0, 1, 2]);
    const height = modelledTideHeightAt(points, START_MS + 30 * 60 * 1000);
    expect(height).not.toBeNull();
    expect(height!).toBeGreaterThan(0);
    expect(height!).toBeLessThan(1);
  });

  it('returns no conditions when sea-level data is missing', () => {
    expect(deriveModelledTideConditions([], new Date(START_MS))).toBeNull();
    expect(toModelledSeaLevelPoints(undefined, undefined)).toEqual([]);
  });

  it('skips incomplete and invalid provider values deterministically', () => {
    expect(
      toModelledSeaLevelPoints(
        [
          '2026-06-14T00:00',
          'invalid-time',
          '2026-06-14T02:00',
          '2026-06-14T03:00',
        ],
        [0.2, 0.4, null],
        3600
      )
    ).toEqual([
      {
        time: '2026-06-13T23:00:00.000Z',
        heightM: 0.2,
      },
    ]);
  });

  it('treats Unix provider timestamps as absolute instants', () => {
    expect(openMeteoTimeToIso(1_781_434_800, 3600)).toBe(
      '2026-06-14T11:00:00.000Z'
    );
  });

  it('keeps a single valid point but cannot infer trend or daily range', () => {
    const result = deriveModelledTideConditions(
      hourly([1.25]),
      new Date(START_MS)
    );
    expect(result?.heightM).toBe(1.25);
    expect(result?.trend).toBeNull();
    expect(result?.extremes).toEqual([]);
    expect(result?.minutesToNextExtreme).toBeNull();
    expect(result?.dailyRangeM).toBeNull();
  });
});

describe('prepared modelled tide derivation', () => {
  it('matches the previous one-off semantics at representative timestamps', () => {
    const points = hourly([
      0, 0.5, 1, 1.5, 2, 1.5, 1, 0.5, 0, -0.5, -1, -0.5, 0,
      0.5, 1, 1.5, 2, 1.5, 1, 0.5, 0, -0.5, -1, -0.5, 0, 0.5,
    ]);
    const prepared = prepareModelledTideDeriver(points);
    const timestamps = [
      START_MS,
      START_MS + 30 * 60_000,
      START_MS + 4 * 60 * 60_000,
      START_MS + 11.5 * 60 * 60_000,
      START_MS + 23.5 * 60 * 60_000,
      START_MS + 25 * 60 * 60_000,
    ];

    for (const timestamp of timestamps) {
      const now = new Date(timestamp);
      expect(prepared.derive(now)).toEqual(oneOffReference(points, now));
    }
  });

  it('preserves missing and incomplete source behavior', () => {
    expect(
      prepareModelledTideDeriver([]).derive(new Date(START_MS))
    ).toBeNull();
    const single = hourly([1.25]);
    expect(
      prepareModelledTideDeriver(single).derive(new Date(START_MS))
    ).toEqual(oneOffReference(single, new Date(START_MS)));
  });

  it('returns independent extreme objects across repeated derivations', () => {
    const points = hourly([0, 1, 2, 1, 0, -1, 0]);
    const prepared = prepareModelledTideDeriver(points);
    const first = prepared.derive(new Date(START_MS));
    if (!first?.extremes[0]) throw new Error('fixture');
    first.extremes[0].heightM = 999;

    expect(prepared.derive(new Date(START_MS))).toEqual(
      oneOffReference(points, new Date(START_MS))
    );
  });
});
