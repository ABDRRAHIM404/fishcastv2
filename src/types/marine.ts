/**
 * Normalized marine domain model. The UI and future phases (score engine,
 * timeline, species suitability, AI) depend ONLY on these types, never on
 * provider-specific response shapes. All units are explicit in field names.
 *
 * Phase 5 is data-only: no scoring, labels, or good/bad logic here.
 */

/** The four marine data kinds, matching the marine_cache.kind column. */
export type MarineKind = 'weather' | 'wind' | 'waves' | 'tide';

/** Cardinal/intercardinal compass direction derived from a bearing. */
export type CompassDirection =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW';

export interface WeatherConditions {
  /** ISO 8601 timestamp the observation/forecast point applies to. */
  observedAt: string;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  /** Relative humidity, percent (0-100). */
  humidityPct: number | null;
  /** Cloud cover, percent (0-100). */
  cloudCoverPct: number | null;
  /** Precipitation for the period, millimetres. */
  precipitationMm: number | null;
  /** Open-Meteo WMO weather code, kept for a future icon mapping. */
  weatherCode: number | null;
}

export interface WindConditions {
  observedAt: string;
  speedKmh: number | null;
  gustKmh: number | null;
  /** Bearing the wind is coming from, degrees (0-360). */
  directionDeg: number | null;
  /** Compass label derived from directionDeg, null when unknown. */
  directionCompass: CompassDirection | null;
}

export interface WaveConditions {
  observedAt: string;
  waveHeightM: number | null;
  /** Dominant wave period, seconds. */
  wavePeriodS: number | null;
  waveDirectionDeg: number | null;
  swellHeightM: number | null;
  swellPeriodS: number | null;
  swellDirectionDeg: number | null;
}

export type TideState = 'high' | 'low';

export interface TideExtreme {
  /** ISO 8601 timestamp of the extreme. */
  time: string;
  state: TideState;
  heightM: number;
}

export interface TideConditions {
  observedAt: string;
  /** Current interpolated tide height, metres (datum per provider). */
  heightM: number | null;
  /** Whether the tide is currently rising or falling, when derivable. */
  trend: 'rising' | 'falling' | null;
  /** Upcoming high/low extremes, chronological. */
  extremes: TideExtreme[];
}

/** A sub-section that either resolved with data or failed gracefully. */
export type MarineSection<T> =
  | { status: 'ok'; data: T; cachedAt: string }
  | { status: 'error'; message: string };

/**
 * Aggregated marine conditions for a single spot. Each section is independent
 * so one failing provider never blocks the others.
 */
export interface MarineConditions {
  spotId: string;
  /** ISO 8601 timestamp the aggregate was assembled. */
  generatedAt: string;
  weather: MarineSection<WeatherConditions>;
  wind: MarineSection<WindConditions>;
  waves: MarineSection<WaveConditions>;
  tide: MarineSection<TideConditions>;
}

const COMPASS_POINTS: readonly CompassDirection[] = [
  'N',
  'NE',
  'E',
  'SE',
  'S',
  'SW',
  'W',
  'NW',
] as const;

/** Converts a bearing in degrees to an 8-point compass label. */
export function degreesToCompass(
  deg: number | null | undefined
): CompassDirection | null {
  if (typeof deg !== 'number' || Number.isNaN(deg)) return null;
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % COMPASS_POINTS.length;
  // index is in [0, 7] by construction; guard for noUncheckedIndexedAccess.
  return COMPASS_POINTS[index] ?? null;
}
