import type {
  ModelledSeaLevelPoint,
  TideTrend,
  WaveDerivedMetrics,
} from '@/types/marine';
import type { ForecastIntegrity, ConfidenceLabel } from '@/types/forecast';
import type { SafetyResult, SafetyStatus } from '@/lib/safety/types';
import type { DirectionInterpretation } from '@/lib/spots/exposure';

/** One deterministic five-minute forecast increment. */
export interface TimelinePoint {
  /** Absolute ISO timestamp; display conversion always uses Casablanca. */
  time: string;
  tideHeightM: number | null;
  tideTrend: TideTrend | null;
  tideRateMPerHour: number | null;
  tideDailyRangeM: number | null;
  tideMinutesToNextExtreme: number | null;
  tideNextExtremeState: 'high' | 'low' | null;
  tideNextExtremeTime: string | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windDirectionDeg: number | null;
  waveHeightM: number | null;
  wavePeriodS: number | null;
  waveDirectionDeg: number | null;
  swellHeightM: number | null;
  swellPeriodS: number | null;
  swellDirectionDeg: number | null;
  secondarySwellHeightM: number | null;
  secondarySwellPeriodS: number | null;
  secondarySwellDirectionDeg: number | null;
  seaSurfaceTemperatureC: number | null;
  oceanCurrentVelocityKmh: number | null;
  oceanCurrentDirectionDeg: number | null;
  temperatureC: number | null;
  precipitationMm: number | null;
  cloudCoverPct: number | null;
  pressureMb: number | null;
  pressureTrendMbPerHr: number | null;
  visibilityM: number | null;
  weatherCode: number | null;
  daylightState: 'daylight' | 'civil-twilight' | 'night' | 'unknown';
  sunrise: string | null;
  sunset: string | null;
  civilDawn: string | null;
  civilDusk: string | null;
  waveMetrics: WaveDerivedMetrics;
  interpretation: DirectionInterpretation;
  integrity: ForecastIntegrity;
  safety: SafetyResult;
  /** Fishing quality only, independent from safety. */
  score: number;
  grade: string;
  label: WindowLabel;
}

export type WindowLabel = 'Excellent' | 'Good' | 'Moderate' | 'Poor';

export interface FishingWindow {
  /** Start-inclusive absolute timestamp. */
  start: string;
  /** End-exclusive absolute timestamp. */
  end: string;
  peakTime: string;
  peakScore: number;
  label: Exclude<WindowLabel, 'Poor'>;
  safetyStatus: Extract<SafetyStatus, 'Safe' | 'Caution'>;
  confidence: ConfidenceLabel;
  completenessPercentage: number;
  durationMinutes: number;
  /** Deterministic composite used only to rank otherwise valid windows. */
  rankScore: number;
}

export interface DailyFishingWindows {
  /** Africa/Casablanca local day, YYYY-MM-DD. */
  date: string;
  /** Ranked best-first, never containing Poor/Dangerous/Unknown periods. */
  windows: FishingWindow[];
  recommendedWindow: FishingWindow | null;
}

export interface Timeline {
  schemaVersion: 3;
  spotId: string;
  /** Requested Africa/Casablanca local day. */
  date: string;
  range: {
    start: string;
    endExclusive: string;
    timeZone: 'Africa/Casablanca';
  };
  points: TimelinePoint[];
  /** Ranked best-first for the requested date. */
  windows: FishingWindow[];
  dailyWindows: DailyFishingWindows[];
  recommendedWindow: FishingWindow | null;
  noRecommendedWindowReason: string | null;
  generatedAt: string;
  sourceTimestamps: {
    forecastFetchedAt: string | null;
    marineFetchedAt: string | null;
  };
  tideMetadata: {
    source: 'open-meteo-modelled';
    datum: 'mean-sea-level';
    providerIntervalMinutes: 60;
    timelineIntervalMinutes: 5;
    interpolation: 'monotone-cubic';
  };
}

/** Source forecast series interpolated into the timeline domain. */
export interface ForecastAnchors {
  wind: {
    time: string[];
    speedKmh: (number | null)[];
    gustKmh: (number | null)[];
    directionDeg: (number | null)[];
    fetchedAt: string | null;
  };
  waves: {
    time: string[];
    heightM: (number | null)[];
    periodS: (number | null)[];
    directionDeg: (number | null)[];
    swellHeightM: (number | null)[];
    swellPeriodS: (number | null)[];
    swellDirectionDeg: (number | null)[];
    secondarySwellHeightM: (number | null)[];
    secondarySwellPeriodS: (number | null)[];
    secondarySwellDirectionDeg: (number | null)[];
    seaSurfaceTemperatureC: (number | null)[];
    oceanCurrentVelocityKmh: (number | null)[];
    oceanCurrentDirectionDeg: (number | null)[];
    fetchedAt: string | null;
  };
  weather: {
    time: string[];
    precipitationMm: (number | null)[];
    cloudCoverPct: (number | null)[];
    pressureMb: (number | null)[];
    temperatureC: (number | null)[];
    visibilityM: (number | null)[];
    weatherCode: (number | null)[];
    fetchedAt: string | null;
  };
  tide: {
    source: 'open-meteo-hourly';
    intervalMinutes: 60;
    points: ModelledSeaLevelPoint[];
    fetchedAt: string | null;
  };
}
