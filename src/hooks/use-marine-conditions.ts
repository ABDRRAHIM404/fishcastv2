'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MarineConditions } from '@/types/marine';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: MarineConditions };

/**
 * Client hook that fetches normalized marine conditions for a spot from the
 * /api/marine route. Kept dependency-free and consistent with the codebase;
 * exposes loading / error / ready states and a refetch.
 */
export function useMarineConditions(spotId: string) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch(
        `/api/marine?spotId=${encodeURIComponent(spotId)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as MarineConditions;
      setState({ status: 'ready', data });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unavailable',
      });
    }
  }, [spotId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      await load();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, [load]);

  return { state, refetch: load };
}
