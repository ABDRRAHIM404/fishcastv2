'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Timeline } from '@/lib/timeline/types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: Timeline };

/**
 * Client hook that fetches the interpolated 5-minute marine timeline for a spot
 * from /api/timeline. Consistent with use-marine-conditions / use-fishing-score.
 * Date is optional (defaults to the spot's local today on the server).
 */
export function useTimeline(spotId: string, date?: string) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const qs = new URLSearchParams({ spotId });
      if (date) qs.set('date', date);
      const res = await fetch(`/api/timeline?${qs.toString()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as Timeline;
      setState({ status: 'ready', data });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unavailable',
      });
    }
  }, [spotId, date]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, refetch: load };
}
