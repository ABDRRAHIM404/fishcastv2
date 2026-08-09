import type {
  ForecastComparisonResponse,
  ForecastContextResponse,
  ForecastStreamEvent,
} from '@/lib/forecast-ui/types';

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isForecastContextResponse(
  value: unknown
): value is ForecastContextResponse {
  const body = record(value);
  const spot = record(body?.spot);
  const range = record(body?.range);
  const periods = record(body?.periods);
  return Boolean(
    body?.schemaVersion === 1 &&
      (body.coverage === 'today' || body.coverage === 'week') &&
      body.timeZone === 'Africa/Casablanca' &&
      typeof spot?.id === 'string' &&
      typeof spot.slug === 'string' &&
      typeof range?.startDate === 'string' &&
      typeof range.endDate === 'string' &&
      Array.isArray(body.days) &&
      Array.isArray(periods?.['30m']) &&
      Array.isArray(periods['1h']) &&
      Array.isArray(periods['3h']) &&
      Array.isArray(periods['6h'])
  );
}

export function isForecastStreamEvent(
  value: unknown
): value is ForecastStreamEvent {
  const body = record(value);
  if (body?.type === 'error') {
    return (
      (body.stage === 'today' || body.stage === 'week') &&
      body.code === 'forecast_unavailable'
    );
  }
  if (body?.type !== 'today' && body?.type !== 'week') return false;
  if (typeof body.elapsedMs !== 'number' || !Number.isFinite(body.elapsedMs)) {
    return false;
  }
  const data = body.data;
  if (!isForecastContextResponse(data)) return false;
  if (body.type === 'today') return data.coverage === 'today';
  return (
    data.coverage === 'week' &&
    (body.cacheStatus === 'hit' ||
      body.cacheStatus === 'miss' ||
      body.cacheStatus === 'coalesced')
  );
}

export function isForecastComparisonResponse(
  value: unknown
): value is ForecastComparisonResponse {
  const body = record(value);
  return Boolean(
    body?.schemaVersion === 1 &&
      typeof body.date === 'string' &&
      typeof body.timestamp === 'string' &&
      Array.isArray(body.items) &&
      Array.isArray(body.failures)
  );
}
