'use client';

import { useEffect, useState } from 'react';
import { GitCompareArrows, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ForecastComparisonResponse } from '@/lib/forecast-ui/types';
import { isForecastComparisonResponse } from '@/lib/forecast-ui/validation';
import { formatTimeLabel } from '@/lib/timeline/format';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ForecastComparisonResponse };

export function ForecastComparison({ date, time }: { date: string; time: string }) {
  const [state, setState] = useState<State>({ status: 'idle' });
  useEffect(() => setState({ status: 'idle' }), [date, time]);

  async function load() {
    setState({ status: 'loading' });
    const params = new URLSearchParams({ date, time });
    try {
      const response = await fetch(`/api/forecast/compare?${params.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data: unknown = await response.json();
      if (!isForecastComparisonResponse(data)) {
        throw new Error('Comparison response was invalid.');
      }
      setState({ status: 'ready', data });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'Comparison unavailable' });
    }
  }

  if (state.status === 'idle') {
    return (
      <div className="rounded-lg border border-dashed border-border p-5 text-center">
        <GitCompareArrows className="mx-auto size-6 text-primary" aria-hidden />
        <h3 className="mt-2 font-display text-h3">Compare all six spots</h3>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">Loaded only when requested, using the selected date and time. Safer conditions rank before fishing quality.</p>
        <Button type="button" className="mt-4" onClick={() => void load()}>Compare spots at {time}</Button>
      </div>
    );
  }
  if (state.status === 'loading') {
    return <p className="flex min-h-16 items-center rounded-lg border border-primary/30 bg-primary/5 p-5 text-sm text-muted-foreground" role="status" aria-busy="true">Comparing cached forecasts across all spots…</p>;
  }
  if (state.status === 'error') {
    return <div className="rounded-lg border border-destructive/40 p-5"><p className="text-sm">Comparison could not be refreshed. Other forecast information remains available.</p><Button type="button" variant="control" size="sm" className="mt-3" onClick={() => void load()}><RotateCw aria-hidden />Retry comparison</Button></div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full min-w-[46rem] text-sm">
        <caption className="px-4 py-3 text-left font-display text-h3">Spot comparison · {formatTimeLabel(state.data.timestamp)}</caption>
        <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Spot</th><th className="px-3 py-3">Safety</th><th className="px-3 py-3">Fishing</th><th className="px-3 py-3">Waves</th><th className="px-3 py-3">Wind</th><th className="px-3 py-3">Confidence</th></tr></thead>
        <tbody>{state.data.items.map((item) => <tr key={item.spot.id} className="border-t border-border/60"><th scope="row" className="px-4 py-3 text-left">{item.spot.displayName}</th><td className="px-3 py-3">{item.safety.status}</td><td className="px-3 py-3 tabular-nums">{item.fishing.score}/100 · {item.fishing.label}</td><td className="px-3 py-3 tabular-nums">{item.waveHeightM?.toFixed(1) ?? '—'} m · {item.wavePeriodS?.toFixed(1) ?? '—'} s</td><td className="px-3 py-3 tabular-nums">{item.windSpeedKmh?.toFixed(0) ?? '—'} km/h · {item.windRelationship}</td><td className="px-3 py-3">{item.confidence.label} · {item.confidence.completenessPercentage}%</td></tr>)}</tbody>
      </table>
      {state.data.failures.length > 0 ? <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">Unavailable: {state.data.failures.join(', ')}</p> : null}
    </div>
  );
}
