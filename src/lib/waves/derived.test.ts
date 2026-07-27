import { describe, expect, it } from 'vitest';
import {
  angularDifferenceDeg,
  deriveWaveMetrics,
  estimatedDeepWaterWavelengthM,
  estimatedWavePowerKwPerM,
  estimatedWaveSteepness,
  seaStateFor,
} from '@/lib/waves/derived';

describe('wave derived metrics', () => {
  it('calculates deep-water wavelength, steepness, and power', () => {
    const wavelength = estimatedDeepWaterWavelengthM(8);
    expect(wavelength).toBeCloseTo(99.89, 1);
    expect(estimatedWaveSteepness(1, wavelength)).toBeCloseTo(0.01001, 4);
    expect(estimatedWavePowerKwPerM(1, 8)).toBeCloseTo(3.92, 1);
  });

  it('handles missing, invalid, and calm boundary values', () => {
    expect(estimatedDeepWaterWavelengthM(null)).toBeNull();
    expect(estimatedDeepWaterWavelengthM(0)).toBeNull();
    expect(estimatedWaveSteepness(-1, 100)).toBeNull();
    expect(estimatedWavePowerKwPerM(1, -2)).toBeNull();
    expect(seaStateFor(null, null, null)).toBe('unknown');
    expect(seaStateFor(0.49, 8, 0.005)).toBe('calm');
    expect(seaStateFor(0.5, 8, 0.05)).toBe('moderate');
  });

  it('uses the shortest angular distance around north', () => {
    expect(angularDifferenceDeg(350, 10)).toBe(20);
    expect(angularDifferenceDeg(10, 190)).toBe(180);
  });

  it('detects crossing swell at the documented angle and height boundary', () => {
    const crossing = deriveWaveMetrics({
      waveHeightM: 0.8,
      wavePeriodS: 9,
      swellHeightM: 0.25,
      swellDirectionDeg: 270,
      secondarySwellHeightM: 0.25,
      secondarySwellDirectionDeg: 330,
    });
    expect(crossing.crossingAngleDeg).toBe(60);
    expect(crossing.crossingSwell).toBe(true);

    const missing = deriveWaveMetrics({
      waveHeightM: null,
      wavePeriodS: null,
      swellHeightM: null,
      swellDirectionDeg: null,
      secondarySwellHeightM: null,
      secondarySwellDirectionDeg: null,
    });
    expect(missing).toMatchObject({
      estimatedWavelengthM: null,
      estimatedSteepness: null,
      estimatedPowerKwPerM: null,
      seaState: 'unknown',
      crossingSwell: null,
      crossingAngleDeg: null,
    });
  });
});
