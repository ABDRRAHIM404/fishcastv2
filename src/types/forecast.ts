export type ForecastInputKey =
  | 'windSpeed'
  | 'windGusts'
  | 'windDirection'
  | 'waveHeight'
  | 'waveDirection'
  | 'wavePeriod'
  | 'swellHeight'
  | 'swellDirection'
  | 'swellPeriod'
  | 'modelledTide'
  | 'weather'
  | 'pressure'
  | 'temperature'
  | 'daylight';

export type InputAvailability =
  | 'available'
  | 'interpolated'
  | 'missing'
  | 'stale';

export type InputProvenance =
  | 'provider'
  | 'interpolation'
  | 'calculated';

export type ConfidenceLabel = 'high' | 'medium' | 'low';

export interface ForecastInputStatus {
  key: ForecastInputKey;
  label: string;
  availability: InputAvailability;
  provenance: InputProvenance | null;
  critical: boolean;
  sourceTimestamp: string | null;
  ageMinutes: number | null;
}

export interface ForecastSourceTimestamps {
  weather: string | null;
  wind: string | null;
  waves: string | null;
  tide: string | null;
  daylight: string | null;
}

export interface ForecastIntegrity {
  completenessPercentage: number;
  confidence: ConfidenceLabel;
  missingInputs: ForecastInputKey[];
  missingCriticalInputs: ForecastInputKey[];
  staleInputs: ForecastInputKey[];
  inputs: ForecastInputStatus[];
  sourceTimestamps: ForecastSourceTimestamps;
  /** Age of the oldest available fetched source, when meaningful. */
  forecastAgeMinutes: number | null;
}

