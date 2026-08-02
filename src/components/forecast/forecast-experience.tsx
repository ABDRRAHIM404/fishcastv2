'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { ForecastComparison } from '@/components/forecast/forecast-comparison';
import { ForecastGraphs } from '@/components/forecast/forecast-graphs';
import { ForecastSummary } from '@/components/forecast/forecast-summary';
import { ForecastTable } from '@/components/forecast/forecast-table';
import { ForecastTimeline } from '@/components/forecast/forecast-timeline';
import { PremiumCard } from '@/components/spot/premium-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useForecast } from '@/hooks/use-forecast';
import type {
  ForecastInterval,
  ForecastScope,
  ForecastView,
} from '@/lib/forecast-ui/types';
import { formatDaySectionLabel, formatTimeLabel } from '@/lib/timeline/format';
import { wavePeriodLabel, weatherLabel, weatherSymbol, windLabel } from '@/lib/forecast-ui/labels';
import { periodsForScope } from '@/lib/forecast-ui/query';
import { cn } from '@/lib/utils';

const PREFERENCE_KEY = 'fishcast:forecast-preferences:v1';
const INTERVALS: Array<{ id: ForecastInterval; label: string }> = [
  { id: '30m', label: '30 min' },
  { id: '1h', label: '1 hour' },
  { id: '3h', label: '3 hours' },
  { id: '6h', label: '6 hours' },
];
const VIEWS: Array<{ id: ForecastView; label: string }> = [
  { id: 'table', label: 'Table' },
  { id: 'graph', label: 'Graphs' },
  { id: 'timeline', label: 'Timeline' },
];

export interface ForecastSpotOption {
  slug: string;
  displayName: string;
}

interface Props {
  spotSlug: string;
  initialDate: string;
  initialInterval: ForecastInterval;
  initialView: ForecastView;
  initialScope: ForecastScope;
  spots: ForecastSpotOption[];
}

function isStoredPreference(value: unknown): value is {
  version: 1;
  interval: ForecastInterval;
  view: ForecastView;
} {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === 1 &&
    INTERVALS.some((item) => item.id === candidate.interval) &&
    VIEWS.some((item) => item.id === candidate.view)
  );
}

export function ForecastExperience({
  spotSlug,
  initialDate,
  initialInterval,
  initialView,
  initialScope,
  spots,
}: Props) {
  const { state, refetch } = useForecast(spotSlug, initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [interval, setInterval] = useState(initialInterval);
  const [view, setView] = useState(initialView);
  const [scope, setScope] = useState(initialScope);
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.has('interval') && search.has('view')) return;
    try {
      const parsed = JSON.parse(localStorage.getItem(PREFERENCE_KEY) ?? 'null') as unknown;
      if (isStoredPreference(parsed)) {
        if (!search.has('interval')) setInterval(parsed.interval);
        if (!search.has('view')) setView(parsed.view);
      }
    } catch {
      // Corrupt preferences safely fall back to URL/default state.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        PREFERENCE_KEY,
        JSON.stringify({ version: 1, interval, view })
      );
    } catch {
      // Private browsing/storage restrictions do not block the forecast.
    }
    const url = new URL(window.location.href);
    url.searchParams.set('date', selectedDate);
    url.searchParams.set('interval', interval);
    url.searchParams.set('view', view);
    url.searchParams.set('scope', scope);
    window.history.replaceState(null, '', url);
  }, [interval, scope, selectedDate, view]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    if (!state.data.days.some((day) => day.date === selectedDate)) {
      setSelectedDate(state.data.selectedDate);
    }
  }, [selectedDate, state]);

  const selectedDay =
    state.status === 'ready'
      ? state.data.days.find((day) => day.date === selectedDate) ?? state.data.days[0]
      : undefined;
  const periods = useMemo(() => {
    if (state.status !== 'ready') return [];
    const all = state.data.periods[interval];
    return periodsForScope(all, selectedDate, scope);
  }, [interval, scope, selectedDate, state]);
  const timelinePeriods = useMemo(
    () =>
      state.status === 'ready'
        ? state.data.periods['30m'].filter(
            (period) => period.date === selectedDate
          )
        : [],
    [selectedDate, state]
  );
  useEffect(() => {
    if (timelinePeriods.length === 0) return;
    const selectedMs = selectedTimestamp
      ? new Date(selectedTimestamp).getTime()
      : Number.NaN;
    const selectedStillInDay = timelinePeriods.some(
      (period) =>
        selectedMs >= new Date(period.start).getTime() &&
        selectedMs < new Date(period.end).getTime()
    );
    if (selectedStillInDay) return;
    const current = timelinePeriods.find((period) => period.markers.currentTime);
    const bestTime = selectedDay?.bestWindow?.peakTime;
    const best = bestTime
      ? timelinePeriods.find(
          (period) => period.start <= bestTime && period.end > bestTime
        )
      : undefined;
    setSelectedTimestamp((current ?? best ?? timelinePeriods[0])!.start);
  }, [selectedDay?.bestWindow?.peakTime, selectedTimestamp, timelinePeriods]);
  const selectedViewTimestamp = periods.find((period) => {
    if (!selectedTimestamp) return false;
    const selectedMs = new Date(selectedTimestamp).getTime();
    return (
      selectedMs >= new Date(period.start).getTime() &&
      selectedMs < new Date(period.end).getTime()
    );
  })?.start ?? null;
  const selectedTimelineTimestamp = timelinePeriods.find((period) => {
    if (!selectedTimestamp) return false;
    const selectedMs = new Date(selectedTimestamp).getTime();
    return (
      selectedMs >= new Date(period.start).getTime() &&
      selectedMs < new Date(period.end).getTime()
    );
  })?.start ?? null;
  const selectedReadout = timelinePeriods.find(
    (period) => period.start === selectedTimelineTimestamp
  );
  const comparisonTime = selectedDay?.bestWindow
    ? formatTimeLabel(selectedDay.bestWindow.peakTime)
    : '12:00';

  if (state.status === 'loading') {
    return (
      <PremiumCard className="space-y-4 p-4 sm:p-6" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-24" />)}</div>
        <Skeleton className="h-72 w-full" />
        <p className="sr-only" role="status">Loading seven-day fishing forecast</p>
      </PremiumCard>
    );
  }
  if (state.status === 'error' || !selectedDay) {
    return (
      <PremiumCard className="p-6">
        <h2 className="font-display text-h3">Forecast unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">{state.status === 'error' ? state.message : 'No forecast day is available.'}</p>
        <Button type="button" variant="outline" className="mt-4" onClick={refetch}><RotateCw aria-hidden />Retry</Button>
      </PremiumCard>
    );
  }

  const dayIndex = state.data.days.findIndex((day) => day.date === selectedDay.date);
  const interpretation =
    state.data.interpretations[selectedDay.date] ?? state.data.interpretation;

  return (
    <PremiumCard className="overflow-hidden p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" aria-hidden /><h2 className="font-display text-h2">Seven-day fishing forecast</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">{state.data.range.startDate}–{state.data.range.endDate} · Africa/Casablanca · updated {state.data.freshnessMinutes === null ? 'time unavailable' : `${state.data.freshnessMinutes} min ago`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Modelled data · not for navigation</span>
          <Button asChild variant="outline" size="sm">
            <a href="#spot-comparison">Compare spots</a>
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm"><span className="mb-1 block text-muted-foreground">Fishing spot</span><select value={spotSlug} onChange={(event) => { const url = new URL(`/spots/${event.target.value}`, window.location.origin); url.search = window.location.search; window.location.assign(url); }} className="h-10 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{spots.map((spot) => <option key={spot.slug} value={spot.slug}>{spot.displayName}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-muted-foreground">Forecast date</span><input type="date" value={selectedDate} min={state.data.range.startDate} max={state.data.range.endDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={dayIndex <= 0} onClick={() => setSelectedDate(state.data.days[dayIndex - 1]!.date)}><ChevronLeft aria-hidden />Previous</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDate(state.data.range.startDate)}>Today</Button>
        <Button type="button" variant="outline" size="sm" disabled={dayIndex >= state.data.days.length - 1} onClick={() => setSelectedDate(state.data.days[dayIndex + 1]!.date)}>Next<ChevronRight aria-hidden /></Button>
      </div>

      <div className="mt-5"><ForecastSummary day={selectedDay} /></div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-7" aria-label="Seven-day selector">
        {state.data.days.map((day) => (
          <button key={day.date} type="button" aria-pressed={selectedDate === day.date} onClick={() => setSelectedDate(day.date)} className={cn('min-w-40 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-w-0', selectedDate === day.date ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary/50')}>
            <span className="block text-sm font-medium">{formatDaySectionLabel(day.date, state.data.generatedAt)}</span>
            <span className="mt-1 block text-lg font-semibold tabular-nums">{day.fishing.score}</span>
            <span className="block text-xs text-muted-foreground">{day.fishing.label} · Safety {day.safety.status}</span>
            <span className="mt-1 block text-xs tabular-nums">Wave {day.maxWaveHeightM?.toFixed(1) ?? '—'} m · {wavePeriodLabel(day.representativeWavePeriodS)}</span>
            <span className="block text-xs tabular-nums">Wind {day.representativeWindKmh?.toFixed(0) ?? '—'} · {windLabel(day.representativeWindKmh)} · gust {day.maxWindGustKmh?.toFixed(0) ?? '—'}</span>
            <span className="block text-xs" aria-label={weatherLabel(day.weatherCode)}>{weatherSymbol(day.weatherCode)} {weatherLabel(day.weatherCode)}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{day.bestWindow ? `Best ${formatTimeLabel(day.bestWindow.start)}–${formatTimeLabel(day.bestWindow.end)}` : 'No recommended window'}</span>
          </button>
        ))}
      </div>

      {selectedReadout ? (
        <div className="sticky top-16 z-30 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-card/95 px-4 py-3 shadow-premium backdrop-blur md:static md:shadow-none" aria-live="polite">
          <span className="text-sm font-medium">Selected: {formatTimeLabel(selectedReadout.start)}</span>
          <span className="text-sm tabular-nums">Fishing {selectedReadout.fishing.score}/100 · {selectedReadout.fishing.label}</span>
          <span className="text-sm">Safety {selectedReadout.safety.status}</span>
          <span className="text-xs text-muted-foreground">{selectedReadout.dataQualityLabel}</span>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/10 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Forecast interval">{INTERVALS.map((item) => <button key={item.id} type="button" aria-pressed={interval === item.id} onClick={() => setInterval(item.id)} className={cn('rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', interval === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary')}>{item.label}</button>)}</div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Forecast range"><button type="button" aria-pressed={scope === 'day'} onClick={() => setScope('day')} className={cn('rounded-md px-3 py-2 text-sm', scope === 'day' ? 'bg-secondary text-foreground' : 'text-muted-foreground')}>Selected day</button><button type="button" aria-pressed={scope === 'seven-days'} onClick={() => { setScope('seven-days'); if (interval === '30m' || interval === '1h') setInterval('3h'); }} className={cn('hidden rounded-md px-3 py-2 text-sm md:inline-flex', scope === 'seven-days' ? 'bg-secondary text-foreground' : 'text-muted-foreground')}>All 7 days</button></div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Forecast view">{VIEWS.map((item) => <button key={item.id} type="button" aria-pressed={view === item.id} onClick={() => setView(item.id)} className={cn('rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', view === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary')}>{item.label}</button>)}</div>
      </div>

      <div className="mt-5">
        {view === 'table' ? <ForecastTable periods={periods} selectedTimestamp={selectedViewTimestamp} onSelectTimestamp={setSelectedTimestamp} /> : null}
        {view === 'graph' ? <ForecastGraphs periods={periods} selectedTimestamp={selectedViewTimestamp} onSelectTimestamp={setSelectedTimestamp} /> : null}
        {view === 'timeline' ? <ForecastTimeline periods={timelinePeriods} selectedTimestamp={selectedTimelineTimestamp} onSelectTimestamp={setSelectedTimestamp} /> : null}
      </div>

      <section className="mt-6 rounded-lg border border-border/70 p-5" aria-labelledby="interpretation-title">
        <h3 id="interpretation-title" className="font-display text-h3">What this means</h3>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="font-medium text-primary">Best period</dt><dd className="mt-1 text-muted-foreground">{interpretation.bestPeriod}</dd></div>
          <div><dt className="font-medium text-primary">Why</dt><dd className="mt-1 text-muted-foreground">{interpretation.qualityReason}</dd></div>
          <div><dt className="font-medium text-primary">Main safety concern</dt><dd className="mt-1 text-muted-foreground">{interpretation.safetyConcern}</dd></div>
          <div><dt className="font-medium text-primary">Technique</dt><dd className="mt-1 text-muted-foreground">{interpretation.technique}</dd></div>
          <div><dt className="font-medium text-primary">Data limits</dt><dd className="mt-1 text-muted-foreground">{interpretation.missingData} {interpretation.confidenceLimitation}</dd></div>
          <div><dt className="font-medium text-primary">Direction limit</dt><dd className="mt-1 text-muted-foreground">{interpretation.orientationLimitation}</dd></div>
        </dl>
      </section>

      <div id="spot-comparison" className="mt-6 scroll-mt-24"><ForecastComparison date={selectedDate} time={comparisonTime} /></div>
    </PremiumCard>
  );
}
