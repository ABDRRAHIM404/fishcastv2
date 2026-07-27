import { describe, expect, it } from 'vitest';
import {
  deriveModelledTideConditions,
  detectModelledTideExtremes,
  modelledDailyTidalRange,
  modelledTideHeightAt,
  modelledTideTrendAt,
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
