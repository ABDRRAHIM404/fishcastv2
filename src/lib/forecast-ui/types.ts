import type { ConfidenceLabel, ForecastInputKey } from '@/types/forecast';
import type { TideTrend, WaveDerivedMetrics } from '@/types/marine';
import type { SafetyStatus, SafetyWarning } from '@/lib/safety/types';
import type {
  FishingWindow,
  WindowLabel,
} from '@/lib/timeline/types';
import type {
  WindRelationship,
} from '@/lib/spots/exposure';

export type ForecastInterval = '30m' | '1h' | '3h' | '6h';
export type ForecastScope = 'day' | 'seven-days';
export type ForecastView = 'table' | 'graph' | 'timeline';
export type ForecastCoverage = 'today' | 'week';
export type SelectedTimestamp = string | null;
export type ForecastGraphCategory =
  | 'fishing'
  | 'safety'
  | 'wind'
  | 'waves'
  | 'tide'
  | 'weather';

export type ForecastDataQuality =
  | 'provider'
  | 'interpolated'
  | 'mixed'
  | 'aggregated'
  | 'unavailable';

export interface ForecastFishingValue {
  /** Fishing quality only, on the public 0-100 scale. */
  score: number;
  scoreOutOfTen: number;
  label: WindowLabel;
  grade: string;
}

export interface ForecastSafetyValue {
  score: number | null;
  status: SafetyStatus;
  warnings: SafetyWarning[];
  primaryWarning: string | null;
  /** True when any underlying five-minute point was Dangerous. */
  containsDangerous: boolean;
}

export interface ForecastConfidenceValue {
  completenessPercentage: number;
  label: ConfidenceLabel;
  missingInputs: ForecastInputKey[];
  missingCriticalInputs: ForecastInputKey[];
  forecastAgeMinutes: number | null;
}

/** Compact decision-ready period returned to the browser, never provider raw. */
export interface ForecastPeriod {
  start: string;
  end: string;
  date: string;
  interval: ForecastInterval;
  dataQuality: ForecastDataQuality;
  dataQualityLabel: string;
  safetyAggregatedAcrossInterval: true;
  recommended: boolean;
  fishing: ForecastFishingValue;
  safety: ForecastSafetyValue;
  confidence: ForecastConfidenceValue;
  bestSpecies: string | null;
  recommendedTechnique: null;
  note: string;
  wind: {
    speedKmh: number | null;
    gustKmh: number | null;
    directionDeg: number | null;
    relationship: WindRelationship;
  };
  waves: {
    heightM: number | null;
    directionDeg: number | null;
    periodS: number | null;
    swellHeightM: number | null;
    swellDirectionDeg: number | null;
    swellPeriodS: number | null;
    secondarySwellHeightM: number | null;
    secondarySwellDirectionDeg: number | null;
    secondarySwellPeriodS: number | null;
    derived: WaveDerivedMetrics;
  };
  tide: {
    heightM: number | null;
    trend: TideTrend | null;
    rateMPerHour: number | null;
    dailyRangeM: number | null;
    nextExtremeState: 'high' | 'low' | null;
    nextExtremeTime: string | null;
    minutesToNextExtreme: number | null;
  };
  weather: {
    temperatureC: number | null;
    pressureMb: number | null;
    pressureTrendMbPerHr: number | null;
    precipitationMm: number | null;
    cloudCoverPct: number | null;
    visibilityM: number | null;
    weatherCode: number | null;
  };
  environment: {
    seaSurfaceTemperatureC: number | null;
    oceanCurrentVelocityKmh: number | null;
    oceanCurrentDirectionDeg: number | null;
    daylightState: 'daylight' | 'civil-twilight' | 'night' | 'unknown';
  };
  markers: {
    currentTime: boolean;
    sunrise: boolean;
    sunset: boolean;
    tideHigh: boolean;
    tideLow: boolean;
  };
}

export interface ForecastDailySummary {
  date: string;
  fishing: ForecastFishingValue;
  safety: ForecastSafetyValue;
  confidence: ForecastConfidenceValue;
  maxWaveHeightM: number | null;
  representativeWavePeriodS: number | null;
  representativeWindKmh: number | null;
  maxWindGustKmh: number | null;
  weatherCode: number | null;
  bestWindow: FishingWindow | null;
  bestSpecies: string | null;
  sunrise: string | null;
  sunset: string | null;
  noRecommendedWindowReason: string | null;
}

export interface ForecastHumanInterpretation {
  bestPeriod: string;
  qualityReason: string;
  safetyConcern: string;
  technique: string;
  missingData: string;
  confidenceLimitation: string;
  orientationLimitation: string;
}

export interface ForecastSpotIdentity {
  id: string;
  slug: string;
  name: string;
  displayName: string;
}

export interface ForecastContextResponse {
  schemaVersion: 1;
  /** Explicitly distinguishes the first usable day from the completed week. */
  coverage: ForecastCoverage;
  spot: ForecastSpotIdentity;
  timeZone: 'Africa/Casablanca';
  range: { startDate: string; endDate: string };
  selectedDate: string;
  generatedAt: string;
  sourceTimestamps: {
    forecastFetchedAt: string | null;
    marineFetchedAt: string | null;
  };
  freshnessMinutes: number | null;
  days: ForecastDailySummary[];
  periods: Record<ForecastInterval, ForecastPeriod[]>;
  interpretation: ForecastHumanInterpretation;
  interpretations: Record<string, ForecastHumanInterpretation>;
  orientationVerified: false;
}

export type ForecastStreamEvent =
  | {
      type: 'today';
      data: ForecastContextResponse & { coverage: 'today' };
      elapsedMs: number;
    }
  | {
      type: 'week';
      data: ForecastContextResponse & { coverage: 'week' };
      elapsedMs: number;
      cacheStatus: 'hit' | 'miss' | 'coalesced';
    }
  | {
      type: 'error';
      stage: ForecastCoverage;
      code: 'forecast_unavailable';
    };

export interface ForecastComparisonItem {
  spot: ForecastSpotIdentity;
  timestamp: string;
  fishing: ForecastFishingValue;
  safety: ForecastSafetyValue;
  waveHeightM: number | null;
  wavePeriodS: number | null;
  windSpeedKmh: number | null;
  windRelationship: WindRelationship;
  confidence: ForecastConfidenceValue;
  bestWindow: FishingWindow | null;
}

export interface ForecastComparisonResponse {
  schemaVersion: 1;
  date: string;
  timestamp: string;
  items: ForecastComparisonItem[];
  failures: string[];
}

export interface ForecastTableCell {
  period: ForecastPeriod;
  selected: boolean;
  recommended: boolean;
  dangerous: boolean;
}

export interface ForecastTableRow {
  id: string;
  section: 'fishing' | 'wind' | 'waves' | 'tide' | 'weather';
  label: string;
  helpKey: string | null;
  cells: ForecastTableCell[];
}
