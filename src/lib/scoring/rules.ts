/**
 * Pure scoring rules: each maps a normalized marine value to a [0, 1] factor
 * score. Deterministic and side-effect free. Returns null when the required
 * input is missing so the engine can drop the factor and renormalize weights.
 */
import {
  WIND_KMH,
  WAVE_M,
  SWELL_M,
  WEATHER,
} from '@/lib/scoring/constants';
import type {
  WeatherConditions,
  WindConditions,
  WaveConditions,
  TideConditions,
} from '@/types/marine';

/** Clamps a number to [0, 1]. */
export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Piecewise-linear "lower is better" curve. Returns 1 at/below `ideal`, ramps
 * down through `good`/`fair` and reaches 0 at/above `poor`.
 */
export function decreasingScore(
  value: number,
  t: { ideal: number; good: number; fair: number; poor: number }
): number {
  if (value <= t.ideal) return 1;
  if (value >= t.poor) return 0;
  if (value <= t.good) {
    // 1.0 -> 0.75 across [ideal, good]
    return 1 - 0.25 * ((value - t.ideal) / (t.good - t.ideal));
  }
  if (value <= t.fair) {
    // 0.75 -> 0.4 across [good, fair]
    return 0.75 - 0.35 * ((value - t.good) / (t.fair - t.good));
  }
  // 0.4 -> 0 across [fair, poor]
  return 0.4 - 0.4 * ((value - t.fair) / (t.poor - t.fair));
}

export function scoreWind(d: WindConditions): number | null {
  if (d.speedKmh === null) return null;
  let s = decreasingScore(d.speedKmh, WIND_KMH);
  // Gusts well above sustained wind add a small penalty.
  if (d.gustKmh !== null && d.speedKmh > 0 && d.gustKmh > d.speedKmh * 1.6) {
    s *= 0.9;
  }
  return clamp01(s);
}

export function scoreWave(d: WaveConditions): number | null {
  if (d.waveHeightM === null) return null;
  return clamp01(decreasingScore(d.waveHeightM, WAVE_M));
}

export function scoreSwell(d: WaveConditions): number | null {
  if (d.swellHeightM === null) return null;
  return clamp01(decreasingScore(d.swellHeightM, SWELL_M));
}

export function scoreWeather(d: WeatherConditions): number | null {
  if (d.precipitationMm === null && d.cloudCoverPct === null) return null;

  // Precipitation dominates: 1.0 dry -> 0 at precipPoorMm.
  let precipScore = 1;
  if (d.precipitationMm !== null) {
    precipScore = clamp01(1 - d.precipitationMm / WEATHER.precipPoorMm);
  }

  // Cloud cover near ideal is mildly favorable; clear or full overcast slightly
  // less so. Maps distance-from-ideal to a 0.7-1.0 band.
  let cloudScore = 1;
  if (d.cloudCoverPct !== null) {
    const dist = Math.abs(d.cloudCoverPct - WEATHER.cloudIdealPct) / 100;
    cloudScore = clamp01(1 - dist * 0.3);
  }

  // Weighted blend, precipitation weighted heavier.
  return clamp01(precipScore * 0.7 + cloudScore * 0.3);
}

export function scoreTide(d: TideConditions): number | null {
  // A moving tide (rising or falling) generally fishes better than slack.
  if (d.trend === null && d.extremes.length === 0) return null;
  if (d.trend === 'rising' || d.trend === 'falling') return 1;
  return 0.5;
}
