'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  forecastRequestIdentity,
  readBrowserForecast,
  subscribeForecastRequest,
  type ForecastCacheFreshness,
} from '@/lib/forecast-ui/browser-cache';
import type { ForecastContextResponse } from '@/lib/forecast-ui/types';

export type ForecastState =
  | { status: 'loading'; requestKey: string }
  | { status: 'error'; requestKey: string; message: string }
  | {
      status: 'ready';
      requestKey: string;
      data: ForecastContextResponse;
      cacheFreshness: ForecastCacheFreshness | 'network';
      refreshing: boolean;
      refreshError: string | null;
    };

function initialForecastState(spot: string, date: string): ForecastState {
  const requestKey = forecastRequestIdentity(spot).key;
  const cached = readBrowserForecast(spot, date);
  return cached
    ? {
        status: 'ready',
        requestKey,
        data: cached.data,
        cacheFreshness: cached.freshness,
        refreshing: cached.freshness === 'stale',
        refreshError: null,
      }
    : { status: 'loading', requestKey };
}

export function useForecast(spot: string, date: string) {
  const requestKey = useMemo(
    () => forecastRequestIdentity(spot).key,
    [spot]
  );
  const [state, setState] = useState<ForecastState>(() =>
    initialForecastState(spot, date)
  );
  const [retry, setRetry] = useState({ key: '', token: 0 });
  const [isSlow, setIsSlow] = useState(false);

  const refetch = useCallback(
    () => setRetry((current) => ({ key: requestKey, token: current.token + 1 })),
    [requestKey]
  );

  useEffect(() => {
    let active = true;
    setIsSlow(false);
    const cached = readBrowserForecast(spot, date);
    const forced = retry.key === requestKey && retry.token > 0;
    const shouldRequest =
      forced || !cached || cached.freshness === 'stale';

    if (cached) {
      setState({
        status: 'ready',
        requestKey,
        data: cached.data,
        cacheFreshness: cached.freshness,
        refreshing: shouldRequest,
        refreshError: null,
      });
    } else {
      setState({ status: 'loading', requestKey });
    }
    if (!shouldRequest) return;

    const slowTimer = window.setTimeout(() => setIsSlow(true), 1_200);
    const request = subscribeForecastRequest(spot, date);
    void request.promise
      .then((data) => {
        if (!active) return;
        setRetry((current) =>
          current.key === requestKey ? { key: '', token: current.token } : current
        );
        setState({
          status: 'ready',
          requestKey,
          data,
          cacheFreshness: 'network',
          refreshing: false,
          refreshError: null,
        });
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : 'Forecast could not be refreshed. Please try again.';
        if (cached) {
          setState({
            status: 'ready',
            requestKey,
            data: cached.data,
            cacheFreshness: cached.freshness,
            refreshing: false,
            refreshError: message,
          });
        } else {
          setState({ status: 'error', requestKey, message });
        }
      })
      .finally(() => {
        window.clearTimeout(slowTimer);
        if (active) setIsSlow(false);
      });

    return () => {
      active = false;
      window.clearTimeout(slowTimer);
      request.release();
    };
  }, [date, requestKey, retry, spot]);

  const visibleState =
    state.requestKey === requestKey
      ? state
      : initialForecastState(spot, date);

  return { state: visibleState, refetch, isSlow };
}
