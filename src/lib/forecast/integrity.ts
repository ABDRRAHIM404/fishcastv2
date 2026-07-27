import type {
  ConfidenceLabel,
  ForecastInputKey,
  ForecastInputStatus,
  ForecastIntegrity,
  InputAvailability,
  InputProvenance,
} from '@/types/forecast';
import type { MarineConditions } from '@/types/marine';

const INPUT_LABELS: Record<ForecastInputKey, string> = {
  windSpeed: 'Wind speed',
  windGusts: 'Wind gusts',
  windDirection: 'Wind direction',
  waveHeight: 'Wave height',
  waveDirection: 'Wave direction',
  wavePeriod: 'Wave period',
  swellHeight: 'Swell height',
  swellDirection: 'Swell direction',
  swellPeriod: 'Swell period',
  modelledTide: 'Modelled tide',
  weather: 'Weather',
  pressure: 'Pressure',
  temperature: 'Temperature',
  daylight: 'Daylight information',
};

export const FORECAST_INPUT_KEYS = Object.keys(
  INPUT_LABELS
) as ForecastInputKey[];

/** Primary integrity gaps that prevent high-confidence coastal guidance. */
export const CRITICAL_FORECAST_INPUTS = new Set<ForecastInputKey>([
  'windSpeed',
  'waveHeight',
  'wavePeriod',
  'modelledTide',
]);

const STALE_AFTER_MINUTES = 120;

export interface IntegrityAssessmentOptions {
  evaluatedAt?: string;
  defaultAvailability?: Extract<
    InputAvailability,
    'available' | 'interpolated'
  >;
  availability?: Partial<Record<ForecastInputKey, InputAvailability>>;
  provenance?: Partial<Record<ForecastInputKey, InputProvenance>>;
}

interface InputValue {
  present: boolean;
  sourceTimestamp: string | null;
  fetchedAt: string | null;
  defaultProvenance: InputProvenance;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function inputsFrom(marine: MarineConditions): Record<
  ForecastInputKey,
  InputValue
> {
  const weather = marine.weather.status === 'ok' ? marine.weather : null;
  const wind = marine.wind.status === 'ok' ? marine.wind : null;
  const waves = marine.waves.status === 'ok' ? marine.waves : null;
  const tide = marine.tide.status === 'ok' ? marine.tide : null;
  const astronomy =
    marine.astronomy?.status === 'ok' ? marine.astronomy : null;

  const from = (
    present: boolean,
    sourceTimestamp: string | null,
    fetchedAt: string | null,
    defaultProvenance: InputProvenance = 'provider'
  ): InputValue => ({
    present,
    sourceTimestamp,
    fetchedAt,
    defaultProvenance,
  });

  const weatherTime = weather?.data.observedAt ?? null;
  const windTime = wind?.data.observedAt ?? null;
  const waveTime = waves?.data.observedAt ?? null;
  const tideTime = tide?.data.observedAt ?? null;
  const daylightTime = astronomy?.data.observedAt ?? null;

  return {
    windSpeed: from(
      isNumber(wind?.data.speedKmh),
      windTime,
      wind?.cachedAt ?? null
    ),
    windGusts: from(
      isNumber(wind?.data.gustKmh),
      windTime,
      wind?.cachedAt ?? null
    ),
    windDirection: from(
      isNumber(wind?.data.directionDeg),
      windTime,
      wind?.cachedAt ?? null
    ),
    waveHeight: from(
      isNumber(waves?.data.waveHeightM),
      waveTime,
      waves?.cachedAt ?? null
    ),
    waveDirection: from(
      isNumber(waves?.data.waveDirectionDeg),
      waveTime,
      waves?.cachedAt ?? null
    ),
    wavePeriod: from(
      isNumber(waves?.data.wavePeriodS),
      waveTime,
      waves?.cachedAt ?? null
    ),
    swellHeight: from(
      isNumber(waves?.data.swellHeightM),
      waveTime,
      waves?.cachedAt ?? null
    ),
    swellDirection: from(
      isNumber(waves?.data.swellDirectionDeg),
      waveTime,
      waves?.cachedAt ?? null
    ),
    swellPeriod: from(
      isNumber(waves?.data.swellPeriodS),
      waveTime,
      waves?.cachedAt ?? null
    ),
    modelledTide: from(
      isNumber(tide?.data.heightM) && tide?.data.trend !== null,
      tideTime,
      tide?.cachedAt ?? null
    ),
    weather: from(
      isNumber(weather?.data.precipitationMm) ||
        isNumber(weather?.data.cloudCoverPct) ||
        isNumber(weather?.data.weatherCode),
      weatherTime,
      weather?.cachedAt ?? null
    ),
    pressure: from(
      isNumber(weather?.data.pressureMb),
      weatherTime,
      weather?.cachedAt ?? null
    ),
    temperature: from(
      isNumber(weather?.data.temperatureC),
      weatherTime,
      weather?.cachedAt ?? null
    ),
    daylight: from(
      astronomy?.data.daylightState !== undefined &&
        astronomy.data.daylightState !== 'unknown',
      daylightTime,
      astronomy?.cachedAt ?? null,
      'calculated'
    ),
  };
}

function minutesOld(
  fetchedAt: string | null,
  evaluatedAtMs: number
): number | null {
  if (!fetchedAt) return null;
  const fetchedMs = new Date(fetchedAt).getTime();
  if (Number.isNaN(fetchedMs)) return null;
  return Math.max(0, Math.round((evaluatedAtMs - fetchedMs) / 60_000));
}

function confidenceFor(
  completenessPercentage: number,
  missingCriticalInputs: ForecastInputKey[],
  staleInputs: ForecastInputKey[]
): ConfidenceLabel {
  if (
    missingCriticalInputs.length > 0 ||
    completenessPercentage < 65
  ) {
    return 'low';
  }
  // Interpolated values contribute 85%, so a fully interpolated timeline
  // point remains medium-confidence rather than being presented as equivalent
  // to a complete native provider anchor.
  if (completenessPercentage >= 95 && staleInputs.length === 0) return 'high';
  return 'medium';
}

/**
 * Deterministic forecast-integrity assessment. Interpolated values contribute
 * 85%, stale values 25%, and missing values 0% to completeness.
 */
export function assessForecastIntegrity(
  marine: MarineConditions,
  options: IntegrityAssessmentOptions = {}
): ForecastIntegrity {
  const evaluatedAtMs = new Date(
    options.evaluatedAt ?? marine.generatedAt
  ).getTime();
  const safeEvaluatedAtMs = Number.isNaN(evaluatedAtMs)
    ? 0
    : evaluatedAtMs;
  const values = inputsFrom(marine);
  const defaultAvailability = options.defaultAvailability ?? 'available';

  const inputs: ForecastInputStatus[] = FORECAST_INPUT_KEYS.map((key) => {
    const value = values[key];
    const ageMinutes = minutesOld(value.fetchedAt, safeEvaluatedAtMs);
    let availability: InputAvailability;
    if (!value.present) {
      availability = 'missing';
    } else {
      availability = options.availability?.[key] ?? defaultAvailability;
      if (
        availability !== 'missing' &&
        value.defaultProvenance !== 'calculated' &&
        ageMinutes !== null &&
        ageMinutes > STALE_AFTER_MINUTES
      ) {
        availability = 'stale';
      }
    }

    const provenance =
      availability === 'missing'
        ? null
        : options.provenance?.[key] ??
          (availability === 'interpolated'
            ? 'interpolation'
            : value.defaultProvenance);

    return {
      key,
      label: INPUT_LABELS[key],
      availability,
      provenance,
      critical: CRITICAL_FORECAST_INPUTS.has(key),
      sourceTimestamp: value.sourceTimestamp,
      ageMinutes,
    };
  });

  const contribution: Record<InputAvailability, number> = {
    available: 1,
    interpolated: 0.85,
    stale: 0.25,
    missing: 0,
  };
  const completenessPercentage = Math.round(
    (inputs.reduce(
      (sum, input) => sum + contribution[input.availability],
      0
    ) /
      inputs.length) *
      100
  );
  const missingInputs = inputs
    .filter((input) => input.availability === 'missing')
    .map((input) => input.key);
  const missingCriticalInputs = inputs
    .filter(
      (input) =>
        input.critical &&
        (input.availability === 'missing' ||
          input.availability === 'stale')
    )
    .map((input) => input.key);
  const staleInputs = inputs
    .filter((input) => input.availability === 'stale')
    .map((input) => input.key);
  const ages = inputs
    .map((input) => input.ageMinutes)
    .filter((age): age is number => age !== null);

  return {
    completenessPercentage,
    confidence: confidenceFor(
      completenessPercentage,
      missingCriticalInputs,
      staleInputs
    ),
    missingInputs,
    missingCriticalInputs,
    staleInputs,
    inputs,
    sourceTimestamps: {
      weather:
        marine.weather.status === 'ok'
          ? marine.weather.data.observedAt
          : null,
      wind:
        marine.wind.status === 'ok' ? marine.wind.data.observedAt : null,
      waves:
        marine.waves.status === 'ok' ? marine.waves.data.observedAt : null,
      tide:
        marine.tide.status === 'ok' ? marine.tide.data.observedAt : null,
      daylight:
        marine.astronomy?.status === 'ok'
          ? marine.astronomy.data.observedAt
          : null,
    },
    forecastAgeMinutes: ages.length > 0 ? Math.max(...ages) : null,
  };
}
