import type { MarineConditions } from '@/types/marine';

/**
 * Test fixtures: builders for MarineConditions in known states. Kept out of the
 * test file so multiple suites can reuse them.
 */

const ISO = '2026-06-14T10:00:00.000Z';

export function excellentMarine(): MarineConditions {
  return {
    spotId: 'spot-1',
    generatedAt: ISO,
    weather: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        temperatureC: 22,
        apparentTemperatureC: 22,
        humidityPct: 60,
        cloudCoverPct: 60,
        precipitationMm: 0,
        weatherCode: 1,
      },
    },
    wind: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        speedKmh: 8,
        gustKmh: 10,
        directionDeg: 270,
        directionCompass: 'W',
      },
    },
    waves: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        waveHeightM: 0.4,
        wavePeriodS: 7,
        waveDirectionDeg: 280,
        swellHeightM: 0.5,
        swellPeriodS: 9,
        swellDirectionDeg: 280,
      },
    },
    tide: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        heightM: 1.2,
        trend: 'rising',
        extremes: [{ time: ISO, state: 'high', heightM: 1.8 }],
      },
    },
  };
}

export function poorMarine(): MarineConditions {
  return {
    spotId: 'spot-1',
    generatedAt: ISO,
    weather: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        temperatureC: 12,
        apparentTemperatureC: 9,
        humidityPct: 95,
        cloudCoverPct: 100,
        precipitationMm: 12,
        weatherCode: 65,
      },
    },
    wind: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        speedKmh: 45,
        gustKmh: 80,
        directionDeg: 200,
        directionCompass: 'S',
      },
    },
    waves: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        waveHeightM: 3.5,
        wavePeriodS: 6,
        waveDirectionDeg: 200,
        swellHeightM: 4,
        swellPeriodS: 8,
        swellDirectionDeg: 200,
      },
    },
    tide: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        heightM: 0.9,
        trend: null,
        extremes: [],
      },
    },
  };
}

/** All sections failed (e.g. providers down / missing tide key). */
export function emptyMarine(): MarineConditions {
  return {
    spotId: 'spot-1',
    generatedAt: ISO,
    weather: { status: 'error', message: 'down' },
    wind: { status: 'error', message: 'down' },
    waves: { status: 'error', message: 'down' },
    tide: { status: 'error', message: 'down' },
  };
}
