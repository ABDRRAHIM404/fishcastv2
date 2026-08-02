'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { compassLabel, directionArrowFrom, formatValue } from '@/lib/forecast-ui/labels';
import type { ForecastPeriod } from '@/lib/forecast-ui/types';
import { formatDaySectionLabel, formatTimeLabel } from '@/lib/timeline/format';

function badgeVariant(label: ForecastPeriod['fishing']['label']) {
  if (label === 'Excellent') return 'excellent' as const;
  if (label === 'Good') return 'good' as const;
  if (label === 'Moderate') return 'moderate' as const;
  return 'poor' as const;
}

export function ForecastTimeline({ periods, selectedTimestamp, onSelectTimestamp }: { periods: ForecastPeriod[]; selectedTimestamp: string | null; onSelectTimestamp: (timestamp: string) => void }) {
  const nowIndex = useMemo(
    () => Math.max(0, periods.findIndex((period) => period.markers.currentTime)),
    [periods]
  );
  const selectedIndex = periods.findIndex(
    (period) => period.start === selectedTimestamp
  );
  const index = selectedIndex >= 0 ? selectedIndex : nowIndex;
  const setIndex = (nextIndex: number) => {
    const next = periods[nextIndex];
    if (next) onSelectTimestamp(next.start);
  };
  const active = periods[index] ?? periods[0];
  if (!active) return <p className="text-sm text-muted-foreground">Timeline data is unavailable.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-caption uppercase tracking-[0.18em] text-muted-foreground">30-minute decision timeline</p>
          <h3 className="mt-1 font-display text-h3">{formatDaySectionLabel(active.date)} · {formatTimeLabel(active.start)}</h3>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="icon" variant="outline" aria-label="Previous 30-minute period" disabled={index === 0} onClick={() => setIndex(Math.max(0, index - 1))}><ChevronLeft aria-hidden /></Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setIndex(nowIndex)} disabled={!periods.some((period) => period.markers.currentTime)}><LocateFixed aria-hidden />Now</Button>
          <Button type="button" size="icon" variant="outline" aria-label="Next 30-minute period" disabled={index >= periods.length - 1} onClick={() => setIndex(Math.min(periods.length - 1, index + 1))}><ChevronRight aria-hidden /></Button>
        </div>
      </div>

      <label className="block">
        <span className="sr-only">Select a 30-minute forecast period</span>
        <input
          type="range"
          min={0}
          max={Math.max(0, periods.length - 1)}
          value={index}
          onChange={(event) => setIndex(Number(event.target.value))}
          className="h-2 w-full cursor-pointer accent-primary"
          aria-valuetext={`${formatDaySectionLabel(active.date)} at ${formatTimeLabel(active.start)}`}
        />
      </label>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label="Timeline markers">
        {active.markers.currentTime ? <span>● Current time</span> : null}
        {active.markers.sunrise ? <span>☀ Sunrise</span> : null}
        {active.markers.sunset ? <span>◐ Sunset</span> : null}
        {active.markers.tideHigh ? <span>↑ Modelled high</span> : null}
        {active.markers.tideLow ? <span>↓ Modelled low</span> : null}
        {active.recommended ? <span className="text-condition-good">★ Recommended window</span> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
        <div className="rounded-lg border border-border/70 p-4">
          <div className="flex items-center justify-between gap-2"><span className="text-sm text-muted-foreground">Fishing</span><Badge variant={badgeVariant(active.fishing.label)}>{active.fishing.label}</Badge></div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{active.fishing.score}/100</p>
          <p className="mt-1 text-xs text-muted-foreground">{active.confidence.label} confidence · {active.confidence.completenessPercentage}%</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <span className="text-sm text-muted-foreground">Safety</span>
          <p className="mt-2 text-xl font-semibold">{active.safety.status}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{active.safety.primaryWarning ?? 'No active modelled warning'}</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <span className="text-sm text-muted-foreground">Wind</span>
          <p className="mt-2 text-xl font-semibold tabular-nums">{formatValue(active.wind.speedKmh, ' km/h')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{directionArrowFrom(active.wind.directionDeg)} {compassLabel(active.wind.directionDeg)} · gust {formatValue(active.wind.gustKmh, ' km/h')}</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <span className="text-sm text-muted-foreground">Waves & modelled tide</span>
          <p className="mt-2 text-xl font-semibold tabular-nums">{formatValue(active.waves.heightM, ' m', 1)} · {formatValue(active.waves.periodS, ' s', 1)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Tide {formatValue(active.tide.heightM, ' m', 2)} · {active.tide.trend ?? 'unavailable'}</p>
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-border/70 bg-muted/10 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-muted-foreground">Value source</dt><dd className="mt-0.5 font-medium">{active.dataQualityLabel}</dd></div>
        <div><dt className="text-muted-foreground">Best species</dt><dd className="mt-0.5 font-medium">{active.bestSpecies ?? 'Not available'}</dd></div>
        <div><dt className="text-muted-foreground">Air / sea temperature</dt><dd className="mt-0.5 font-medium tabular-nums">{formatValue(active.weather.temperatureC, '°C', 1)} / {formatValue(active.environment.seaSurfaceTemperatureC, '°C', 1)}</dd></div>
        <div><dt className="text-muted-foreground">Pressure / rain</dt><dd className="mt-0.5 font-medium tabular-nums">{formatValue(active.weather.pressureMb, ' mb')} / {formatValue(active.weather.precipitationMm, ' mm', 1)}</dd></div>
        <div><dt className="text-muted-foreground">Primary swell</dt><dd className="mt-0.5 font-medium tabular-nums">{formatValue(active.waves.swellHeightM, ' m', 1)} · {formatValue(active.waves.swellPeriodS, ' s', 1)} · {compassLabel(active.waves.swellDirectionDeg)}</dd></div>
        <div><dt className="text-muted-foreground">Wave power</dt><dd className="mt-0.5 font-medium tabular-nums">{formatValue(active.waves.derived.estimatedPowerKwPerM, ' kW/m', 1)} estimated</dd></div>
        <div><dt className="text-muted-foreground">Next modelled tide</dt><dd className="mt-0.5 font-medium">{active.tide.nextExtremeState ?? 'Unavailable'}{active.tide.minutesToNextExtreme === null ? '' : ` in ${Math.floor(active.tide.minutesToNextExtreme / 60)}h ${active.tide.minutesToNextExtreme % 60}m`}</dd></div>
        <div><dt className="text-muted-foreground">Current / light</dt><dd className="mt-0.5 font-medium tabular-nums">{formatValue(active.environment.oceanCurrentVelocityKmh, ' km/h', 1)} · {active.environment.daylightState.replace('-', ' ')}</dd></div>
      </dl>
      <p className="text-sm text-muted-foreground">{active.note}</p>
    </div>
  );
}
