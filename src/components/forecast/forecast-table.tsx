'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Maximize2, Minimize2, Star } from 'lucide-react';
import { ForecastHelp, type ForecastHelpKey } from '@/components/forecast/forecast-help';
import { Button } from '@/components/ui/button';
import { directionArrowFrom } from '@/lib/forecast-ui/labels';
import {
  FORECAST_TABLE_GROUPS,
  parseForecastTablePreference,
  type ForecastTableGroup,
  type ForecastTableMode,
} from '@/lib/forecast-ui/preferences';
import type { ForecastPeriod } from '@/lib/forecast-ui/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';
import { formatDayLabel, formatMeasurement, formatNumber, formatPercentage, formatScore, formatTime } from '@/i18n/formatting';
import {
  compassDirectionLabel,
  confidenceStatus,
  dataQualityStatus,
  daylightStatus,
  fishingStatus,
  gustBand,
  inputLabel,
  periodRecommendation,
  pressureTrendStatus,
  safetyStatus,
  safetyWarningText,
  seaStateStatus,
  tideExtremeStatus,
  tideMovementBand,
  tideStatus,
  weatherStatus,
  wavePeriodBand,
  windBand,
  windRelationshipStatus,
} from '@/i18n/presentation';
import type { Locale } from '@/i18n/config';
import type { Translator, TranslationKey } from '@/i18n/types';

const TABLE_PREFERENCE_KEY = 'fishcast:forecast-table:v1';

interface RowDefinition {
  id: string;
  group: ForecastTableGroup;
  label: string;
  compact: boolean;
  helpKey?: ForecastHelpKey;
  render: (period: ForecastPeriod) => { value: string; detail?: string };
}

function rowsFor(t: Translator, locale: Locale): RowDefinition[] {
  const missing = (period: ForecastPeriod) => ({
    value: period.confidence.missingInputs.length
      ? period.confidence.missingInputs.map((key) => inputLabel(t, key)).join(', ')
      : t('table.none'),
    detail: period.confidence.missingCriticalInputs.length
      ? t('table.critical', {
          inputs: period.confidence.missingCriticalInputs.map((key) => inputLabel(t, key)).join(', '),
        })
      : t('table.noCriticalMissing'),
  });
  const warning = (period: ForecastPeriod) => ({
    value: period.safety.warnings[0]
      ? safetyWarningText(t, locale, period.safety.warnings[0], period)
      : t('table.noActiveWarning'),
    detail: period.safety.warnings.length
      ? t('table.warningCount', { count: period.safety.warnings.length })
      : t('table.noSafetyWarning'),
  });

  return [
    { id: 'score', group: 'fishing', label: t('table.row.score'), compact: true, render: (p) => ({ value: formatScore(locale, p.fishing.score), detail: fishingStatus(t, p.fishing.label) }) },
    { id: 'confidence', group: 'fishing', label: t('table.row.confidence'), compact: true, helpKey: 'confidence', render: (p) => ({ value: formatPercentage(locale, p.confidence.completenessPercentage), detail: t('conditions.confidence', { label: confidenceStatus(t, p.confidence.label) }) }) },
    { id: 'fishing-context', group: 'fishing', label: t('table.row.mainConditions'), compact: false, render: (p) => ({ value: `${windBand(t, p.wind.speedKmh)} · ${t('conditions.wind')}`, detail: `${seaStateStatus(t, p.waves.heightM, p.waves.derived.seaState)} · ${wavePeriodBand(t, p.waves.periodS)}` }) },
    { id: 'species', group: 'fishing', label: t('table.row.bestSpecies'), compact: false, render: (p) => ({ value: p.bestSpecies ?? t('timeline.notAvailable'), detail: p.bestSpecies ? t('table.detail.matchedSeason') : t('table.detail.noMatch') }) },
    { id: 'technique', group: 'fishing', label: t('table.row.technique'), compact: false, render: () => ({ value: t('timeline.notAvailable'), detail: t('table.detail.noTechnique') }) },
    { id: 'fishing-missing', group: 'fishing', label: t('table.row.missingInputs'), compact: false, render: missing },
    { id: 'note', group: 'fishing', label: t('table.row.recommendation'), compact: true, render: (p) => ({ value: periodRecommendation(t, locale, p), detail: t('table.detail.deterministic') }) },
    { id: 'safety', group: 'safety', label: t('table.row.safetyStatus'), compact: true, render: (p) => ({ value: safetyStatus(t, p.safety.status), detail: p.safety.warnings[0] ? safetyWarningText(t, locale, p.safety.warnings[0], p) : t('table.noActiveWarning') }) },
    { id: 'safety-score', group: 'safety', label: t('table.row.safetyScore'), compact: false, render: (p) => ({ value: p.safety.score === null ? '—' : formatScore(locale, p.safety.score), detail: p.safety.containsDangerous ? t('table.detail.containsDangerous') : t('table.detail.worstState') }) },
    { id: 'safety-warning', group: 'safety', label: t('table.row.mainReasons'), compact: false, render: warning },
    { id: 'safety-confidence', group: 'safety', label: t('table.row.confidence'), compact: false, helpKey: 'confidence', render: (p) => ({ value: formatPercentage(locale, p.confidence.completenessPercentage), detail: t('conditions.confidence', { label: confidenceStatus(t, p.confidence.label) }) }) },
    { id: 'safety-missing', group: 'safety', label: t('table.row.missingInputs'), compact: false, render: missing },
    { id: 'quality', group: 'safety', label: t('table.row.valueSource'), compact: false, helpKey: 'interpolated', render: (p) => ({ value: dataQualityStatus(t, p.dataQuality), detail: t('table.detail.safetyChecked') }) },
    { id: 'safety-recommendation', group: 'safety', label: t('table.row.recommendation'), compact: false, render: (p) => ({ value: p.safety.status === 'Safe' ? t('table.detail.continueChecks') : periodRecommendation(t, locale, p), detail: p.safety.status === 'Safe' ? t('table.detail.verifyShore') : t('table.detail.safetyOverrides') }) },
    { id: 'wind', group: 'wind', label: t('conditions.wind'), compact: true, helpKey: 'windRelationship', render: (p) => ({ value: formatMeasurement(locale, p.wind.speedKmh, 'km/h'), detail: `${windBand(t, p.wind.speedKmh)} · ${windRelationshipStatus(t, p.wind.relationship)}` }) },
    { id: 'gust', group: 'wind', label: t('conditions.gusts'), compact: true, render: (p) => ({ value: formatMeasurement(locale, p.wind.gustKmh, 'km/h'), detail: gustBand(t, p.wind.gustKmh) }) },
    { id: 'wind-direction', group: 'wind', label: t('table.row.direction'), compact: false, render: (p) => ({ value: `${directionArrowFrom(p.wind.directionDeg)} ${compassDirectionLabel(t, p.wind.directionDeg)}`, detail: p.wind.directionDeg === null ? t('common.unavailable') : t('table.detail.fromBearing', { degrees: formatNumber(locale, Math.round(p.wind.directionDeg)) }) }) },
    { id: 'wave-height', group: 'waves', label: t('table.row.waveHeight'), compact: true, render: (p) => ({ value: formatMeasurement(locale, p.waves.heightM, 'm', 1), detail: seaStateStatus(t, p.waves.heightM, p.waves.derived.seaState) }) },
    { id: 'wave-period', group: 'waves', label: t('table.row.wavePeriod'), compact: true, helpKey: 'wavePeriod', render: (p) => ({ value: formatMeasurement(locale, p.waves.periodS, 's', 1), detail: wavePeriodBand(t, p.waves.periodS) }) },
    { id: 'wave-direction', group: 'waves', label: t('table.row.waveDirection'), compact: false, render: (p) => ({ value: `${directionArrowFrom(p.waves.directionDeg)} ${compassDirectionLabel(t, p.waves.directionDeg)}`, detail: p.waves.directionDeg === null ? t('common.unavailable') : t('table.detail.fromBearing', { degrees: formatNumber(locale, Math.round(p.waves.directionDeg)) }) }) },
    { id: 'swell', group: 'waves', label: t('conditions.primarySwell'), compact: false, helpKey: 'swell', render: (p) => ({ value: formatMeasurement(locale, p.waves.swellHeightM, 'm', 1), detail: `${formatMeasurement(locale, p.waves.swellPeriodS, 's', 1)} · ${compassDirectionLabel(t, p.waves.swellDirectionDeg)}` }) },
    { id: 'secondary-swell', group: 'waves', label: t('conditions.secondarySwell'), compact: false, helpKey: 'crossingSwell', render: (p) => ({ value: formatMeasurement(locale, p.waves.secondarySwellHeightM, 'm', 1), detail: p.waves.derived.crossingSwell ? t('conditions.crossingWarning') : `${formatMeasurement(locale, p.waves.secondarySwellPeriodS, 's', 1)} · ${compassDirectionLabel(t, p.waves.secondarySwellDirectionDeg)}` }) },
    { id: 'power', group: 'waves', label: t('conditions.wavePower'), compact: false, helpKey: 'wavePower', render: (p) => ({ value: formatMeasurement(locale, p.waves.derived.estimatedPowerKwPerM, 'kW/m', 1), detail: t('table.detail.deepWater') }) },
    { id: 'wavelength', group: 'waves', label: t('table.row.wavelength'), compact: false, helpKey: 'wavelength', render: (p) => ({ value: formatMeasurement(locale, p.waves.derived.estimatedWavelengthM, 'm'), detail: t('table.detail.estimatedSpacing') }) },
    { id: 'steepness', group: 'waves', label: t('table.row.steepness'), compact: false, helpKey: 'steepness', render: (p) => ({ value: formatNumber(locale, p.waves.derived.estimatedSteepness, { minimumFractionDigits: 3, maximumFractionDigits: 3 }), detail: t('table.detail.ratio') }) },
    { id: 'tide', group: 'tide', label: t('conditions.tide'), compact: true, helpKey: 'modelledTide', render: (p) => ({ value: formatMeasurement(locale, p.tide.heightM, 'm', 2), detail: `${tideStatus(t, p.tide.trend)} · ${tideMovementBand(t, p.tide.trend, p.tide.rateMPerHour)}` }) },
    { id: 'tide-next', group: 'tide', label: t('table.row.nextExtreme'), compact: false, helpKey: 'modelledTide', render: (p) => ({ value: tideExtremeStatus(t, p.tide.nextExtremeState), detail: p.tide.minutesToNextExtreme === null ? t('table.detail.noExtreme') : `${t('common.hoursMinutes', { hours: Math.floor(p.tide.minutesToNextExtreme / 60), minutes: p.tide.minutesToNextExtreme % 60 })} · ${p.tide.nextExtremeTime ? formatTime(locale, p.tide.nextExtremeTime) : t('table.detail.timeUnavailable')}` }) },
    { id: 'tide-range', group: 'tide', label: t('table.row.dailyRange'), compact: false, helpKey: 'modelledTide', render: (p) => ({ value: formatMeasurement(locale, p.tide.dailyRangeM, 'm', 2), detail: t('table.detail.dailyDifference') }) },
    { id: 'temperature', group: 'environment', label: t('conditions.temperature'), compact: false, render: (p) => ({ value: formatMeasurement(locale, p.weather.temperatureC, '°C', 1), detail: weatherStatus(t, p.weather.weatherCode) }) },
    { id: 'pressure', group: 'environment', label: t('conditions.pressure'), compact: false, render: (p) => ({ value: formatMeasurement(locale, p.weather.pressureMb, 'hPa'), detail: pressureTrendStatus(t, p.weather.pressureTrendMbPerHr) }) },
    { id: 'rain', group: 'environment', label: t('graph.precipitation'), compact: false, render: (p) => ({ value: formatMeasurement(locale, p.weather.precipitationMm, 'mm', 1), detail: weatherStatus(t, p.weather.weatherCode) }) },
    { id: 'cloud', group: 'environment', label: t('table.row.cloudCover'), compact: false, render: (p) => ({ value: formatMeasurement(locale, p.weather.cloudCoverPct, '%'), detail: weatherStatus(t, p.weather.weatherCode) }) },
    { id: 'visibility', group: 'environment', label: t('graph.visibility'), compact: false, render: (p) => ({ value: p.weather.visibilityM === null ? '—' : formatMeasurement(locale, p.weather.visibilityM / 1000, 'km', 1), detail: t('table.detail.modelForecast') }) },
    { id: 'sea-temperature', group: 'environment', label: t('table.row.seaTemperature'), compact: false, render: (p) => ({ value: formatMeasurement(locale, p.environment.seaSurfaceTemperatureC, '°C', 1), detail: t('table.detail.seaSurface') }) },
    { id: 'current', group: 'environment', label: t('table.row.oceanCurrent'), compact: false, render: (p) => ({ value: formatMeasurement(locale, p.environment.oceanCurrentVelocityKmh, 'km/h', 1), detail: p.environment.oceanCurrentDirectionDeg === null ? t('conditions.directionUnavailable') : t('conditions.towards', { degrees: formatNumber(locale, Math.round(p.environment.oceanCurrentDirectionDeg)) }) }) },
    { id: 'daylight', group: 'environment', label: t('table.row.daylight'), compact: false, render: (p) => ({ value: daylightStatus(t, p.environment.daylightState), detail: p.markers.sunrise ? t('table.detail.sunriseInterval') : p.markers.sunset ? t('table.detail.sunsetInterval') : t('table.detail.solarState') }) },
  ];
}

const GROUP_KEYS: Readonly<Record<ForecastTableGroup, TranslationKey>> = {
  fishing: 'table.group.fishing',
  safety: 'table.group.safety',
  wind: 'table.group.wind',
  waves: 'table.group.waves',
  tide: 'table.group.tide',
  environment: 'table.group.environment',
};

function groupSummary(t: Translator, locale: Locale, group: ForecastTableGroup, period: ForecastPeriod | undefined): string {
  if (!period) return t('table.noSelected');
  if (group === 'fishing') return `${formatScore(locale, period.fishing.score)} · ${fishingStatus(t, period.fishing.label)}`;
  if (group === 'safety') return safetyStatus(t, period.safety.status);
  if (group === 'wind') return `${formatMeasurement(locale, period.wind.speedKmh, 'km/h')} · ${formatMeasurement(locale, period.wind.gustKmh, 'km/h')}`;
  if (group === 'waves') return `${formatMeasurement(locale, period.waves.heightM, 'm', 1)} · ${formatMeasurement(locale, period.waves.periodS, 's', 1)}`;
  if (group === 'tide') return `${formatMeasurement(locale, period.tide.heightM, 'm', 2)} · ${tideStatus(t, period.tide.trend)}`;
  return `${formatMeasurement(locale, period.weather.temperatureC, '°C', 1)} · ${weatherStatus(t, period.weather.weatherCode)}`;
}

function sourceMarker(t: Translator, period: ForecastPeriod): string {
  if (period.dataQuality === 'provider') return t('table.marker.provider');
  if (period.dataQuality === 'interpolated') return t('table.marker.estimated');
  if (period.dataQuality === 'aggregated') return t('table.marker.aggregated');
  if (period.dataQuality === 'mixed') return t('table.marker.mixed');
  return '—';
}

export function ForecastTable({ periods, selectedTimestamp, onSelectTimestamp }: { periods: ForecastPeriod[]; selectedTimestamp: string | null; onSelectTimestamp: (timestamp: string) => void }) {
  const { direction, locale, t } = useI18n();
  const [preference, setPreference] = useState<{ mode: ForecastTableMode; expandedGroups: Set<ForecastTableGroup> }>({ mode: 'detailed', expandedGroups: new Set(FORECAST_TABLE_GROUPS) });
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    const device = window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
    const parsed = parseForecastTablePreference(localStorage.getItem(TABLE_PREFERENCE_KEY), device);
    setPreference({ mode: parsed.mode, expandedGroups: new Set(parsed.expandedGroups) });
    setPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    try {
      localStorage.setItem(TABLE_PREFERENCE_KEY, JSON.stringify({ version: 1, mode: preference.mode, expandedGroups: [...preference.expandedGroups] }));
    } catch {
      // The table remains functional if browser storage is restricted.
    }
  }, [preference, preferenceLoaded]);

  useEffect(() => {
    if (!fullScreen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullScreen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [fullScreen]);

  const definitions = useMemo(() => rowsFor(t, locale), [locale, t]);
  const selectedPeriod = periods.find((period) => period.start === selectedTimestamp) ?? periods[0];
  const visibleRows = useMemo(() => preference.mode === 'compact' ? definitions.filter((row) => row.compact) : definitions, [definitions, preference.mode]);
  const renderedRows = useMemo(() => visibleRows.map((definition) => ({ definition, cells: periods.map((period) => definition.render(period)) })), [periods, visibleRows]);

  function toggleGroup(group: ForecastTableGroup) {
    setPreference((current) => {
      const expandedGroups = new Set(current.expandedGroups);
      if (expandedGroups.has(group)) expandedGroups.delete(group);
      else expandedGroups.add(group);
      return { ...current, expandedGroups };
    });
  }

  return (
    <div className={cn('min-w-0', fullScreen && 'fixed inset-0 z-[70] overflow-auto bg-background p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5')}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-3 pt-3 sm:px-0 sm:pt-0">
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border/70 bg-background/35 p-1" role="group" aria-label={t('table.detail')}>
          {(['compact', 'detailed'] as const).map((mode) => <Button key={mode} type="button" size="sm" variant={preference.mode === mode ? 'controlActive' : 'control'} aria-pressed={preference.mode === mode} onClick={() => setPreference((current) => ({ ...current, mode }))} className="shrink-0">{mode === 'compact' ? t('table.compact') : t('table.detailed')}</Button>)}
        </div>
        <Button type="button" variant={fullScreen ? 'controlActive' : 'control'} size="sm" onClick={() => setFullScreen((value) => !value)} aria-pressed={fullScreen}>
          {fullScreen ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
          {fullScreen ? t('table.exitFullscreen') : t('table.fullscreen')}
        </Button>
      </div>

      {/* Chronology intentionally remains LTR; localized labels set their own direction. */}
      <div className="max-w-full overflow-x-auto rounded-xl border border-border/70" tabIndex={0} aria-label={t('table.scrollLabel')} dir="ltr">
        <table className={cn('border-separate border-spacing-0 text-sm', preference.mode === 'compact' ? 'min-w-[760px]' : 'min-w-[1180px]')}>
          <caption className="sr-only">{t('table.caption')}</caption>
          <thead className="sticky top-0 z-30 bg-card">
            <tr>
              <th scope="col" className="sticky left-0 z-40 w-[6.5rem] min-w-[6.5rem] border-b border-r border-border bg-card px-3 py-3 text-sm font-medium text-muted-foreground sm:w-40 sm:min-w-40"><span className="block text-start" dir={direction}>{t('table.condition')}</span></th>
              {periods.map((period, index) => {
                const newDay = index === 0 || periods[index - 1]?.date !== period.date;
                return (
                  <th key={period.start} scope="col" className={cn('min-w-20 border-b border-border px-2 py-3 text-center sm:min-w-28', newDay && index > 0 && 'border-l-2 border-l-primary/50', period.recommended && 'bg-condition-good/10', period.safety.containsDangerous && 'bg-destructive/10', selectedTimestamp === period.start && 'bg-primary/15 ring-1 ring-inset ring-primary')}>
                    <span className="block text-sm text-muted-foreground" dir={direction}>{formatDayLabel(locale, period.date, new Date().toISOString(), t('common.today'), t('common.tomorrow'))}</span>
                    <span className="mt-0.5 block text-base tabular-nums">{formatTime(locale, period.start)}</span>
                    <span className="mt-1 flex min-h-5 items-center justify-center gap-1 text-xs">
                      {period.markers.currentTime ? <span className="text-primary" title={t('table.currentTime')}>●</span> : null}
                      {period.recommended ? <Star className="size-3.5 fill-current text-condition-good" aria-label={t('table.recommended')} /> : null}
                      <span title={dataQualityStatus(t, period.dataQuality)} className="rounded bg-muted px-1 text-muted-foreground" dir={direction}>{sourceMarker(t, period)}</span>
                    </span>
                    <Button type="button" size="sm" variant={selectedTimestamp === period.start ? 'controlActive' : 'control'} className="mt-1 min-h-11 px-2 text-xs font-normal" onClick={() => onSelectTimestamp(period.start)} aria-pressed={selectedTimestamp === period.start} aria-label={t('table.selectTime', { time: formatTime(locale, period.start) })}>{t('common.select')}</Button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {FORECAST_TABLE_GROUPS.map((group) => {
              const rows = renderedRows.filter((row) => row.definition.group === group);
              if (!rows.length) return null;
              const expanded = preference.expandedGroups.has(group);
              return (
                <Fragment key={group}>
                  <tr>
                    <th colSpan={periods.length + 1} className="sticky left-0 border-b border-t-2 border-border bg-secondary/55 p-0">
                      <Button type="button" size="sm" variant={expanded ? 'controlActive' : 'control'} aria-expanded={expanded} onClick={() => toggleGroup(group)} className="min-h-12 w-full justify-start rounded-none border-0 px-3 py-2 text-start focus-visible:ring-inset focus-visible:ring-offset-0" dir={direction}>
                        {expanded ? <ChevronDown className="size-4 shrink-0 text-primary" aria-hidden /> : direction === 'rtl' ? <ChevronLeft className="size-4 shrink-0 text-primary" aria-hidden /> : <ChevronRight className="size-4 shrink-0 text-primary" aria-hidden />}
                        <span className="font-medium">{t(GROUP_KEYS[group])}</span>
                        <span className="truncate text-sm font-normal text-muted-foreground">{groupSummary(t, locale, group, selectedPeriod)}</span>
                      </Button>
                    </th>
                  </tr>
                  {expanded ? rows.map((row) => (
                    <tr key={row.definition.id}>
                      <th scope="row" className="sticky left-0 z-10 w-[6.5rem] min-w-[6.5rem] border-b border-r border-border bg-card px-3 py-3 text-sm font-medium sm:w-40 sm:min-w-40"><span className="flex w-full items-center justify-start gap-1.5 text-start" dir={direction}>{row.definition.label}{row.definition.helpKey ? <ForecastHelp helpKey={row.definition.helpKey} /> : null}</span></th>
                      {row.cells.map((cell, index) => {
                        const period = periods[index]!;
                        const newDay = index > 0 && periods[index - 1]?.date !== period.date;
                        return (
                          <td key={`${row.definition.id}-${period.start}`} title={row.definition.id === 'safety' ? periodRecommendation(t, locale, period) : undefined} className={cn('border-b border-border/50 px-2 py-3 text-center align-top text-sm', newDay && 'border-l-2 border-l-primary/30', period.recommended && 'bg-condition-good/5', selectedTimestamp === period.start && 'bg-primary/10', period.safety.containsDangerous && row.definition.group === 'safety' && 'bg-destructive/20')}>
                            <div dir={direction}><span className="block font-medium tabular-nums" dir="auto">{cell.value}</span>{cell.detail ? <span className="mt-0.5 block text-xs text-muted-foreground">{cell.detail}</span> : null}</div>
                          </td>
                        );
                      })}
                    </tr>
                  )) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
