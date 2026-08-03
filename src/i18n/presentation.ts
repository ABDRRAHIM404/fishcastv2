import type { Locale } from '@/i18n/config';
import { formatMeasurement, formatNumber, formatScore } from '@/i18n/formatting';
import type { Translator } from '@/i18n/types';
import type {
  ForecastDataQuality,
  ForecastPeriod,
} from '@/lib/forecast-ui/types';
import type { SafetyStatus, SafetyWarning } from '@/lib/safety/types';
import type { WindRelationship } from '@/lib/spots/exposure';
import type { ConfidenceLabel, ForecastInputKey } from '@/types/forecast';
import type {
  SeaState,
  TideState,
  TideTrend,
} from '@/types/marine';
import type { DifficultyLevel, SpotType } from '@/types/spot';
import type { Prevalence, PreferredConditions } from '@/types/species';
import type { WindowLabel } from '@/lib/timeline/types';
import { compassLabel } from '@/lib/forecast-ui/labels';

const COMPASS_TRANSLATION_KEYS = {
  N: 'direction.n',
  NE: 'direction.ne',
  E: 'direction.e',
  SE: 'direction.se',
  S: 'direction.s',
  SW: 'direction.sw',
  W: 'direction.w',
  NW: 'direction.nw',
} as const;

export function compassDirectionLabel(
  t: Translator,
  degrees: number | null
): string {
  const direction = compassLabel(degrees);
  const key = COMPASS_TRANSLATION_KEYS[
    direction as keyof typeof COMPASS_TRANSLATION_KEYS
  ];
  return key ? t(key) : '—';
}

export function fishingStatus(t: Translator, value: WindowLabel): string {
  if (value === 'Excellent') return t('status.fishing.excellent');
  if (value === 'Good') return t('status.fishing.good');
  if (value === 'Moderate') return t('status.fishing.moderate');
  return t('status.fishing.poor');
}

export function safetyStatus(t: Translator, value: SafetyStatus): string {
  if (value === 'Safe') return t('status.safety.safe');
  if (value === 'Caution') return t('status.safety.caution');
  if (value === 'Dangerous') return t('status.safety.dangerous');
  return t('status.safety.unknown');
}

export function confidenceStatus(t: Translator, value: ConfidenceLabel): string {
  if (value === 'high') return t('status.confidence.high');
  if (value === 'medium') return t('status.confidence.medium');
  return t('status.confidence.low');
}

export function tideStatus(t: Translator, value: TideTrend | null): string {
  if (value === 'rising') return t('status.tide.rising');
  if (value === 'falling') return t('status.tide.falling');
  if (value === 'slack') return t('status.tide.slack');
  return t('common.unavailable');
}

export function tideExtremeStatus(t: Translator, value: TideState | null): string {
  if (value === 'high') return t('status.tide.high');
  if (value === 'low') return t('status.tide.low');
  return t('common.unavailable');
}

export function windRelationshipStatus(t: Translator, value: WindRelationship): string {
  if (value === 'onshore') return t('status.wind.onshore');
  if (value === 'offshore') return t('status.wind.offshore');
  if (value === 'cross-shore') return t('status.wind.cross-shore');
  return t('status.wind.unknown');
}

export function dataQualityStatus(t: Translator, value: ForecastDataQuality): string {
  if (value === 'provider') return t('status.data.provider');
  if (value === 'interpolated') return t('status.data.interpolated');
  if (value === 'aggregated') return t('status.data.aggregated');
  if (value === 'mixed') return t('status.data.mixed');
  return t('status.data.unavailable');
}

export function daylightStatus(
  t: Translator,
  value: 'daylight' | 'civil-twilight' | 'night' | 'unknown'
): string {
  if (value === 'daylight') return t('status.light.daylight');
  if (value === 'civil-twilight') return t('status.light.civilTwilight');
  if (value === 'night') return t('status.light.night');
  return t('status.light.unknown');
}

export function weatherStatus(t: Translator, code: number | null): string {
  if (code === null) return t('common.unavailable');
  if (code === 0) return t('status.weather.clear');
  if (code <= 3) return t('status.weather.partlyCloudy');
  if (code === 45 || code === 48) return t('status.weather.fog');
  if (code >= 95) return t('status.weather.thunderstorm');
  if (code >= 80) return t('status.weather.showers');
  if (code >= 51) return t('status.weather.rain');
  return t('status.weather.variable');
}

export function windBand(t: Translator, speedKmh: number | null): string {
  if (speedKmh === null) return t('status.band.unavailable');
  if (speedKmh <= 12) return t('status.band.light');
  if (speedKmh <= 20) return t('status.band.moderate');
  if (speedKmh <= 30) return t('status.band.fresh');
  if (speedKmh <= 40) return t('status.band.strong');
  return t('status.band.veryStrong');
}

export function gustBand(t: Translator, gustKmh: number | null): string {
  if (gustKmh === null) return t('status.band.unavailable');
  if (gustKmh <= 20) return t('status.band.lightGusts');
  if (gustKmh <= 35) return t('status.band.moderateGusts');
  if (gustKmh <= 50) return t('status.band.strongGusts');
  return t('status.band.severeGusts');
}

export function seaStateStatus(
  t: Translator,
  heightM: number | null,
  seaState?: SeaState
): string {
  if (heightM === null) return t('status.band.unavailable');
  const value = seaState === 'unknown' || !seaState
    ? heightM < 0.5
      ? 'calm'
      : heightM < 1.25
        ? 'slight'
        : heightM < 2.5
          ? 'moderate'
          : heightM < 4
            ? 'rough'
            : 'very-rough'
    : seaState;
  if (value === 'calm') return t('status.band.calm');
  if (value === 'slight') return t('status.band.slight');
  if (value === 'moderate') return t('status.band.moderate');
  if (value === 'rough') return t('status.band.rough');
  return t('status.band.veryRough');
}

export function wavePeriodBand(t: Translator, periodS: number | null): string {
  if (periodS === null) return t('status.band.unavailable');
  if (periodS < 6) return t('status.band.shortPeriod');
  if (periodS < 10) return t('status.band.moderatePeriod');
  if (periodS < 12) return t('status.band.energetic');
  if (periodS < 15) return t('status.band.longPeriod');
  return t('status.band.veryLongPeriod');
}

export function tideMovementBand(
  t: Translator,
  trend: TideTrend | null,
  rateMPerHour: number | null
): string {
  if (trend === null) return t('status.band.unavailable');
  if (trend === 'slack') return t('status.band.slackWater');
  if (rateMPerHour === null) return t('status.band.movementEstimated');
  const rate = Math.abs(rateMPerHour);
  if (rate < 0.08) return t('status.band.gentleMovement');
  if (rate < 0.25) return t('status.band.moderateMovement');
  return t('status.band.strongMovement');
}

export function pressureTrendStatus(t: Translator, value: number | null): string {
  if (value === null) return t('status.band.trendUnavailable');
  if (value <= -0.2) return t('status.band.falling');
  if (value >= 0.2) return t('status.band.rising');
  return t('status.band.steady');
}

export function inputLabel(t: Translator, key: ForecastInputKey): string {
  const labels: Record<ForecastInputKey, string> = {
    windSpeed: t('input.windSpeed'),
    windGusts: t('input.windGusts'),
    windDirection: t('input.windDirection'),
    waveHeight: t('input.waveHeight'),
    waveDirection: t('input.waveDirection'),
    wavePeriod: t('input.wavePeriod'),
    swellHeight: t('input.swellHeight'),
    swellDirection: t('input.swellDirection'),
    swellPeriod: t('input.swellPeriod'),
    modelledTide: t('input.modelledTide'),
    weather: t('input.weather'),
    pressure: t('input.pressure'),
    temperature: t('input.temperature'),
    daylight: t('input.daylight'),
  };
  return labels[key];
}

export function spotTypeLabel(t: Translator, value: SpotType): string {
  return t(`spot.type.${value}`);
}

export function difficultyLabel(t: Translator, value: DifficultyLevel): string {
  return t(`spot.difficulty.${value}`);
}

export function prevalenceLabel(t: Translator, value: Prevalence): string {
  return t(`species.prevalence.${value}`);
}

export function preferredConditionsSummary(
  t: Translator,
  locale: Locale,
  conditions: PreferredConditions | null
): string | null {
  if (!conditions) return null;
  const parts: string[] = [];
  if (conditions.tide_state) {
    const state = conditions.tide_state === 'rising' || conditions.tide_state === 'falling'
      ? tideStatus(t, conditions.tide_state)
      : conditions.tide_state === 'high' || conditions.tide_state === 'low'
        ? tideExtremeStatus(t, conditions.tide_state)
        : conditions.tide_state;
    parts.push(t('species.preferred.tide', { state }));
  }
  if (typeof conditions.wind_max_kmh === 'number') {
    parts.push(t('species.preferred.wind', {
      value: formatMeasurement(locale, conditions.wind_max_kmh, 'km/h'),
    }));
  }
  if (typeof conditions.wave_max_m === 'number') {
    parts.push(t('species.preferred.waves', {
      value: formatMeasurement(locale, conditions.wave_max_m, 'm', 1),
    }));
  }
  if (conditions.time_of_day?.length) parts.push(conditions.time_of_day.join('/'));
  return parts.length ? parts.join(' · ') : null;
}

function warningValue(
  locale: Locale,
  warning: SafetyWarning,
  period: ForecastPeriod | null
): string {
  if (!period) return '—';
  if (warning.code.includes('wave-height')) return formatMeasurement(locale, period.waves.heightM, 'm', 1);
  if (warning.code === 'long-period-swell') {
    const value = Math.max(period.waves.periodS ?? 0, period.waves.swellPeriodS ?? 0);
    return formatMeasurement(locale, value || null, 's');
  }
  if (warning.code.includes('swell-height')) return formatMeasurement(locale, period.waves.swellHeightM, 'm', 1);
  if (warning.code.includes('wave-power')) return formatMeasurement(locale, period.waves.derived.estimatedPowerKwPerM, 'kW/m', 1);
  if (warning.code === 'strong-wind') return formatMeasurement(locale, period.wind.speedKmh, 'km/h');
  if (warning.code.includes('gusts')) return formatMeasurement(locale, period.wind.gustKmh, 'km/h');
  if (warning.code.includes('visibility')) return formatMeasurement(locale, period.weather.visibilityM, 'm');
  return '—';
}

export function safetyWarningText(
  t: Translator,
  locale: Locale,
  warning: SafetyWarning | null,
  period: ForecastPeriod | null
): string {
  if (!warning) return t('safety.noActiveWarning');
  const value = warningValue(locale, warning, period);
  switch (warning.code) {
    case 'dangerous-wave-height': return t('safety.warning.dangerous-wave-height', { value });
    case 'elevated-wave-height': return t('safety.warning.elevated-wave-height', { value });
    case 'long-period-swell': return warning.severity === 'critical'
      ? t('safety.warning.long-period-swell', { value })
      : t('safety.warning.long-period-swell-caution', { value });
    case 'dangerous-swell-height': return t('safety.warning.dangerous-swell-height', { value });
    case 'elevated-swell-height': return t('safety.warning.elevated-swell-height', { value });
    case 'head-on-swell': return t('safety.warning.head-on-swell');
    case 'high-wave-power': return t('safety.warning.high-wave-power', { value });
    case 'elevated-wave-power': return t('safety.warning.elevated-wave-power', { value });
    case 'steep-waves': return warning.severity === 'critical'
      ? t('safety.warning.steep-waves-critical')
      : t('safety.warning.steep-waves');
    case 'crossing-swell': return warning.severity === 'critical'
      ? t('safety.warning.crossing-swell-critical')
      : t('safety.warning.crossing-swell');
    case 'strong-wind': return warning.severity === 'critical'
      ? t('safety.warning.strong-wind-critical', { value })
      : t('safety.warning.strong-wind', { value });
    case 'offshore-wind': return t('safety.warning.offshore-wind');
    case 'dangerous-gusts': return t('safety.warning.dangerous-gusts', { value });
    case 'strong-gusts': return t('safety.warning.strong-gusts', { value });
    case 'thunderstorm': return t('safety.warning.thunderstorm');
    case 'heavy-rain': return warning.severity === 'critical'
      ? t('safety.warning.heavy-rain-critical')
      : t('safety.warning.heavy-rain');
    case 'poor-visibility': return t('safety.warning.poor-visibility', { value });
    case 'reduced-visibility': return t('safety.warning.reduced-visibility', { value });
    case 'large-tidal-range': return warning.severity === 'critical'
      ? t('safety.warning.large-tidal-range-critical')
      : t('safety.warning.large-tidal-range');
    case 'rising-tide-access': return t('safety.warning.rising-tide-access');
    case 'difficult-terrain-at-night': return t('safety.warning.difficult-terrain-at-night');
    case 'static-spot-hazard': return t('safety.warning.static-spot-hazard');
    default: return t('safety.warning.fallback');
  }
}

export function primarySafetyWarning(
  t: Translator,
  locale: Locale,
  period: ForecastPeriod | null,
  status: SafetyStatus
): string {
  const warning = period?.safety.warnings.find((item) => item.severity === 'critical')
    ?? period?.safety.warnings[0]
    ?? null;
  if (warning) return safetyWarningText(t, locale, warning, period);
  if (status === 'Safe') return t('safety.noActiveWarning');
  return t('safety.missingCritical');
}

export function periodRecommendation(
  t: Translator,
  locale: Locale,
  period: ForecastPeriod
): string {
  if (period.safety.status === 'Dangerous' || period.safety.status === 'Caution') {
    return primarySafetyWarning(t, locale, period, period.safety.status);
  }
  if (period.safety.status === 'Unknown') return t('safety.missingCritical');
  if (period.confidence.missingCriticalInputs.length) return t('insight.missingInputs', {
    inputs: period.confidence.missingCriticalInputs.map((key) => inputLabel(t, key)).join(', '),
  });
  return t('insight.qualityReason', {
    label: fishingStatus(t, period.fishing.label),
    score: formatScore(locale, period.fishing.score),
    wind: period.wind.speedKmh === null
      ? t('insight.windUnavailable')
      : t('insight.windValue', { value: formatMeasurement(locale, period.wind.speedKmh, 'km/h') }),
    waves: period.waves.heightM === null
      ? t('insight.wavesUnavailable')
      : t('insight.wavesValue', { value: formatMeasurement(locale, period.waves.heightM, 'm', 1) }),
  });
}

export function providerAvailabilityMessage(
  t: Translator,
  timestamps: { forecastFetchedAt: string | null; marineFetchedAt: string | null }
): string | null {
  if (timestamps.forecastFetchedAt && timestamps.marineFetchedAt) return null;
  if (timestamps.forecastFetchedAt) return t('forecast.providerMarineMissing');
  if (timestamps.marineFetchedAt) return t('forecast.providerWeatherMissing');
  return t('forecast.providerAllMissing');
}

export function forecastCacheLabel(
  t: Translator,
  refreshing: boolean,
  ageMinutes: number | null,
  refreshFailed: boolean
): string | null {
  if (!refreshing && !refreshFailed) return null;
  const cache = ageMinutes === null
    ? t('forecast.cached')
    : t('forecast.cachedAge', { minutes: ageMinutes });
  return refreshing
    ? t('forecast.refreshing', { cache })
    : t('forecast.refreshFailedWithCache', { cache });
}

export function formatBearing(locale: Locale, degrees: number | null): string {
  return degrees === null ? '—' : `${formatNumber(locale, Math.round(degrees))}°`;
}
