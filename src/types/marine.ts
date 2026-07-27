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
  /** Surface pressure in millibars. */
  pressureMb: number | null;
  /** Barometric trend in millibars per hour. */
  pressureTrendMbPerHr: number | null;
  /** Open-Meteo WMO weather code, kept for a future icon mapping. */
  weatherCode: number | null;
  /** Horizontal visibility in metres. */
  visibilityM: number | null;
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
  secondarySwellHeightM: number | null;
  secondarySwellPeriodS: number | null;
  secondarySwellDirectionDeg: number | null;
  seaSurfaceTemperatureC: number | null;
  /** Current speed including modelled Eulerian, wave and tide effects. */
  oceanCurrentVelocityKmh: number | null;
  /** Direction the current is heading towards (unlike wave "coming from"). */
  oceanCurrentDirectionDeg: number | null;
  derived: WaveDerivedMetrics;
}

export type SeaState =
  | 'calm'
  | 'slight'
  | 'moderate'
  | 'rough'
  | 'very-rough'
  | 'unknown';

export interface WaveDerivedMetrics {
  /** Deep-water estimate L = gT²/(2π); not navigation-grade. */
  estimatedWavelengthM: number | null;
  /** Estimated significant-wave steepness H/L. */
  estimatedSteepness: number | null;
  /** Approximate deep-water wave-power indicator in kW per metre of crest. */
  estimatedPowerKwPerM: number | null;
  seaState: SeaState;
  crossingSwell: boolean | null;
  crossingAngleDeg: number | null;
}

export type TideState = 'high' | 'low';
export type TideTrend = 'rising' | 'falling' | 'slack';

/**
 * One hourly sea-level point returned by Open-Meteo Marine. These are provider
 * source points; the five-minute timeline derives separate interpolated values.
 */
export interface ModelledSeaLevelPoint {
  time: string;
  heightM: number;
}

export interface TideExtreme {
  /** ISO 8601 timestamp of the extreme. */
  time: string;
  state: TideState;
  heightM: number;
}

export interface TideConditions {
  observedAt: string;
  /** Explicitly modelled data; not an official nautical tide prediction. */
  source: 'open-meteo-modelled';
  /** Open-Meteo sea_level_height_msl is relative to global mean sea level. */
  datum: 'mean-sea-level';
  /** Native source interval before FishCast interpolation. */
  sourceIntervalMinutes: 60;
  /** Current monotone-cubic estimate from hourly provider points, metres. */
  heightM: number | null;
  /** Whether modelled sea level is rising, falling, or near a turning point. */
  trend: TideTrend | null;
  /** Upcoming high/low extremes, chronological. */
  extremes: TideExtreme[];
  /** Whole minutes from observedAt until the next modelled extreme. */
  minutesToNextExtreme: number | null;
  /** Max minus min hourly modelled sea level for the local calendar day. */
  dailyRangeM: number | null;
  /** Centered modelled rate of change at observedAt. */
  rateMPerHour: number | null;
  /** Whole minutes since the previous detected turning point. */
  minutesSincePreviousExtreme: number | null;
}

export interface AstronomyConditions {
  observedAt: string;
  source: 'calculated-noaa';
  sunrise: string | null;
  sunset: string | null;
  civilDawn: string | null;
  civilDusk: string | null;
  daylightState: 'daylight' | 'civil-twilight' | 'night' | 'unknown';
  isDaylight: boolean | null;
  /** Normalized moon phase [0=New, 0.5=Full, 1=New]. */
  moonPhase: number | null;
  /** Moon illumination as a percentage [0-100]. */
  moonIlluminationPct: number | null;
  /** Solunar transit alignment score [0-1] for overhead/underfoot timing. */
  moonTransitScore: number | null;
  /** Time-of-day light factor [0-1], with dawn and dusk boosted. */
  timeOfDayScore: number | null;
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
  astronomy?: MarineSection<AstronomyConditions>;
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
