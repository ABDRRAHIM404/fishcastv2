'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ScoreResult } from '@/lib/scoring/types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ScoreResult };

/**
 * Client hook that fetches the deterministic fishing score for a spot from
 * /api/score. Consistent with use-marine-conditions; exposes loading / error /
 * ready states and a refetch.
 */
export function useFishingScore(spotId: string) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch(
        `/api/score?spotId=${encodeURIComponent(spotId)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as ScoreResult;
      setState({ status: 'ready', data });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unavailable',
      });
    }
  }, [spotId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, refetch: load };
}
