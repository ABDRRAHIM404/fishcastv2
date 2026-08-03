import { AlertTriangle, Clock3, Fish, ShieldCheck } from 'lucide-react';
import type {
  ForecastDailySummary,
  ForecastHumanInterpretation,
  ForecastPeriod,
} from '@/lib/forecast-ui/types';
import { formatTimeLabel } from '@/lib/timeline/format';
import { cn } from '@/lib/utils';

export function ForecastInsightPanel({
  day,
  selected,
  interpretation,
}: {
  day: ForecastDailySummary;
  selected: ForecastPeriod | null;
  interpretation: ForecastHumanInterpretation;
}) {
  const unsafe =
    day.safety.status === 'Dangerous' || day.safety.status === 'Unknown';
  return (
    <aside className="space-y-4 min-[1750px]:sticky min-[1750px]:top-4 min-[1750px]:self-start" aria-label="Forecast insight">
      <div
        className={cn(
          'rounded-xl border p-4',
          unsafe
            ? 'border-destructive/60 bg-destructive/15'
            : 'border-condition-good/30 bg-condition-good/5'
        )}
      >
        <div className="flex items-center gap-2">
          {unsafe ? <AlertTriangle className="size-5 text-condition-poor" aria-hidden /> : <ShieldCheck className="size-5 text-condition-good" aria-hidden />}
          <span className="font-medium">Safety {day.safety.status}</span>
        </div>
        <p className="mt-2 text-sm">{day.safety.primaryWarning ?? 'No active modelled warning.'}</p>
      </div>
      <div className="rounded-xl border border-border/70 bg-card/55 p-4">
        <p className="text-sm text-muted-foreground">Fishing quality</p>
        <p className="mt-1 font-display text-h2">{day.fishing.score}/100</p>
        <p className="text-sm">{day.fishing.label} · {day.confidence.label} confidence</p>
        <div className="mt-4 flex items-start gap-2 text-sm"><Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><span>{day.bestWindow ? `Best ${formatTimeLabel(day.bestWindow.start)}–${formatTimeLabel(day.bestWindow.end)}` : 'No recommended window'}</span></div>
        <div className="mt-2 flex items-start gap-2 text-sm"><Fish className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><span>{day.bestSpecies ?? 'No supported species match'}</span></div>
        {selected ? <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">Selected {formatTimeLabel(selected.start)} · {selected.fishing.score}/100 · Safety {selected.safety.status}<span className="mt-1 block">{selected.dataQualityLabel}</span></p> : null}
      </div>
      <div className="max-h-[42vh] overflow-y-auto rounded-xl border border-border/70 bg-card/55 p-4">
        <h3 className="font-display text-h3">What this means</h3>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="font-medium text-primary">Best period</dt><dd className="mt-0.5 text-muted-foreground">{interpretation.bestPeriod}</dd></div>
          <div><dt className="font-medium text-primary">Why</dt><dd className="mt-0.5 text-muted-foreground">{interpretation.qualityReason}</dd></div>
          <div><dt className="font-medium text-primary">Safety</dt><dd className="mt-0.5 text-muted-foreground">{interpretation.safetyConcern}</dd></div>
          <div><dt className="font-medium text-primary">Data limits</dt><dd className="mt-0.5 text-muted-foreground">{interpretation.missingData} {interpretation.confidenceLimitation}</dd></div>
          <div><dt className="font-medium text-primary">Orientation</dt><dd className="mt-0.5 text-muted-foreground">{interpretation.orientationLimitation}</dd></div>
        </dl>
      </div>
    </aside>
  );
}
