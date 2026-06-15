'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AiRecommendationResponse } from '@/lib/ai/types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: AiRecommendationResponse };

/**
 * Client hook that fetches the structured AI recommendation for a spot from
 * POST /api/ai/recommend. Consistent with use-fishing-score / use-timeline:
 * plain fetch with loading / error / ready states and a refetch. The server
 * builds the deterministic context, so the client sends only the spotId.
 */
export function useAiRecommendation(spotId: string) {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spotId }),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as AiRecommendationResponse;
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
