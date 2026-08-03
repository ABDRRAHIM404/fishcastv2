import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Fish,
  ShieldAlert,
  Waves,
  Wind,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  ForecastDailySummary,
  ForecastHumanInterpretation,
  ForecastPeriod,
  ForecastView,
} from '@/lib/forecast-ui/types';
import { formatValue, wavePeriodLabel, windLabel } from '@/lib/forecast-ui/labels';
import { formatDaySectionLabel, formatTimeLabel } from '@/lib/timeline/format';
import { cn } from '@/lib/utils';
import { isUrgentSafetyStatus } from '@/lib/forecast-ui/presentation';

interface Props {
  day: ForecastDailySummary;
  current: ForecastPeriod | null;
  interpretation: ForecastHumanInterpretation;
  freshnessMinutes: number | null;
  onOpenForecast: (view?: ForecastView, comparison?: boolean) => void;
  onOpenSpecies: () => void;
  onOpenGuide: () => void;
}

export function ForecastOverview({
  day,
  current,
  interpretation,
  freshnessMinutes,
  onOpenForecast,
  onOpenSpecies,
  onOpenGuide,
}: Props) {
  const safetyDominant = isUrgentSafetyStatus(day.safety.status);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{formatDaySectionLabel(day.date)} · {day.date} · Africa/Casablanca</p>
          <h2 className="font-display text-h2">Should you fish here?</h2>
        </div>
        <span className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground">
          Updated {freshnessMinutes === null ? 'time unavailable' : `${freshnessMinutes} min ago`}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section
          className={cn(
            'rounded-xl border p-5',
            safetyDominant
              ? 'order-first border-destructive/60 bg-destructive/15 sm:col-span-2'
              : 'border-border bg-muted/10'
          )}
          aria-labelledby="overview-safety-title"
        >
          <div className="flex items-center gap-3">
            {day.safety.status === 'Safe' ? (
              <CheckCircle2 className="size-7 text-condition-good" aria-hidden />
            ) : (
              <ShieldAlert className="size-7 text-condition-poor" aria-hidden />
            )}
            <div>
              <p className="text-sm text-muted-foreground">Safety</p>
              <h3 id="overview-safety-title" className="font-display text-h2">
                {day.safety.status}
              </h3>
            </div>
          </div>
          <p className="mt-3 text-base">
            {day.safety.primaryWarning ??
              (day.safety.status === 'Safe'
                ? 'No active modelled warning. Verify access and shore conditions locally.'
                : 'Safety cannot be assessed from the available inputs.')}
          </p>
        </section>

        <section className="rounded-xl border border-primary/35 bg-primary/5 p-5" aria-labelledby="overview-fishing-title">
          <p className="text-sm text-muted-foreground">Fishing quality</p>
          <h3 id="overview-fishing-title" className="mt-1 font-display text-h2">
            {day.fishing.score}/100 · {day.fishing.label}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {day.confidence.completenessPercentage}% · {day.confidence.label} confidence
          </p>
          {safetyDominant ? (
            <p className="mt-3 flex items-start gap-2 text-sm text-condition-poor">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              Fishing quality does not override the {day.safety.status.toLowerCase()} safety assessment.
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-muted/10 p-5" aria-labelledby="overview-window-title">
          <p className="text-sm text-muted-foreground">Best recommended window</p>
          <h3 id="overview-window-title" className="mt-1 font-display text-h3">
            {day.bestWindow
              ? `${formatTimeLabel(day.bestWindow.start)}–${formatTimeLabel(day.bestWindow.end)}`
              : 'No recommended window'}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {day.bestSpecies
              ? `Matched target: ${day.bestSpecies}`
              : 'No supported target-species match is available.'}
          </p>
        </section>
      </div>

      <section aria-labelledby="current-conditions-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">At {current ? formatTimeLabel(current.start) : '—'}</p>
            <h3 id="current-conditions-title" className="font-display text-h3">Current conditions</h3>
          </div>
          <Button type="button" variant="control" size="sm" onClick={() => onOpenForecast('timeline')}>Open timeline</Button>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-border p-4"><dt className="flex items-center gap-2 text-sm text-muted-foreground"><Wind className="size-4 text-primary" aria-hidden />Wind</dt><dd className="mt-2 text-base font-semibold tabular-nums">{formatValue(current?.wind.speedKmh ?? null, ' km/h')}</dd><dd className="text-sm text-muted-foreground">{windLabel(current?.wind.speedKmh ?? null)}</dd></div>
          <div className="rounded-xl border border-border p-4"><dt className="flex items-center gap-2 text-sm text-muted-foreground"><Waves className="size-4 text-primary" aria-hidden />Waves</dt><dd className="mt-2 text-base font-semibold tabular-nums">{formatValue(current?.waves.heightM ?? null, ' m', 1)}</dd><dd className="text-sm text-muted-foreground">{current?.waves.derived.seaState ?? 'Unavailable'}</dd></div>
          <div className="rounded-xl border border-border p-4"><dt className="text-sm text-muted-foreground">Wave period</dt><dd className="mt-2 text-base font-semibold tabular-nums">{formatValue(current?.waves.periodS ?? null, ' s', 1)}</dd><dd className="text-sm text-muted-foreground">{wavePeriodLabel(current?.waves.periodS ?? null)}</dd></div>
          <div className="rounded-xl border border-border p-4"><dt className="text-sm text-muted-foreground">Modelled tide</dt><dd className="mt-2 text-base font-semibold tabular-nums">{formatValue(current?.tide.heightM ?? null, ' m', 2)}</dd><dd className="text-sm capitalize text-muted-foreground">{current?.tide.trend ?? 'Unavailable'}</dd></div>
        </dl>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/50 p-5" aria-labelledby="overview-meaning-title">
        <h3 id="overview-meaning-title" className="font-display text-h3">FishCast recommendation</h3>
        <p className="mt-2 text-base text-muted-foreground">{interpretation.qualityReason}</p>
        <p className="mt-2 text-sm text-muted-foreground">{interpretation.confidenceLimitation}</p>
      </section>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Spot actions">
        <Button type="button" className="min-h-12" onClick={() => onOpenForecast('table')}><CalendarDays aria-hidden />Detailed forecast</Button>
        <Button type="button" className="min-h-12" variant="control" onClick={() => onOpenForecast('graph')}><BarChart3 aria-hidden />View graphs</Button>
        <Button type="button" className="min-h-12" variant="control" onClick={onOpenSpecies}><Fish aria-hidden />Species</Button>
        <Button type="button" className="min-h-12" variant="control" onClick={onOpenGuide}><BookOpen aria-hidden />Spot guide</Button>
        <Button type="button" className="min-h-12" variant="control" onClick={() => onOpenForecast('table', true)}><Waves aria-hidden />Compare spots</Button>
      </div>
    </div>
  );
}
