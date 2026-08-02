import type { ForecastDataQuality } from '@/lib/forecast-ui/types';
import type { ConfidenceLabel } from '@/types/forecast';
import type { SeaState, TideTrend } from '@/types/marine';

export const FORECAST_HELP: Readonly<Record<string, string>> = {
  wavePeriod:
    'Time between wave crests. Longer-period waves usually carry more energy and can surge farther ashore.',
  wavelength:
    'Estimated deep-water spacing between wave crests, calculated from period. It is not a measured coastal distance.',
  wavePower:
    'Estimated deep-water energy passing each metre of wave crest. Local breaking conditions can be very different.',
  steepness:
    'Estimated wave height divided by wavelength. Steeper waves are generally choppier and less stable.',
  modelledTide:
    'Modelled sea level relative to mean sea level. It is not an official nautical tide height and must not be used for navigation.',
  swell:
    'Longer waves generated away from the spot. Swell can remain powerful even when local wind is light.',
  crossingSwell:
    'Primary and secondary swells arriving from materially different directions, which can make the sea less predictable.',
  windRelationship:
    'Onshore, offshore and cross-shore labels use an unverified editorial shoreline orientation for this spot.',
  confidence:
    'Deterministic data completeness and freshness. Missing critical inputs always reduce confidence.',
  interpolated:
    'Estimated between provider timestamps. It is useful for continuity but is not a new provider observation.',
} as const;

export function windLabel(speedKmh: number | null): string {
  if (speedKmh === null) return 'Unavailable';
  if (speedKmh <= 12) return 'Light';
  if (speedKmh <= 20) return 'Moderate';
  if (speedKmh <= 30) return 'Fresh';
  if (speedKmh <= 40) return 'Strong';
  return 'Very strong';
}

export function gustLabel(gustKmh: number | null): string {
  if (gustKmh === null) return 'Unavailable';
  if (gustKmh <= 20) return 'Light gusts';
  if (gustKmh <= 35) return 'Moderate gusts';
  if (gustKmh <= 50) return 'Strong gusts';
  return 'Severe gusts';
}

export function waveHeightLabel(
  heightM: number | null,
  seaState?: SeaState
): string {
  if (heightM === null) return 'Unavailable';
  if (seaState && seaState !== 'unknown') {
    return seaState.replace('-', ' ').replace(/^./, (value) => value.toUpperCase());
  }
  if (heightM < 0.5) return 'Calm';
  if (heightM < 1.25) return 'Slight';
  if (heightM < 2.5) return 'Moderate';
  if (heightM < 4) return 'Rough';
  return 'Very rough';
}

export function wavePeriodLabel(periodS: number | null): string {
  if (periodS === null) return 'Unavailable';
  if (periodS < 6) return 'Short period';
  if (periodS < 10) return 'Moderate period';
  if (periodS < 12) return 'Energetic';
  if (periodS < 15) return 'Long period';
  return 'Very long period';
}

export function wavePowerLabel(powerKwPerM: number | null): string {
  if (powerKwPerM === null) return 'Unavailable';
  if (powerKwPerM < 5) return 'Low power';
  if (powerKwPerM < 12) return 'Moderate power';
  if (powerKwPerM < 25) return 'Powerful';
  return 'Very powerful';
}

export function tideMovementLabel(
  trend: TideTrend | null,
  rateMPerHour: number | null
): string {
  if (trend === null) return 'Unavailable';
  if (trend === 'slack') return 'Slack water';
  if (rateMPerHour === null) return 'Movement estimated';
  const rate = Math.abs(rateMPerHour);
  if (rate < 0.08) return 'Gentle movement';
  if (rate < 0.25) return 'Moderate movement';
  return 'Strong movement';
}

export function pressureTrendLabel(value: number | null): string {
  if (value === null) return 'Trend unavailable';
  if (value <= -0.2) return 'Falling';
  if (value >= 0.2) return 'Rising';
  return 'Steady';
}

export function confidenceLabel(value: ConfidenceLabel): string {
  return `${value[0]!.toUpperCase()}${value.slice(1)} confidence`;
}

export function dataQualityLabel(value: ForecastDataQuality): string {
  if (value === 'provider') return 'Provider timestamp';
  if (value === 'interpolated') return 'Interpolated estimate';
  if (value === 'aggregated') return 'Aggregated estimate';
  if (value === 'mixed') return 'Mixed availability';
  return 'Unavailable';
}

export function weatherLabel(code: number | null): string {
  if (code === null) return 'Unavailable';
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 95) return 'Thunderstorm';
  if (code >= 80) return 'Showers';
  if (code >= 51) return 'Rain';
  return 'Variable';
}

export function weatherSymbol(code: number | null): string {
  if (code === null) return '·';
  if (code === 0) return '☀';
  if (code <= 3) return '⛅';
  if (code === 45 || code === 48) return '≋';
  if (code >= 95) return '⛈';
  if (code >= 51) return '🌧';
  return '☁';
}

export function compassLabel(directionDeg: number | null): string {
  if (directionDeg === null) return '—';
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
  return labels[Math.round((((directionDeg % 360) + 360) % 360) / 45) % 8]!;
}

/** Arrow points where wind/waves travel; provider bearing says where from. */
export function directionArrowFrom(directionDeg: number | null): string {
  if (directionDeg === null) return '·';
  const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'] as const;
  return arrows[Math.round((((directionDeg % 360) + 360) % 360) / 45) % 8]!;
}

export function formatValue(
  value: number | null,
  unit: string,
  digits = 0
): string {
  return value === null ? '—' : `${value.toFixed(digits)}${unit}`;
}
