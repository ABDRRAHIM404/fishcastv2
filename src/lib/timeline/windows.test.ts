import { describe, expect, it } from 'vitest';
import {
  detectDailyWindows,
  detectWindows,
  labelForScore,
} from '@/lib/timeline/windows';
import type { TimelinePoint } from '@/lib/timeline/types';
import type { SafetyStatus } from '@/lib/safety/types';
import type { ConfidenceLabel } from '@/types/forecast';

const START_MS = Date.parse('2026-06-14T00:00:00.000Z');

function pt(
  index: number,
  score: number,
  safetyStatus: SafetyStatus = 'Safe',
  confidence: ConfidenceLabel = 'high'
): TimelinePoint {
  const time = new Date(START_MS + index * 5 * 60_000).toISOString();
  const safeOrCaution =
    safetyStatus === 'Safe' || safetyStatus === 'Caution';
  return {
    time,
    tideHeightM: 1,
    tideTrend: 'rising',
    tideRateMPerHour: 0.2,
    tideDailyRangeM: 1.5,
    windSpeedKmh: 10,
    windGustKmh: 14,
    windDirectionDeg: 270,
    waveHeightM: 0.6,
    wavePeriodS: 8,
    waveDirectionDeg: 270,
    swellHeightM: 0.7,
    swellPeriodS: 10,
    swellDirectionDeg: 270,
    secondarySwellHeightM: 0.1,
    secondarySwellPeriodS: 6,
    secondarySwellDirectionDeg: 180,
    seaSurfaceTemperatureC: 20,
    oceanCurrentVelocityKmh: 0.3,
    oceanCurrentDirectionDeg: 180,
    temperatureC: 21,
    precipitationMm: 0,
    pressureMb: 1017,
    visibilityM: 20_000,
    weatherCode: 1,
    daylightState: 'daylight',
    waveMetrics: {
      estimatedWavelengthM: 100,
      estimatedSteepness: 0.006,
      estimatedPowerKwPerM: 3,
      seaState: 'slight',
      crossingSwell: false,
      crossingAngleDeg: 90,
    },
    interpretation: {
      wind: 'onshore',
      swell: 'head-on',
      sheltered: 'unknown',
      exposureVerification: 'unverified-editorial',
    },
    integrity: {
      completenessPercentage: confidence === 'high' ? 100 : 75,
      confidence,
      missingInputs: [],
      missingCriticalInputs: [],
      staleInputs: [],
      inputs: [],
      sourceTimestamps: {
        weather: time,
        wind: time,
        waves: time,
        tide: time,
        daylight: time,
      },
      forecastAgeMinutes: 0,
    },
    safety: {
      score: safeOrCaution ? (safetyStatus === 'Safe' ? 100 : 70) : null,
      status: safetyStatus,
      warnings: [],
      criticalWarnings:
        safetyStatus === 'Dangerous'
          ? [
              {
                code: 'test-danger',
                severity: 'critical',
                message: 'Test danger',
              },
            ]
          : [],
      missingSafetyInputs:
        safetyStatus === 'Unknown' ? ['waveHeight'] : [],
      confidence,
      completenessPercentage: confidence === 'high' ? 100 : 75,
      explanation: 'Deterministic test fixture.',
      direction: {
        wind: 'onshore',
        swell: 'head-on',
        sheltered: 'unknown',
        exposureVerification: 'unverified-editorial',
      },
      limitations: [],
    },
    score,
    grade: score >= 8 ? 'A' : score >= 6 ? 'B' : score >= 4 ? 'C' : 'D',
    label: labelForScore(score),
  };
}

function segment(
  startIndex: number,
  count: number,
  score: number,
  safetyStatus: SafetyStatus = 'Safe',
  confidence: ConfidenceLabel = 'high'
): TimelinePoint[] {
  return Array.from({ length: count }, (_, offset) =>
    pt(startIndex + offset, score, safetyStatus, confidence)
  );
}

describe('labelForScore', () => {
  it('maps scores to the documented fishing-quality thresholds', () => {
    expect(labelForScore(8)).toBe('Excellent');
    expect(labelForScore(6)).toBe('Good');
    expect(labelForScore(4)).toBe('Moderate');
    expect(labelForScore(3.9)).toBe('Poor');
  });
});

describe('detectWindows', () => {
  it('returns empty for no points or no qualifying duration', () => {
    expect(detectWindows([])).toEqual([]);
    expect(detectWindows(segment(0, 7, 7))).toEqual([]);
  });

  it('builds a minimum-duration window and records its peak', () => {
    const points = segment(0, 8, 6);
    points[4] = pt(4, 7.5);
    const windows = detectWindows(points);
    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      start: points[0]!.time,
      end: new Date(
        new Date(points[7]!.time).getTime() + 5 * 60_000
      ).toISOString(),
      peakTime: points[4]!.time,
      peakScore: 7.5,
      label: 'Good',
      durationMinutes: 40,
    });
  });

  it('excludes Poor, Dangerous, Unknown, and low-confidence periods', () => {
    const points = [
      ...segment(0, 8, 3.9),
      ...segment(8, 8, 9, 'Dangerous'),
      ...segment(16, 8, 9, 'Unknown'),
      ...segment(24, 8, 9, 'Safe', 'low'),
    ];
    expect(detectWindows(points)).toEqual([]);
  });

  it('ranks safer and higher-quality windows best-first', () => {
    const points = [
      ...segment(0, 8, 7, 'Caution'),
      pt(8, 3),
      ...segment(9, 8, 7, 'Safe'),
      pt(17, 3),
      ...segment(18, 8, 8.5, 'Caution'),
    ];
    const windows = detectWindows(points);
    expect(windows).toHaveLength(3);
    expect(windows[0]!.peakScore).toBe(8.5);
    expect(windows[1]!.safetyStatus).toBe('Safe');
    expect(windows[2]!.safetyStatus).toBe('Caution');
  });

  it('uses start time as the deterministic final tie-break', () => {
    const points = [
      ...segment(0, 8, 7),
      pt(8, 3),
      ...segment(9, 8, 7),
    ];
    const windows = detectWindows(points);
    expect(windows.map((window) => window.start)).toEqual([
      pt(0, 7).time,
      pt(9, 7).time,
    ]);
  });

  it('uses confidence and duration when quality and safety are equal', () => {
    const points = [
      ...segment(0, 8, 7, 'Safe', 'medium'),
      pt(8, 3),
      ...segment(9, 8, 7, 'Safe', 'high'),
      pt(17, 3),
      ...segment(18, 16, 7, 'Safe', 'high'),
    ];
    const windows = detectWindows(points);
    expect(windows[0]!.durationMinutes).toBe(80);
    expect(windows[1]!.confidence).toBe('high');
    expect(windows[2]!.confidence).toBe('medium');
  });

  it('splits long qualifying runs into at most four ranked windows', () => {
    const windows = detectWindows(segment(0, 288, 9));
    expect(windows).toHaveLength(4);
    expect(windows.every((window) => window.durationMinutes <= 240)).toBe(
      true
    );
  });
});

describe('detectDailyWindows', () => {
  it('exposes the top-ranked valid window as the daily recommendation', () => {
    const daily = detectDailyWindows([
      ...segment(0, 8, 6),
      pt(8, 3),
      ...segment(9, 8, 8),
    ]);
    expect(daily).toHaveLength(1);
    expect(daily[0]!.recommendedWindow).toEqual(daily[0]!.windows[0]);
    expect(daily[0]!.recommendedWindow?.label).toBe('Excellent');
  });
});
