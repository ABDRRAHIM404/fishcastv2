import type {
  ForecastInterval,
  ForecastScope,
  ForecastView,
} from '@/lib/forecast-ui/types';
import { addProductDays, isProductDate } from '@/lib/time/casablanca';

const INTERVALS: readonly ForecastInterval[] = ['30m', '1h', '3h', '6h'];
const VIEWS: readonly ForecastView[] = ['table', 'graph', 'timeline'];
const SCOPES: readonly ForecastScope[] = ['day', 'seven-days'];

export function isForecastInterval(
  value: string | null
): value is ForecastInterval {
  return value !== null && INTERVALS.includes(value as ForecastInterval);
}

export function isForecastView(value: string | null): value is ForecastView {
  return value !== null && VIEWS.includes(value as ForecastView);
}

export function isForecastScope(
  value: string | null
): value is ForecastScope {
  return value !== null && SCOPES.includes(value as ForecastScope);
}

export function dateInForecastRange(date: string, startDate: string): boolean {
  return (
    isProductDate(date) &&
    date >= startDate &&
    date <= addProductDays(startDate, 6)
  );
}

export function validClockTime(value: string | null): value is string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour! >= 0 && hour! <= 23 && minute! >= 0 && minute! <= 59;
}

export const FORECAST_UI_DEFAULTS = {
  interval: '3h' as ForecastInterval,
  view: 'table' as ForecastView,
  scope: 'day' as ForecastScope,
} as const;

export function periodsForScope<T extends { date: string }>(
  periods: T[],
  selectedDate: string,
  scope: ForecastScope
): T[] {
  return scope === 'seven-days'
    ? periods
    : periods.filter((period) => period.date === selectedDate);
}
