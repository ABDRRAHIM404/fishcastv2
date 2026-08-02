'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ForecastContextResponse } from '@/lib/forecast-ui/types';
import { isForecastContextResponse } from '@/lib/forecast-ui/validation';

type ForecastState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ForecastContextResponse };

export function useForecast(spot: string, date: string) {
  const [state, setState] = useState<ForecastState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    const params = new URLSearchParams({ spot, date });
    void fetch(`/api/forecast?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? `Request failed (${response.status})`);
        }
        const data: unknown = await response.json();
        if (!isForecastContextResponse(data)) {
          throw new Error('Forecast response was invalid.');
        }
        return data;
      })
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Forecast unavailable',
        });
      });
    return () => controller.abort();
  }, [attempt, date, spot]);

  return { state, refetch };
}
