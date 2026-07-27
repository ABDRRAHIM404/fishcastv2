import type { SeaState, WaveDerivedMetrics } from '@/types/marine';

const GRAVITY_M_PER_S2 = 9.80665;
const SEAWATER_DENSITY_KG_PER_M3 = 1025;
export const CROSSING_SWELL_MIN_ANGLE_DEG = 60;
export const CROSSING_SWELL_MIN_HEIGHT_M = 0.25;

export function angularDifferenceDeg(
  first: number,
  second: number
): number {
  const normalized = Math.abs((((first - second) % 360) + 360) % 360);
  return Math.min(normalized, 360 - normalized);
}

export function estimatedDeepWaterWavelengthM(
  periodS: number | null
): number | null {
  if (periodS === null || !Number.isFinite(periodS) || periodS <= 0) {
    return null;
  }
  return (GRAVITY_M_PER_S2 * periodS * periodS) / (2 * Math.PI);
}

export function estimatedWaveSteepness(
  waveHeightM: number | null,
  wavelengthM: number | null
): number | null {
  if (
    waveHeightM === null ||
    wavelengthM === null ||
    !Number.isFinite(waveHeightM) ||
    !Number.isFinite(wavelengthM) ||
    waveHeightM < 0 ||
    wavelengthM <= 0
  ) {
    return null;
  }
  return waveHeightM / wavelengthM;
}

/**
 * Approximate deep-water significant wave power per metre of wave crest.
 * P = ρg²H²T/(64π). This is an indicator, not a navigation-grade measurement.
 */
export function estimatedWavePowerKwPerM(
  waveHeightM: number | null,
  periodS: number | null
): number | null {
  if (
    waveHeightM === null ||
    periodS === null ||
    !Number.isFinite(waveHeightM) ||
    !Number.isFinite(periodS) ||
    waveHeightM < 0 ||
    periodS <= 0
  ) {
    return null;
  }
  return (
    (SEAWATER_DENSITY_KG_PER_M3 *
      GRAVITY_M_PER_S2 *
      GRAVITY_M_PER_S2 *
      waveHeightM *
      waveHeightM *
      periodS) /
    (64 * Math.PI * 1000)
  );
}

export function seaStateFor(
  waveHeightM: number | null,
  periodS: number | null,
  steepness: number | null
): SeaState {
  if (waveHeightM === null || !Number.isFinite(waveHeightM)) return 'unknown';
  if (waveHeightM < 0.5) return 'calm';
  if (waveHeightM < 1.25) {
    return steepness !== null && steepness >= 0.05 ? 'moderate' : 'slight';
  }
  if (waveHeightM < 2.5) {
    return periodS !== null && periodS >= 13 ? 'rough' : 'moderate';
  }
  if (waveHeightM < 4) return 'rough';
  return 'very-rough';
}

export function deriveWaveMetrics(input: {
  waveHeightM: number | null;
  wavePeriodS: number | null;
  swellHeightM: number | null;
  swellDirectionDeg: number | null;
  secondarySwellHeightM: number | null;
  secondarySwellDirectionDeg: number | null;
}): WaveDerivedMetrics {
  const estimatedWavelengthM = estimatedDeepWaterWavelengthM(
    input.wavePeriodS
  );
  const estimatedSteepness = estimatedWaveSteepness(
    input.waveHeightM,
    estimatedWavelengthM
  );
  const estimatedPower = estimatedWavePowerKwPerM(
    input.waveHeightM,
    input.wavePeriodS
  );

  let crossingAngleDeg: number | null = null;
  let crossingSwell: boolean | null = null;
  if (
    input.swellDirectionDeg !== null &&
    input.secondarySwellDirectionDeg !== null &&
    input.swellHeightM !== null &&
    input.secondarySwellHeightM !== null
  ) {
    crossingAngleDeg = angularDifferenceDeg(
      input.swellDirectionDeg,
      input.secondarySwellDirectionDeg
    );
    crossingSwell =
      input.swellHeightM >= CROSSING_SWELL_MIN_HEIGHT_M &&
      input.secondarySwellHeightM >= CROSSING_SWELL_MIN_HEIGHT_M &&
      crossingAngleDeg >= CROSSING_SWELL_MIN_ANGLE_DEG;
  }

  return {
    estimatedWavelengthM,
    estimatedSteepness,
    estimatedPowerKwPerM: estimatedPower,
    seaState: seaStateFor(
      input.waveHeightM,
      input.wavePeriodS,
      estimatedSteepness
    ),
    crossingSwell,
    crossingAngleDeg,
  };
}

