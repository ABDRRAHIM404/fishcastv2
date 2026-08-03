'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCw,
} from 'lucide-react';
import { ForecastComparison } from '@/components/forecast/forecast-comparison';
import { ForecastConditions } from '@/components/forecast/forecast-conditions';
import { ForecastInsightPanel } from '@/components/forecast/forecast-insight-panel';
import { ForecastOverview } from '@/components/forecast/forecast-overview';
import { ForecastTable } from '@/components/forecast/forecast-table';
import { ForecastTimeline } from '@/components/forecast/forecast-timeline';
import { PremiumCard } from '@/components/spot/premium-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useForecast } from '@/hooks/use-forecast';
import {
  forecastRefreshLabel,
  primeBrowserForecast,
  providerAvailability,
} from '@/lib/forecast-ui/browser-cache';
import type {
  ForecastInterval,
  ForecastScope,
  ForecastView,
} from '@/lib/forecast-ui/types';
import { formatDaySectionLabel, formatTimeLabel } from '@/lib/timeline/format';
import { wavePeriodLabel, weatherLabel, weatherSymbol, windLabel } from '@/lib/forecast-ui/labels';
import { periodsForScope } from '@/lib/forecast-ui/query';
import { isUrgentSafetyStatus } from '@/lib/forecast-ui/presentation';
import { cn } from '@/lib/utils';
import type {
  ForecastNavigationIntent,
  SpotPageSection,
} from '@/lib/spot-page/state';

const ForecastGraphs = dynamic(
  () =>
    import('@/components/forecast/forecast-graphs').then(
      (module) => module.ForecastGraphs
    ),
  {
    loading: () => (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-11 w-full max-w-xl" />
        <Skeleton className="h-80 w-full" />
        <p className="sr-only" role="status">
          Loading forecast graphs
        </p>
      </div>
    ),
  }
);

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
  mode: 'overview' | 'forecast' | 'conditions' | 'inactive';
  spotSlug: string;
  initialDate: string;
  initialInterval: ForecastInterval;
  initialView: ForecastView;
  initialScope: ForecastScope;
  spots: ForecastSpotOption[];
  navigationIntent: ForecastNavigationIntent;
  onNavigate: (
    section: SpotPageSection,
    options?: { view?: ForecastView; comparison?: boolean }
  ) => void;
  onSpotSwitchStart?: (spot: ForecastSpotOption) => void;
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
  mode,
  spotSlug,
  initialDate,
  initialInterval,
  initialView,
  initialScope,
  spots,
  navigationIntent,
  onNavigate,
  onSpotSwitchStart,
}: Props) {
  const router = useRouter();
  const [isNavigatingSpot, startSpotNavigation] = useTransition();
  const [activeSpotSlug, setActiveSpotSlug] = useState(spotSlug);
  const { state, refetch, isSlow } = useForecast(activeSpotSlug, initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [interval, setInterval] = useState(initialInterval);
  const [view, setView] = useState(initialView);
  const [scope, setScope] = useState(initialScope);
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useEffect(() => setActiveSpotSlug(spotSlug), [spotSlug]);

  useEffect(() => {
    if (navigationIntent.token === 0) return;
    if (navigationIntent.view) setView(navigationIntent.view);
    if (navigationIntent.comparison) {
      window.setTimeout(() => {
        document.getElementById('spot-comparison')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 50);
    }
  }, [navigationIntent]);

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
    setPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (preferenceLoaded) {
      try {
        localStorage.setItem(
          PREFERENCE_KEY,
          JSON.stringify({ version: 1, interval, view })
        );
      } catch {
        // Private browsing/storage restrictions do not block the forecast.
      }
    }
    const url = new URL(window.location.href);
    url.searchParams.set('date', selectedDate);
    url.searchParams.set('interval', interval);
    url.searchParams.set('view', view);
    url.searchParams.set('scope', scope);
    window.history.replaceState(null, '', url);
  }, [interval, preferenceLoaded, scope, selectedDate, view]);

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

  function switchSpot(nextSlug: string) {
    if (nextSlug === activeSpotSlug) return;
    const destination = spots.find((item) => item.slug === nextSlug);
    if (!destination) return;
    setActiveSpotSlug(nextSlug);
    setSelectedTimestamp(null);
    onSpotSwitchStart?.(destination);
    primeBrowserForecast(nextSlug, selectedDate);
    const url = new URL(window.location.href);
    url.pathname = `/spots/${nextSlug}`;
    url.searchParams.set('date', selectedDate);
    url.searchParams.set('section', 'forecast');
    startSpotNavigation(() => {
      router.push(`${url.pathname}${url.search}`);
    });
  }

  if (mode === 'inactive') return null;

  if (state.status === 'loading') {
    return (
      <PremiumCard className="space-y-4 p-4 sm:p-6" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">{Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-24" />)}</div>
        <Skeleton className="h-72 w-full" />
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin text-primary" aria-hidden />{isSlow ? 'Getting the latest marine conditions…' : 'Loading marine conditions…'}</p>
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
  const availability = providerAvailability(state.data);
  const refreshLabel = forecastRefreshLabel({
    refreshing: state.refreshing,
    sourceAgeMinutes: state.data.freshnessMinutes,
    refreshFailed: state.refreshError !== null,
  });
  const statusPanel =
    refreshLabel || availability.message || isNavigatingSpot ? (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
          availability.status === 'unavailable' || state.refreshError
            ? 'border-destructive/45 bg-destructive/10'
            : 'border-primary/30 bg-primary/5'
        )}
        role="status"
        aria-live="polite"
      >
        <div>
          <p className="font-medium">
            {isNavigatingSpot
              ? `Updating ${spots.find((item) => item.slug === activeSpotSlug)?.displayName ?? 'spot'} forecast…`
              : refreshLabel ?? 'Partial forecast data'}
          </p>
          {availability.message ? (
            <p className="mt-0.5 text-muted-foreground">{availability.message}</p>
          ) : null}
          {state.refreshError ? (
            <p className="mt-0.5 text-muted-foreground">{state.refreshError}</p>
          ) : null}
        </div>
        {availability.status !== 'complete' || state.refreshError ? (
          <Button type="button" size="sm" variant="control" onClick={refetch}>
            <RotateCw aria-hidden />Retry unavailable data
          </Button>
        ) : null}
      </div>
    ) : null;

  if (mode === 'overview') {
    return (
      <div className="space-y-4">
        {statusPanel}
        <ForecastOverview
          day={selectedDay}
          current={selectedReadout ?? null}
          interpretation={interpretation}
          freshnessMinutes={state.data.freshnessMinutes}
          onOpenForecast={(nextView, comparison) =>
            onNavigate('forecast', { view: nextView, comparison })
          }
          onOpenSpecies={() => onNavigate('species')}
          onOpenGuide={() => onNavigate('guide')}
        />
      </div>
    );
  }

  if (mode === 'conditions') {
    return (
      <div className="space-y-4">
        {statusPanel}
        <ForecastConditions
          period={selectedReadout ?? null}
          freshnessMinutes={state.data.freshnessMinutes}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
    {statusPanel}
    {isUrgentSafetyStatus(selectedDay.safety.status) ? (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/60 bg-destructive/15 p-4" role="alert">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-condition-poor" aria-hidden />
        <div><p className="font-semibold">Safety {selectedDay.safety.status}</p><p className="mt-1 text-sm">{selectedDay.safety.primaryWarning ?? 'Safety cannot be assessed from the available marine inputs.'}</p><p className="mt-1 text-xs text-muted-foreground">This warning overrides fishing scores and best-window recommendations.</p></div>
      </div>
    ) : null}
    <PremiumCard className="overflow-hidden p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" aria-hidden /><h2 className="font-display text-h2">Seven-day fishing forecast</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">{state.data.range.startDate}–{state.data.range.endDate} · Africa/Casablanca · updated {state.data.freshnessMinutes === null ? 'time unavailable' : `${state.data.freshnessMinutes} min ago`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Modelled data · not for navigation</span>
          <Button asChild variant="control" size="sm">
            <a href="#spot-comparison">Compare spots</a>
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm"><span className="mb-1 block text-muted-foreground">Fishing spot</span><select value={activeSpotSlug} aria-busy={isNavigatingSpot} onChange={(event) => switchSpot(event.target.value)} className="min-h-11 w-full cursor-pointer rounded-md border border-border/90 bg-card/55 px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-busy:cursor-progress aria-busy:border-primary/60">{spots.map((spot) => <option key={spot.slug} value={spot.slug}>{spot.displayName}</option>)}</select></label>
        <label className="text-sm"><span className="mb-1 block text-muted-foreground">Forecast date</span><input type="date" value={selectedDate} min={state.data.range.startDate} max={state.data.range.endDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-h-11 w-full rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="control" disabled={dayIndex <= 0} onClick={() => setSelectedDate(state.data.days[dayIndex - 1]!.date)}><ChevronLeft aria-hidden />Previous</Button>
        <Button type="button" variant={selectedDate === state.data.range.startDate ? 'controlActive' : 'control'} aria-pressed={selectedDate === state.data.range.startDate} onClick={() => setSelectedDate(state.data.range.startDate)}>Today</Button>
        <Button type="button" variant="control" disabled={dayIndex >= state.data.days.length - 1} onClick={() => setSelectedDate(state.data.days[dayIndex + 1]!.date)}>Next<ChevronRight aria-hidden /></Button>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 lg:grid lg:grid-cols-7" aria-label="Seven-day selector">
        {state.data.days.map((day) => (
          <Button key={day.date} type="button" variant={selectedDate === day.date ? 'controlActive' : 'control'} aria-pressed={selectedDate === day.date} onClick={() => setSelectedDate(day.date)} className="h-auto min-w-48 shrink-0 flex-col items-stretch justify-start whitespace-normal p-4 text-left text-sm lg:min-w-0 lg:p-3">
            <span className="block text-sm font-medium">{formatDaySectionLabel(day.date, state.data.generatedAt)}</span>
            <span className="mt-1 block text-lg font-semibold tabular-nums">{day.fishing.score}</span>
            <span className="block text-sm text-muted-foreground">{day.fishing.label} · Safety {day.safety.status}</span>
            <span className="mt-1 block text-sm tabular-nums">Wave {day.maxWaveHeightM?.toFixed(1) ?? '—'} m · {wavePeriodLabel(day.representativeWavePeriodS)}</span>
            <span className="block text-sm tabular-nums">Wind {day.representativeWindKmh?.toFixed(0) ?? '—'} · {windLabel(day.representativeWindKmh)}</span>
            <span className="block text-sm" aria-label={weatherLabel(day.weatherCode)}>{weatherSymbol(day.weatherCode)} {weatherLabel(day.weatherCode)}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{day.bestWindow ? `Best ${formatTimeLabel(day.bestWindow.start)}–${formatTimeLabel(day.bestWindow.end)}` : 'No recommended window'}</span>
          </Button>
        ))}
      </div>

      {selectedReadout ? (
        <div className="sticky top-[7.5rem] z-20 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-card/95 px-4 py-3 shadow-premium backdrop-blur md:static md:shadow-none" aria-live="polite">
          <span className="text-sm font-medium">Selected: {formatTimeLabel(selectedReadout.start)}</span>
          <span className="text-sm tabular-nums">Fishing {selectedReadout.fishing.score}/100 · {selectedReadout.fishing.label}</span>
          <span className="text-sm">Safety {selectedReadout.safety.status}</span>
          <span className="text-xs text-muted-foreground">{selectedReadout.dataQualityLabel}</span>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/10 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Forecast interval">{INTERVALS.map((item) => <Button key={item.id} type="button" size="sm" variant={interval === item.id ? 'controlActive' : 'control'} aria-pressed={interval === item.id} onClick={() => setInterval(item.id)} className="shrink-0">{item.label}</Button>)}</div>
        <div className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Forecast range"><Button type="button" size="sm" variant={scope === 'day' ? 'controlActive' : 'control'} aria-pressed={scope === 'day'} onClick={() => setScope('day')} className="shrink-0">Selected day</Button><Button type="button" size="sm" variant={scope === 'seven-days' ? 'controlActive' : 'control'} aria-pressed={scope === 'seven-days'} onClick={() => { setScope('seven-days'); if (interval === '30m' || interval === '1h') setInterval('3h'); }} className="shrink-0">All 7 days</Button></div>
        <div className="flex gap-1 overflow-x-auto pb-1" role="group" aria-label="Forecast view">{VIEWS.map((item) => <Button key={item.id} type="button" size="sm" variant={view === item.id ? 'controlActive' : 'control'} aria-pressed={view === item.id} onClick={() => setView(item.id)} className="shrink-0">{item.label}</Button>)}</div>
      </div>
    </PremiumCard>
      <div className="grid min-w-0 gap-5 min-[1750px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className={cn('min-w-0 rounded-xl border border-border/70 bg-card/35 sm:p-5', view === 'table' ? 'p-0' : 'p-4')}>
          {view === 'table' ? <ForecastTable periods={periods} selectedTimestamp={selectedViewTimestamp} onSelectTimestamp={setSelectedTimestamp} /> : null}
          {view === 'graph' ? <ForecastGraphs periods={periods} selectedTimestamp={selectedViewTimestamp} onSelectTimestamp={setSelectedTimestamp} /> : null}
          {view === 'timeline' ? <ForecastTimeline periods={timelinePeriods} selectedTimestamp={selectedTimelineTimestamp} onSelectTimestamp={setSelectedTimestamp} /> : null}
        </div>
        <ForecastInsightPanel day={selectedDay} selected={selectedReadout ?? null} interpretation={interpretation} />
      </div>
      <div id="spot-comparison" className="scroll-mt-24"><ForecastComparison date={selectedDate} time={comparisonTime} /></div>
    </div>
  );
}
