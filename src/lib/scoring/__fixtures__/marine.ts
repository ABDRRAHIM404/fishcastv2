import type { MarineConditions } from '@/types/marine';
import { deriveWaveMetrics } from '@/lib/waves/derived';

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
        pressureMb: 1018,
        pressureTrendMbPerHr: 0.4,
        weatherCode: 1,
        visibilityM: 20_000,
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
        secondarySwellHeightM: 0.15,
        secondarySwellPeriodS: 7,
        secondarySwellDirectionDeg: 210,
        seaSurfaceTemperatureC: 20,
        oceanCurrentVelocityKmh: 0.4,
        oceanCurrentDirectionDeg: 180,
        derived: deriveWaveMetrics({
          waveHeightM: 0.4,
          wavePeriodS: 7,
          swellHeightM: 0.5,
          swellDirectionDeg: 280,
          secondarySwellHeightM: 0.15,
          secondarySwellDirectionDeg: 210,
        }),
      },
    },
    tide: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        source: 'open-meteo-modelled',
        datum: 'mean-sea-level',
        sourceIntervalMinutes: 60,
        heightM: 1.2,
        trend: 'rising',
        extremes: [{ time: ISO, state: 'high', heightM: 1.8 }],
        minutesToNextExtreme: 0,
        dailyRangeM: 1.4,
        rateMPerHour: 0.22,
        minutesSincePreviousExtreme: 120,
      },
    },
    astronomy: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        source: 'calculated-noaa',
        sunrise: '2026-06-14T05:30:00.000Z',
        sunset: '2026-06-14T19:45:00.000Z',
        civilDawn: '2026-06-14T05:00:00.000Z',
        civilDusk: '2026-06-14T20:15:00.000Z',
        daylightState: 'daylight',
        isDaylight: true,
        moonPhase: null,
        moonIlluminationPct: null,
        moonTransitScore: null,
        timeOfDayScore: null,
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
        pressureMb: 1008,
        pressureTrendMbPerHr: -1.2,
        weatherCode: 65,
        visibilityM: 800,
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
        secondarySwellHeightM: 1.4,
        secondarySwellPeriodS: 10,
        secondarySwellDirectionDeg: 290,
        seaSurfaceTemperatureC: 17,
        oceanCurrentVelocityKmh: 2,
        oceanCurrentDirectionDeg: 260,
        derived: deriveWaveMetrics({
          waveHeightM: 3.5,
          wavePeriodS: 6,
          swellHeightM: 4,
          swellDirectionDeg: 200,
          secondarySwellHeightM: 1.4,
          secondarySwellDirectionDeg: 290,
        }),
      },
    },
    tide: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        source: 'open-meteo-modelled',
        datum: 'mean-sea-level',
        sourceIntervalMinutes: 60,
        heightM: 0.9,
        trend: 'slack',
        extremes: [],
        minutesToNextExtreme: null,
        dailyRangeM: 1.1,
        rateMPerHour: 0.01,
        minutesSincePreviousExtreme: 5,
      },
    },
    astronomy: {
      status: 'ok',
      cachedAt: ISO,
      data: {
        observedAt: ISO,
        source: 'calculated-noaa',
        sunrise: '2026-06-14T05:30:00.000Z',
        sunset: '2026-06-14T19:45:00.000Z',
        civilDawn: '2026-06-14T05:00:00.000Z',
        civilDusk: '2026-06-14T20:15:00.000Z',
        daylightState: 'daylight',
        isDaylight: true,
        moonPhase: null,
        moonIlluminationPct: null,
        moonTransitScore: null,
        timeOfDayScore: null,
      },
    },
  };
}

/** All sections failed (for example, providers are unavailable). */
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
