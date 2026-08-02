import { AlertTriangle, CheckCircle2, Clock3, Waves, Wind } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatTimeLabel } from '@/lib/timeline/format';
import type { ForecastDailySummary } from '@/lib/forecast-ui/types';

function qualityVariant(label: ForecastDailySummary['fishing']['label']) {
  if (label === 'Excellent') return 'excellent' as const;
  if (label === 'Good') return 'good' as const;
  if (label === 'Moderate') return 'moderate' as const;
  return 'poor' as const;
}

function safetyVariant(status: ForecastDailySummary['safety']['status']) {
  if (status === 'Safe') return 'good' as const;
  if (status === 'Caution') return 'moderate' as const;
  return 'poor' as const;
}

export function ForecastSummary({ day }: { day: ForecastDailySummary }) {
  return (
    <section aria-labelledby="forecast-summary-title" className="grid gap-3 lg:grid-cols-[1.25fr_1fr]">
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-caption uppercase tracking-[0.2em] text-muted-foreground">
              Fishing quality
            </p>
            <h3 id="forecast-summary-title" className="mt-1 font-display text-h2">
              {day.fishing.score}/100 · {day.fishing.label}
            </h3>
          </div>
          <Badge variant={qualityVariant(day.fishing.label)}>{day.fishing.grade}</Badge>
        </div>
        <div className="mt-4 flex items-start gap-2 text-sm">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p>
            {day.bestWindow ? (
              <>
                Best window: <strong>{formatTimeLabel(day.bestWindow.start)}–{formatTimeLabel(day.bestWindow.end)}</strong>
                {' '}({day.bestWindow.label}, {day.bestWindow.durationMinutes} min)
              </>
            ) : (
              day.noRecommendedWindowReason ?? 'No recommended window is available.'
            )}
          </p>
        </div>
        {day.bestSpecies ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Best matched in-season species: {day.bestSpecies}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Species match unavailable; FishCast does not invent a target.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {day.safety.status === 'Safe' ? (
              <CheckCircle2 className="size-5 text-condition-good" aria-hidden />
            ) : (
              <AlertTriangle className="size-5 text-condition-moderate" aria-hidden />
            )}
            <h3 className="font-display text-h3">Safety: {day.safety.status}</h3>
          </div>
          <Badge variant={safetyVariant(day.safety.status)}>
            {day.safety.score === null ? 'Not scored' : `${day.safety.score}/100`}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {day.safety.primaryWarning ??
            (day.safety.status === 'Safe'
              ? 'No active modelled warning. Always verify the shore locally.'
              : 'Safety inputs are incomplete.')}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2"><Waves className="size-4 text-primary" aria-hidden /><span>Max {day.maxWaveHeightM?.toFixed(1) ?? '—'} m</span></div>
          <div className="flex items-center gap-2"><Wind className="size-4 text-primary" aria-hidden /><span>Gust {day.maxWindGustKmh?.toFixed(0) ?? '—'} km/h</span></div>
        </dl>
        <p className="mt-4 text-xs text-muted-foreground">
          {day.confidence.label} confidence · {day.confidence.completenessPercentage}% complete
        </p>
      </div>
    </section>
  );
}

