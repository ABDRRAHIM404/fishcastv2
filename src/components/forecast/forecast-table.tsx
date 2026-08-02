'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { ForecastHelp } from '@/components/forecast/forecast-help';
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
import type { ForecastPeriod } from '@/lib/forecast-ui/types';
import { formatDaySectionLabel, formatTimeLabel } from '@/lib/timeline/format';
import { cn } from '@/lib/utils';

interface RowDefinition {
  id: string;
  section: string;
  label: string;
  helpKey?: string;
  render: (period: ForecastPeriod) => { value: string; detail?: string };
}

const ROWS: RowDefinition[] = [
  {
    id: 'score', section: 'Fishing', label: 'Fishing score',
    render: (period) => ({ value: `${period.fishing.score}`, detail: period.fishing.label }),
  },
  {
    id: 'safety', section: 'Fishing', label: 'Safety',
    render: (period) => ({ value: period.safety.status, detail: period.safety.primaryWarning ?? 'No active warning' }),
  },
  {
    id: 'confidence', section: 'Fishing', label: 'Confidence', helpKey: 'confidence',
    render: (period) => ({ value: `${period.confidence.completenessPercentage}%`, detail: `${period.confidence.label} · ${dataQualityLabel(period.dataQuality)}` }),
  },
  {
    id: 'quality', section: 'Fishing', label: 'Value source', helpKey: 'interpolated',
    render: (period) => ({ value: dataQualityLabel(period.dataQuality), detail: period.safetyAggregatedAcrossInterval ? 'Safety checked across full interval' : undefined }),
  },
  {
    id: 'species', section: 'Fishing', label: 'Best species',
    render: (period) => ({ value: period.bestSpecies ?? 'Not available', detail: period.bestSpecies ? 'Matched and in season' : 'No supported match' }),
  },
  {
    id: 'technique', section: 'Fishing', label: 'Technique',
    render: () => ({ value: 'Not available', detail: 'No verified technique dataset' }),
  },
  {
    id: 'note', section: 'Fishing', label: 'FishCast note',
    render: (period) => ({ value: period.note, detail: undefined }),
  },
  {
    id: 'wind', section: 'Wind', label: 'Wind', helpKey: 'windRelationship',
    render: (period) => ({ value: formatValue(period.wind.speedKmh, ' km/h'), detail: `${windLabel(period.wind.speedKmh)} · ${period.wind.relationship}` }),
  },
  {
    id: 'gust', section: 'Wind', label: 'Gusts',
    render: (period) => ({ value: formatValue(period.wind.gustKmh, ' km/h'), detail: gustLabel(period.wind.gustKmh) }),
  },
  {
    id: 'wind-direction', section: 'Wind', label: 'Direction',
    render: (period) => ({ value: `${directionArrowFrom(period.wind.directionDeg)} ${compassLabel(period.wind.directionDeg)}`, detail: period.wind.directionDeg === null ? 'Unavailable' : `${Math.round(period.wind.directionDeg)}° from` }),
  },
  {
    id: 'wave-height', section: 'Waves', label: 'Wave height',
    render: (period) => ({ value: formatValue(period.waves.heightM, ' m', 1), detail: waveHeightLabel(period.waves.heightM, period.waves.derived.seaState) }),
  },
  {
    id: 'wave-period', section: 'Waves', label: 'Wave period', helpKey: 'wavePeriod',
    render: (period) => ({ value: formatValue(period.waves.periodS, ' s', 1), detail: wavePeriodLabel(period.waves.periodS) }),
  },
  {
    id: 'wave-direction', section: 'Waves', label: 'Wave direction',
    render: (period) => ({ value: `${directionArrowFrom(period.waves.directionDeg)} ${compassLabel(period.waves.directionDeg)}`, detail: period.waves.directionDeg === null ? 'Unavailable' : `${Math.round(period.waves.directionDeg)}° from` }),
  },
  {
    id: 'swell', section: 'Waves', label: 'Primary swell', helpKey: 'swell',
    render: (period) => ({ value: formatValue(period.waves.swellHeightM, ' m', 1), detail: `${formatValue(period.waves.swellPeriodS, ' s', 1)} · ${compassLabel(period.waves.swellDirectionDeg)}` }),
  },
  {
    id: 'secondary-swell', section: 'Waves', label: 'Secondary swell', helpKey: 'crossingSwell',
    render: (period) => ({ value: formatValue(period.waves.secondarySwellHeightM, ' m', 1), detail: period.waves.derived.crossingSwell === true ? 'Crossing swell' : `${formatValue(period.waves.secondarySwellPeriodS, ' s', 1)} · ${compassLabel(period.waves.secondarySwellDirectionDeg)}` }),
  },
  {
    id: 'power', section: 'Waves', label: 'Wave power', helpKey: 'wavePower',
    render: (period) => ({ value: formatValue(period.waves.derived.estimatedPowerKwPerM, ' kW/m', 1), detail: 'Deep-water estimate' }),
  },
  {
    id: 'wavelength', section: 'Waves', label: 'Wavelength', helpKey: 'wavelength',
    render: (period) => ({ value: formatValue(period.waves.derived.estimatedWavelengthM, ' m'), detail: 'Estimated spacing' }),
  },
  {
    id: 'steepness', section: 'Waves', label: 'Steepness', helpKey: 'steepness',
    render: (period) => ({ value: period.waves.derived.estimatedSteepness === null ? '—' : period.waves.derived.estimatedSteepness.toFixed(3), detail: 'Estimated H/L ratio' }),
  },
  {
    id: 'tide', section: 'Tide', label: 'Modelled tide', helpKey: 'modelledTide',
    render: (period) => ({ value: formatValue(period.tide.heightM, ' m', 2), detail: `${period.tide.trend ?? 'Unavailable'} · ${tideMovementLabel(period.tide.trend, period.tide.rateMPerHour)}` }),
  },
  {
    id: 'tide-next', section: 'Tide', label: 'Next extreme', helpKey: 'modelledTide',
    render: (period) => ({ value: period.tide.nextExtremeState ?? 'Unavailable', detail: period.tide.minutesToNextExtreme === null ? 'No extreme available' : `${Math.floor(period.tide.minutesToNextExtreme / 60)}h ${period.tide.minutesToNextExtreme % 60}m · ${period.tide.nextExtremeTime ? formatTimeLabel(period.tide.nextExtremeTime) : 'time unavailable'}` }),
  },
  {
    id: 'tide-range', section: 'Tide', label: 'Daily modelled range', helpKey: 'modelledTide',
    render: (period) => ({ value: formatValue(period.tide.dailyRangeM, ' m', 2), detail: 'Daily max minus min' }),
  },
  {
    id: 'temperature', section: 'Weather', label: 'Temperature',
    render: (period) => ({ value: formatValue(period.weather.temperatureC, '°C', 1), detail: weatherLabel(period.weather.weatherCode) }),
  },
  {
    id: 'pressure', section: 'Weather', label: 'Pressure',
    render: (period) => ({ value: formatValue(period.weather.pressureMb, ' mb'), detail: pressureTrendLabel(period.weather.pressureTrendMbPerHr) }),
  },
  {
    id: 'rain', section: 'Weather', label: 'Precipitation',
    render: (period) => ({ value: formatValue(period.weather.precipitationMm, ' mm', 1), detail: weatherLabel(period.weather.weatherCode) }),
  },
  {
    id: 'cloud', section: 'Weather', label: 'Cloud cover',
    render: (period) => ({ value: formatValue(period.weather.cloudCoverPct, '%'), detail: weatherLabel(period.weather.weatherCode) }),
  },
  {
    id: 'visibility', section: 'Weather', label: 'Visibility',
    render: (period) => ({ value: period.weather.visibilityM === null ? '—' : `${(period.weather.visibilityM / 1000).toFixed(1)} km`, detail: 'Model forecast' }),
  },
  {
    id: 'sea-temperature', section: 'Environment', label: 'Sea temperature',
    render: (period) => ({ value: formatValue(period.environment.seaSurfaceTemperatureC, '°C', 1), detail: 'Sea surface' }),
  },
  {
    id: 'current', section: 'Environment', label: 'Ocean current',
    render: (period) => ({ value: formatValue(period.environment.oceanCurrentVelocityKmh, ' km/h', 1), detail: period.environment.oceanCurrentDirectionDeg === null ? 'Direction unavailable' : `${Math.round(period.environment.oceanCurrentDirectionDeg)}° towards` }),
  },
  {
    id: 'daylight', section: 'Environment', label: 'Light',
    render: (period) => ({ value: period.environment.daylightState.replace('-', ' '), detail: period.markers.sunrise ? 'Sunrise in interval' : period.markers.sunset ? 'Sunset in interval' : 'Calculated solar state' }),
  },
];

export function ForecastTable({ periods, selectedTimestamp, onSelectTimestamp }: { periods: ForecastPeriod[]; selectedTimestamp: string | null; onSelectTimestamp: (timestamp: string) => void }) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );
  let previousSection = '';
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70" tabIndex={0} aria-label="Scrollable fishing forecast table">
      <table className="min-w-max border-separate border-spacing-0 text-sm">
        <caption className="sr-only">Fishing, safety, wind, wave, modelled tide and weather forecast by interval</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-20 min-w-36 border-b border-r border-border bg-card px-3 py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">
              Condition
            </th>
            {periods.map((period) => (
              <th key={period.start} scope="col" className={cn('min-w-28 border-b border-border px-2 py-3 text-center', period.recommended && 'bg-condition-good/10', selectedTimestamp === period.start && 'bg-primary/15 ring-1 ring-inset ring-primary')}>
                <span className="block text-xs text-muted-foreground">{formatDaySectionLabel(period.date)}</span>
                <span className="mt-0.5 block tabular-nums">{formatTimeLabel(period.start)}</span>
                <span className="mt-1 flex min-h-4 items-center justify-center text-condition-good">
                  {period.recommended ? <Star className="size-3.5 fill-current" aria-label="Recommended window" /> : null}
                </span>
                <button type="button" className="mt-1 rounded px-2 py-1 text-[0.68rem] font-normal text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSelectTimestamp(period.start)} aria-label={`Select ${formatTimeLabel(period.start)}`}>Select</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const startsSection = row.section !== previousSection;
            previousSection = row.section;
            const collapsed = collapsedSections.has(row.section);
            if (collapsed && !startsSection) return null;
            return (
              <tr key={row.id} className={startsSection ? 'border-t-2 border-border' : undefined}>
                <th scope="row" className={cn('sticky left-0 z-10 border-r border-border bg-card px-3 py-2 text-left font-medium', startsSection && 'border-t-2')}>
                  {startsSection ? <button type="button" aria-expanded={!collapsed} onClick={() => setCollapsedSections((current) => { const next = new Set(current); if (next.has(row.section)) next.delete(row.section); else next.add(row.section); return next; })} className="mb-1 block rounded text-[0.65rem] uppercase tracking-[0.18em] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{row.section} · {collapsed ? 'Show' : 'Hide'}</button> : null}
                  {!collapsed ? <span className="inline-flex items-center gap-1.5">{row.label}{row.helpKey ? <ForecastHelp helpKey={row.helpKey} /> : null}</span> : <span className="text-xs text-muted-foreground">Section collapsed</span>}
                </th>
                {collapsed ? (
                  <td colSpan={periods.length} className="border-b border-t-2 border-border px-3 py-3 text-sm text-muted-foreground">{row.section} values are hidden. Activate “Show” to expand.</td>
                ) : periods.map((period) => {
                  const cell = row.render(period);
                  return (
                    <td key={`${row.id}-${period.start}`} title={row.id === 'safety' ? period.note : undefined} className={cn('border-b border-border/50 px-2 py-2 text-center align-top', startsSection && 'border-t-2 border-t-border', period.recommended && 'bg-condition-good/5', selectedTimestamp === period.start && 'bg-primary/10', period.safety.containsDangerous && row.id === 'safety' && 'bg-destructive/20 text-destructive-foreground')}>
                      <span className="block whitespace-nowrap font-medium tabular-nums">{cell.value}</span>
                      {cell.detail ? <span className="mt-0.5 block max-w-28 whitespace-normal text-[0.68rem] leading-tight text-muted-foreground">{cell.detail}</span> : null}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
