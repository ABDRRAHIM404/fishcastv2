import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Timeline } from '@/lib/timeline/types';

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  buildTimeline: vi.fn(),
  fetchHourlyForecast: vi.fn(),
  fetchHourlyMarine: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: mocks.createServiceClient,
}));
vi.mock('@/lib/timeline/build', () => ({
  buildTimeline: mocks.buildTimeline,
}));
vi.mock('@/lib/marine/forecast', () => ({
  fetchHourlyForecast: mocks.fetchHourlyForecast,
  fetchHourlyMarine: mocks.fetchHourlyMarine,
}));

import { getTimelinesForSpotProgressively } from '@/lib/timeline/service';

const SPOT = {
  id: 'spot-1',
  slug: 'tifnit',
  latitude: 29.88,
  longitude: -9.74,
  spotType: 'rocks' as const,
  difficultyLevel: 'intermediate' as const,
  difficultyFactors: {
    access: 'moderate',
    terrain: 'rocks',
    hazards: 'moderate',
  },
};
const DATES = ['2026-08-09', '2026-08-10', '2026-08-11'];
const NOW = new Date('2026-08-09T12:00:00.000Z');

function timeline(date: string): Timeline {
  return {
    schemaVersion: 3,
    spotId: SPOT.id,
    date,
    range: {
      start: `${date}T00:00:00.000Z`,
      endExclusive: `${date}T23:59:59.999Z`,
      timeZone: 'Africa/Casablanca',
    },
    points: [],
    windows: [],
    dailyWindows: [],
    recommendedWindow: null,
    noRecommendedWindowReason: null,
    generatedAt: NOW.toISOString(),
    sourceTimestamps: {
      forecastFetchedAt: NOW.toISOString(),
      marineFetchedAt: NOW.toISOString(),
    },
    tideMetadata: {
      source: 'open-meteo-modelled',
      datum: 'mean-sea-level',
      providerIntervalMinutes: 60,
      timelineIntervalMinutes: 5,
      interpolation: 'monotone-cubic',
    },
  };
}

describe('getTimelinesForSpotProgressively', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No configured service client models an empty durable cache and makes
    // cache writes deterministic no-ops.
    mocks.createServiceClient.mockReturnValue(null);
    mocks.fetchHourlyForecast.mockResolvedValue({
      time: [],
      windSpeedKmh: [],
      windGustKmh: [],
      windDirectionDeg: [],
      weatherCode: [],
      precipitationMm: [],
      cloudCoverPct: [],
      pressureMb: [],
      temperatureC: [],
      visibilityM: [],
      fetchedAt: NOW.toISOString(),
    });
    mocks.fetchHourlyMarine.mockResolvedValue({
      time: [],
      waveHeightM: [],
      wavePeriodS: [],
      waveDirectionDeg: [],
      swellHeightM: [],
      swellPeriodS: [],
      swellDirectionDeg: [],
      secondarySwellHeightM: [],
      secondarySwellPeriodS: [],
      secondarySwellDirectionDeg: [],
      seaSurfaceTemperatureC: [],
      oceanCurrentVelocityKmh: [],
      oceanCurrentDirectionDeg: [],
      seaLevelPoints: [],
      fetchedAt: NOW.toISOString(),
    });
    mocks.buildTimeline.mockImplementation(
      (_spot: unknown, date: string) => timeline(date)
    );
  });

  it('publishes the first day before building the remainder and reuses one anchor load', async () => {
    const callbackDates: string[] = [];
    const result = await getTimelinesForSpotProgressively(
      SPOT,
      DATES,
      (first) => {
        callbackDates.push(first.date);
        expect(mocks.buildTimeline).toHaveBeenCalledTimes(1);
      },
      NOW
    );

    expect(callbackDates).toEqual([DATES[0]]);
    expect(result.map((item) => item.date)).toEqual(DATES);
    expect(mocks.fetchHourlyForecast).toHaveBeenCalledTimes(1);
    expect(mocks.fetchHourlyMarine).toHaveBeenCalledTimes(1);
    expect(mocks.buildTimeline).toHaveBeenCalledTimes(DATES.length);
    for (const call of mocks.buildTimeline.mock.calls) {
      expect(call[5]).toBe(NOW);
    }
  });

  it('does no work for an empty date range', async () => {
    const callback = vi.fn();
    await expect(
      getTimelinesForSpotProgressively(SPOT, [], callback, NOW)
    ).resolves.toEqual([]);
    expect(callback).not.toHaveBeenCalled();
    expect(mocks.fetchHourlyForecast).not.toHaveBeenCalled();
    expect(mocks.fetchHourlyMarine).not.toHaveBeenCalled();
  });
});
