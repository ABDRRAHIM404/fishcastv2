'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Star,
} from 'lucide-react';
import { ForecastHelp } from '@/components/forecast/forecast-help';
import { Button } from '@/components/ui/button';
import {
  compassLabel,
  dataQualityLabel,
  directionArrowFrom,
  formatValue,
  gustLabel,
  pressureTrendLabel,
  tideMovementLabel,
  waveHeightLabel,
  wavePeriodLabel,
  weatherLabel,
  windLabel,
} from '@/lib/forecast-ui/labels';
import {
  FORECAST_TABLE_GROUPS,
  parseForecastTablePreference,
  type ForecastTableGroup,
  type ForecastTableMode,
} from '@/lib/forecast-ui/preferences';
import type { ForecastPeriod } from '@/lib/forecast-ui/types';
import { formatDaySectionLabel, formatTimeLabel } from '@/lib/timeline/format';
import { cn } from '@/lib/utils';

const TABLE_PREFERENCE_KEY = 'fishcast:forecast-table:v1';

interface RowDefinition {
  id: string;
  group: ForecastTableGroup;
  label: string;
  compact: boolean;
  helpKey?: string;
  render: (period: ForecastPeriod) => { value: string; detail?: string };
}

const ROWS: RowDefinition[] = [
  { id: 'score', group: 'fishing', label: 'Fishing score', compact: true, render: (period) => ({ value: `${period.fishing.score}/100`, detail: period.fishing.label }) },
  { id: 'confidence', group: 'fishing', label: 'Confidence', compact: true, helpKey: 'confidence', render: (period) => ({ value: `${period.confidence.completenessPercentage}%`, detail: `${period.confidence.label} confidence` }) },
  { id: 'species', group: 'fishing', label: 'Best species', compact: false, render: (period) => ({ value: period.bestSpecies ?? 'Not available', detail: period.bestSpecies ? 'Matched and in season' : 'No supported match' }) },
  { id: 'technique', group: 'fishing', label: 'Technique', compact: false, render: () => ({ value: 'Not available', detail: 'No verified technique dataset' }) },
  { id: 'note', group: 'fishing', label: 'FishCast note', compact: true, render: (period) => ({ value: period.note }) },
  { id: 'safety', group: 'safety', label: 'Safety status', compact: true, render: (period) => ({ value: period.safety.status, detail: period.safety.primaryWarning ?? 'No active warning' }) },
  { id: 'safety-score', group: 'safety', label: 'Safety score', compact: false, render: (period) => ({ value: period.safety.score === null ? '—' : `${period.safety.score}/100`, detail: period.safety.containsDangerous ? 'Contains a Dangerous interval' : 'Worst state across interval' }) },
  { id: 'quality', group: 'safety', label: 'Value source', compact: false, helpKey: 'interpolated', render: (period) => ({ value: dataQualityLabel(period.dataQuality), detail: 'Safety checked across full interval' }) },
  { id: 'wind', group: 'wind', label: 'Wind', compact: true, helpKey: 'windRelationship', render: (period) => ({ value: formatValue(period.wind.speedKmh, ' km/h'), detail: `${windLabel(period.wind.speedKmh)} · ${period.wind.relationship}` }) },
  { id: 'gust', group: 'wind', label: 'Gusts', compact: true, render: (period) => ({ value: formatValue(period.wind.gustKmh, ' km/h'), detail: gustLabel(period.wind.gustKmh) }) },
  { id: 'wind-direction', group: 'wind', label: 'Direction', compact: false, render: (period) => ({ value: `${directionArrowFrom(period.wind.directionDeg)} ${compassLabel(period.wind.directionDeg)}`, detail: period.wind.directionDeg === null ? 'Unavailable' : `${Math.round(period.wind.directionDeg)}° from` }) },
  { id: 'wave-height', group: 'waves', label: 'Wave height', compact: true, render: (period) => ({ value: formatValue(period.waves.heightM, ' m', 1), detail: waveHeightLabel(period.waves.heightM, period.waves.derived.seaState) }) },
  { id: 'wave-period', group: 'waves', label: 'Wave period', compact: true, helpKey: 'wavePeriod', render: (period) => ({ value: formatValue(period.waves.periodS, ' s', 1), detail: wavePeriodLabel(period.waves.periodS) }) },
  { id: 'wave-direction', group: 'waves', label: 'Wave direction', compact: false, render: (period) => ({ value: `${directionArrowFrom(period.waves.directionDeg)} ${compassLabel(period.waves.directionDeg)}`, detail: period.waves.directionDeg === null ? 'Unavailable' : `${Math.round(period.waves.directionDeg)}° from` }) },
  { id: 'swell', group: 'waves', label: 'Primary swell', compact: false, helpKey: 'swell', render: (period) => ({ value: formatValue(period.waves.swellHeightM, ' m', 1), detail: `${formatValue(period.waves.swellPeriodS, ' s', 1)} · ${compassLabel(period.waves.swellDirectionDeg)}` }) },
  { id: 'secondary-swell', group: 'waves', label: 'Secondary swell', compact: false, helpKey: 'crossingSwell', render: (period) => ({ value: formatValue(period.waves.secondarySwellHeightM, ' m', 1), detail: period.waves.derived.crossingSwell === true ? 'Crossing swell warning' : `${formatValue(period.waves.secondarySwellPeriodS, ' s', 1)} · ${compassLabel(period.waves.secondarySwellDirectionDeg)}` }) },
  { id: 'power', group: 'waves', label: 'Wave power', compact: false, helpKey: 'wavePower', render: (period) => ({ value: formatValue(period.waves.derived.estimatedPowerKwPerM, ' kW/m', 1), detail: 'Deep-water estimate' }) },
  { id: 'wavelength', group: 'waves', label: 'Wavelength', compact: false, helpKey: 'wavelength', render: (period) => ({ value: formatValue(period.waves.derived.estimatedWavelengthM, ' m'), detail: 'Estimated spacing' }) },
  { id: 'steepness', group: 'waves', label: 'Steepness', compact: false, helpKey: 'steepness', render: (period) => ({ value: period.waves.derived.estimatedSteepness === null ? '—' : period.waves.derived.estimatedSteepness.toFixed(3), detail: 'Estimated H/L ratio' }) },
  { id: 'tide', group: 'tide', label: 'Modelled tide', compact: true, helpKey: 'modelledTide', render: (period) => ({ value: formatValue(period.tide.heightM, ' m', 2), detail: `${period.tide.trend ?? 'Unavailable'} · ${tideMovementLabel(period.tide.trend, period.tide.rateMPerHour)}` }) },
  { id: 'tide-next', group: 'tide', label: 'Next extreme', compact: false, helpKey: 'modelledTide', render: (period) => ({ value: period.tide.nextExtremeState ?? 'Unavailable', detail: period.tide.minutesToNextExtreme === null ? 'No extreme available' : `${Math.floor(period.tide.minutesToNextExtreme / 60)}h ${period.tide.minutesToNextExtreme % 60}m · ${period.tide.nextExtremeTime ? formatTimeLabel(period.tide.nextExtremeTime) : 'time unavailable'}` }) },
  { id: 'tide-range', group: 'tide', label: 'Daily modelled range', compact: false, helpKey: 'modelledTide', render: (period) => ({ value: formatValue(period.tide.dailyRangeM, ' m', 2), detail: 'Daily max minus min' }) },
  { id: 'temperature', group: 'environment', label: 'Temperature', compact: false, render: (period) => ({ value: formatValue(period.weather.temperatureC, '°C', 1), detail: weatherLabel(period.weather.weatherCode) }) },
  { id: 'pressure', group: 'environment', label: 'Pressure', compact: false, render: (period) => ({ value: formatValue(period.weather.pressureMb, ' mb'), detail: pressureTrendLabel(period.weather.pressureTrendMbPerHr) }) },
  { id: 'rain', group: 'environment', label: 'Precipitation', compact: false, render: (period) => ({ value: formatValue(period.weather.precipitationMm, ' mm', 1), detail: weatherLabel(period.weather.weatherCode) }) },
  { id: 'cloud', group: 'environment', label: 'Cloud cover', compact: false, render: (period) => ({ value: formatValue(period.weather.cloudCoverPct, '%'), detail: weatherLabel(period.weather.weatherCode) }) },
  { id: 'visibility', group: 'environment', label: 'Visibility', compact: false, render: (period) => ({ value: period.weather.visibilityM === null ? '—' : `${(period.weather.visibilityM / 1000).toFixed(1)} km`, detail: 'Model forecast' }) },
  { id: 'sea-temperature', group: 'environment', label: 'Sea temperature', compact: false, render: (period) => ({ value: formatValue(period.environment.seaSurfaceTemperatureC, '°C', 1), detail: 'Sea surface' }) },
  { id: 'current', group: 'environment', label: 'Ocean current', compact: false, render: (period) => ({ value: formatValue(period.environment.oceanCurrentVelocityKmh, ' km/h', 1), detail: period.environment.oceanCurrentDirectionDeg === null ? 'Direction unavailable' : `${Math.round(period.environment.oceanCurrentDirectionDeg)}° towards` }) },
  { id: 'daylight', group: 'environment', label: 'Light', compact: false, render: (period) => ({ value: period.environment.daylightState.replace('-', ' '), detail: period.markers.sunrise ? 'Sunrise in interval' : period.markers.sunset ? 'Sunset in interval' : 'Calculated solar state' }) },
];

const GROUP_LABELS: Readonly<Record<ForecastTableGroup, string>> = {
  fishing: 'Fishing',
  safety: 'Safety',
  wind: 'Wind',
  waves: 'Waves and swell',
  tide: 'Tide',
  environment: 'Weather and environment',
};

function groupSummary(group: ForecastTableGroup, period: ForecastPeriod | undefined): string {
  if (!period) return 'No selected value';
  if (group === 'fishing') return `${period.fishing.score}/100 · ${period.fishing.label}`;
  if (group === 'safety') return `${period.safety.status}${period.safety.primaryWarning ? ` · ${period.safety.primaryWarning}` : ''}`;
  if (group === 'wind') return `${formatValue(period.wind.speedKmh, ' km/h')} · gust ${formatValue(period.wind.gustKmh, ' km/h')}`;
  if (group === 'waves') return `${formatValue(period.waves.heightM, ' m', 1)} · ${formatValue(period.waves.periodS, ' s', 1)} · ${wavePeriodLabel(period.waves.periodS)}`;
  if (group === 'tide') return `${formatValue(period.tide.heightM, ' m', 2)} · ${period.tide.trend ?? 'Unavailable'}`;
  return `${formatValue(period.weather.temperatureC, '°C', 1)} · ${weatherLabel(period.weather.weatherCode)}`;
}

function sourceMarker(period: ForecastPeriod): string {
  if (period.dataQuality === 'provider') return 'P';
  if (period.dataQuality === 'interpolated') return 'E';
  if (period.dataQuality === 'aggregated') return 'A';
  if (period.dataQuality === 'mixed') return 'M';
  return '—';
}

interface Props {
  periods: ForecastPeriod[];
  selectedTimestamp: string | null;
  onSelectTimestamp: (timestamp: string) => void;
}

export function ForecastTable({ periods, selectedTimestamp, onSelectTimestamp }: Props) {
  const [preference, setPreference] = useState<{
    mode: ForecastTableMode;
    expandedGroups: Set<ForecastTableGroup>;
  }>({ mode: 'detailed', expandedGroups: new Set(FORECAST_TABLE_GROUPS) });
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    const device = window.matchMedia('(max-width: 767px)').matches
      ? 'mobile'
      : 'desktop';
    const parsed = parseForecastTablePreference(
      localStorage.getItem(TABLE_PREFERENCE_KEY),
      device
    );
    setPreference({
      mode: parsed.mode,
      expandedGroups: new Set(parsed.expandedGroups),
    });
    setPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    try {
      localStorage.setItem(
        TABLE_PREFERENCE_KEY,
        JSON.stringify({
          version: 1,
          mode: preference.mode,
          expandedGroups: [...preference.expandedGroups],
        })
      );
    } catch {
      // The forecast remains functional if storage is restricted.
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

  const selectedPeriod =
    periods.find((period) => period.start === selectedTimestamp) ?? periods[0];
  const visibleRows = useMemo(
    () =>
      preference.mode === 'compact'
        ? ROWS.filter((row) => row.compact)
        : ROWS,
    [preference.mode]
  );

  function setMode(mode: ForecastTableMode) {
    setPreference((current) => ({ ...current, mode }));
  }

  function toggleGroup(group: ForecastTableGroup) {
    setPreference((current) => {
      const expandedGroups = new Set(current.expandedGroups);
      if (expandedGroups.has(group)) expandedGroups.delete(group);
      else expandedGroups.add(group);
      return { ...current, expandedGroups };
    });
  }

  return (
    <div
      className={cn(
        'min-w-0',
        fullScreen &&
          'fixed inset-0 z-[70] overflow-auto bg-background p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5'
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-3 pt-3 sm:px-0 sm:pt-0">
        <div className="flex rounded-lg border border-border p-1" role="group" aria-label="Forecast table detail">
          {(['compact', 'detailed'] as const).map((mode) => (
            <button key={mode} type="button" aria-pressed={preference.mode === mode} onClick={() => setMode(mode)} className={cn('min-h-10 rounded-md px-4 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', preference.mode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>{mode}</button>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={() => setFullScreen((value) => !value)} aria-pressed={fullScreen}>
          {fullScreen ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
          {fullScreen ? 'Exit full screen' : 'Full-screen table'}
        </Button>
      </div>

      <div className="max-w-full overflow-x-auto rounded-xl border border-border/70" tabIndex={0} aria-label="Scrollable fishing forecast table">
        <table className={cn('border-separate border-spacing-0 text-sm', preference.mode === 'compact' ? 'min-w-[760px]' : 'min-w-[1180px]')}>
          <caption className="sr-only">Fishing, safety, wind, wave, modelled tide and weather forecast by interval</caption>
          <thead className="sticky top-0 z-30 bg-card">
            <tr>
              <th scope="col" className="sticky left-0 z-40 w-[6.5rem] min-w-[6.5rem] border-b border-r border-border bg-card px-3 py-3 text-left text-sm font-medium text-muted-foreground sm:w-40 sm:min-w-40">Condition</th>
              {periods.map((period, index) => {
                const newDay = index === 0 || periods[index - 1]?.date !== period.date;
                return (
                  <th key={period.start} scope="col" className={cn('min-w-20 border-b border-border px-2 py-3 text-center sm:min-w-28', newDay && index > 0 && 'border-l-2 border-l-primary/50', period.recommended && 'bg-condition-good/10', period.safety.containsDangerous && 'bg-destructive/10', selectedTimestamp === period.start && 'bg-primary/15 ring-1 ring-inset ring-primary')}>
                    <span className="block text-sm text-muted-foreground">{formatDaySectionLabel(period.date)}</span>
                    <span className="mt-0.5 block text-base tabular-nums">{formatTimeLabel(period.start)}</span>
                    <span className="mt-1 flex min-h-5 items-center justify-center gap-1 text-xs">
                      {period.markers.currentTime ? <span className="text-primary" title="Current time">●</span> : null}
                      {period.recommended ? <Star className="size-3.5 fill-current text-condition-good" aria-label="Recommended window" /> : null}
                      <span title={period.dataQualityLabel} className="rounded bg-muted px-1 text-muted-foreground">{sourceMarker(period)}</span>
                    </span>
                    <button type="button" className="mt-1 min-h-8 rounded px-2 text-xs font-normal text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSelectTimestamp(period.start)} aria-label={`Select ${formatTimeLabel(period.start)}`}>Select</button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {FORECAST_TABLE_GROUPS.map((group) => {
              const rows = visibleRows.filter((row) => row.group === group);
              if (rows.length === 0) return null;
              const expanded = preference.expandedGroups.has(group);
              return (
                <Fragment key={group}>
                  <tr>
                    <th colSpan={periods.length + 1} className="sticky left-0 border-b border-t-2 border-border bg-secondary/55 p-0 text-left">
                      <button type="button" aria-expanded={expanded} onClick={() => toggleGroup(group)} className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                        {expanded ? <ChevronDown className="size-4 shrink-0 text-primary" aria-hidden /> : <ChevronRight className="size-4 shrink-0 text-primary" aria-hidden />}
                        <span className="font-medium">{GROUP_LABELS[group]}</span>
                        <span className="truncate text-sm font-normal text-muted-foreground">{groupSummary(group, selectedPeriod)}</span>
                      </button>
                    </th>
                  </tr>
                  {expanded
                    ? rows.map((row) => (
                        <tr key={row.id}>
                          <th scope="row" className="sticky left-0 z-10 w-[6.5rem] min-w-[6.5rem] border-b border-r border-border bg-card px-3 py-3 text-left text-sm font-medium sm:w-40 sm:min-w-40"><span className="inline-flex items-center gap-1.5">{row.label}{row.helpKey ? <ForecastHelp helpKey={row.helpKey} /> : null}</span></th>
                          {periods.map((period, index) => {
                            const cell = row.render(period);
                            const newDay = index > 0 && periods[index - 1]?.date !== period.date;
                            return (
                              <td key={`${row.id}-${period.start}`} title={row.id === 'safety' ? period.note : undefined} className={cn('border-b border-border/50 px-2 py-3 text-center align-top text-sm', newDay && 'border-l-2 border-l-primary/30', period.recommended && 'bg-condition-good/5', selectedTimestamp === period.start && 'bg-primary/10', period.safety.containsDangerous && row.group === 'safety' && 'bg-destructive/20')}>
                                <span className={cn('block font-medium tabular-nums', cell.value === '—' && 'text-muted-foreground')}>{cell.value}</span>
                                {cell.detail ? <span className="mx-auto mt-1 block max-w-32 whitespace-normal text-xs leading-snug text-muted-foreground">{cell.detail}</span> : null}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 px-3 text-xs text-muted-foreground sm:px-0">Source markers: P provider timestamp · E estimated/interpolated · A aggregated · M mixed availability.</p>
    </div>
  );
}
