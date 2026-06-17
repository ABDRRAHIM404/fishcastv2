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
  MarineConditions,
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

export function scorePressure(d: WeatherConditions): number | null {
  if (d.pressureMb === null) return null;

  // Pressure nearest 1018 mb is ideal; too low or too high both reduce fishability.
  const deviation = Math.abs(d.pressureMb - 1018);
  const base = clamp01(1 - deviation / 18);

  let trendModifier = 1;
  if (d.pressureTrendMbPerHr !== null) {
    if (d.pressureTrendMbPerHr < -1.0) trendModifier = 0.75;
    else if (d.pressureTrendMbPerHr < 0) trendModifier = 0.9;
    else if (d.pressureTrendMbPerHr > 1.0) trendModifier = 1.05;
  }

  return clamp01(base * trendModifier);
}

function normalizedMoonPhase(iso: string): number {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  const yy = year - Math.floor((12 - month) / 10);
  let mm = month + 9;
  if (mm >= 12) {
    mm -= 12;
  }
  const k1 = Math.floor(365.25 * (yy + 4712));
  const k2 = Math.floor(30.6 * mm + 0.5);
  const jd = k1 + k2 + day - 1524.5;
  const daysSinceNew = jd - 2451549.5;
  const newMoons = daysSinceNew / 29.530588853;
  return newMoons - Math.floor(newMoons);
}

export function scoreMoon(marine: MarineConditions): number | null {
  const time =
    marine.weather.status === 'ok'
      ? marine.weather.data.observedAt
      : marine.tide.status === 'ok'
      ? marine.tide.data.observedAt
      : null;
  if (time === null) return null;

  const phase = normalizedMoonPhase(time);
  const newMoonCloseness = Math.min(phase, 1 - phase);
  const fullMoonCloseness = Math.abs(phase - 0.5);
  const moonScore = 1 - Math.min(newMoonCloseness, fullMoonCloseness) * 2;

  return clamp01(moonScore);
}

function timeOfDayScore(iso: string): number {
  const date = new Date(iso);
  const hour = date.getHours();

  if ((hour >= 5 && hour < 8) || (hour >= 17 && hour < 20)) {
    return 1;
  }
  if ((hour >= 8 && hour < 11) || (hour >= 14 && hour < 17) || (hour >= 20 && hour < 22)) {
    return 0.8;
  }
  return 0.55;
}

export function scoreTimeOfDay(marine: MarineConditions): number | null {
  const time =
    marine.weather.status === 'ok'
      ? marine.weather.data.observedAt
      : marine.tide.status === 'ok'
      ? marine.tide.data.observedAt
      : null;
  if (time === null) return null;

  return clamp01(timeOfDayScore(time));
}

export function scoreTide(d: TideConditions): number | null {
  // A moving tide (rising or falling) generally fishes better than slack.
  if (d.trend === null && d.extremes.length === 0) return null;
  if (d.trend === 'rising' || d.trend === 'falling') return 1;
  return 0.5;
}
