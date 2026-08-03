'use client';

import { useEffect, useState } from 'react';
import { GitCompareArrows, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ForecastComparisonResponse } from '@/lib/forecast-ui/types';
import { isForecastComparisonResponse } from '@/lib/forecast-ui/validation';
import { useI18n } from '@/i18n/provider';
import { formatMeasurement, formatPercentage, formatScore, formatTime } from '@/i18n/formatting';
import { confidenceStatus, fishingStatus, safetyStatus, windRelationshipStatus } from '@/i18n/presentation';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: ForecastComparisonResponse };

export function ForecastComparison({ date, time }: { date: string; time: string }) {
  const { locale, t } = useI18n();
  const [state, setState] = useState<State>({ status: 'idle' });
  useEffect(() => setState({ status: 'idle' }), [date, time]);

  async function load() {
    setState({ status: 'loading' });
    const params = new URLSearchParams({ date, time });
    try {
      const response = await fetch(`/api/forecast/compare?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data: unknown = await response.json();
      if (!isForecastComparisonResponse(data)) throw new Error('Comparison response was invalid.');
      setState({ status: 'ready', data });
    } catch {
      setState({ status: 'error' });
    }
  }

  if (state.status === 'idle') {
    return (
      <div className="rounded-lg border border-dashed border-border p-5 text-center">
        <GitCompareArrows className="mx-auto size-6 text-primary" aria-hidden />
        <h3 className="mt-2 font-display text-h3">{t('comparison.title')}</h3>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{t('comparison.description')}</p>
        <Button type="button" className="mt-4" onClick={() => void load()}>{t('comparison.load', { time })}</Button>
      </div>
    );
  }
  if (state.status === 'loading') return <p className="flex min-h-16 items-center rounded-lg border border-primary/30 bg-primary/5 p-5 text-sm text-muted-foreground" role="status" aria-busy="true">{t('comparison.loading')}</p>;
  if (state.status === 'error') return <div className="rounded-lg border border-destructive/40 p-5"><p className="text-sm">{t('comparison.error')}</p><Button type="button" variant="control" size="sm" className="mt-3" onClick={() => void load()}><RotateCw aria-hidden />{t('comparison.retry')}</Button></div>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full min-w-[46rem] text-sm">
        <caption className="px-4 py-3 text-start font-display text-h3">{t('comparison.caption', { time: formatTime(locale, state.data.timestamp) })}</caption>
        <thead className="bg-muted/30 text-start text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">{t('comparison.spot')}</th><th className="px-3 py-3">{t('comparison.safety')}</th><th className="px-3 py-3">{t('comparison.fishing')}</th><th className="px-3 py-3">{t('comparison.waves')}</th><th className="px-3 py-3">{t('comparison.wind')}</th><th className="px-3 py-3">{t('comparison.confidence')}</th></tr></thead>
        <tbody>{state.data.items.map((item) => <tr key={item.spot.id} className="border-t border-border/60"><th scope="row" className="px-4 py-3 text-start">{item.spot.displayName}</th><td className="px-3 py-3">{safetyStatus(t, item.safety.status)}</td><td className="px-3 py-3 tabular-nums">{formatScore(locale, item.fishing.score)} · {fishingStatus(t, item.fishing.label)}</td><td className="px-3 py-3 tabular-nums" dir="ltr">{formatMeasurement(locale, item.waveHeightM, 'm', 1)} · {formatMeasurement(locale, item.wavePeriodS, 's', 1)}</td><td className="px-3 py-3 tabular-nums">{formatMeasurement(locale, item.windSpeedKmh, 'km/h')} · {windRelationshipStatus(t, item.windRelationship)}</td><td className="px-3 py-3">{confidenceStatus(t, item.confidence.label)} · {formatPercentage(locale, item.confidence.completenessPercentage)}</td></tr>)}</tbody>
      </table>
      {state.data.failures.length > 0 ? <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{t('comparison.unavailable', { spots: state.data.failures.join(', ') })}</p> : null}
    </div>
  );
}
