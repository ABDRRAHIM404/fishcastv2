import { INTL_LOCALE, type Locale } from '@/i18n/config';
import { PRODUCT_TIME_ZONE, productDateKey } from '@/lib/time/casablanca';

const MISSING_VALUE = '—';

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function diffDays(first: string, second: string): number {
  return Math.round(
    (dateFromKey(first).getTime() - dateFromKey(second).getTime()) / 86_400_000
  );
}

export function parseForecastDate(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : productDateKey(iso);
}

export function formatTime(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: PRODUCT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export function formatShortDate(locale: Locale, date: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateFromKey(parseForecastDate(date)));
}

export function formatFullDate(locale: Locale, date: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateFromKey(parseForecastDate(date)));
}

export function formatDateTime(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: PRODUCT_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatGraphTimestamp(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: PRODUCT_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatDayLabel(
  locale: Locale,
  date: string,
  referenceIso: string,
  today: string,
  tomorrow: string
): string {
  const dateKey = parseForecastDate(date);
  const referenceKey = parseForecastDate(referenceIso);
  const difference = diffDays(dateKey, referenceKey);
  if (difference === 0) return today;
  if (difference === 1) return tomorrow;
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(dateFromKey(dateKey));
}

export function formatNumber(
  locale: Locale,
  value: number | null,
  options: Intl.NumberFormatOptions = {}
): string {
  if (value === null || !Number.isFinite(value)) return MISSING_VALUE;
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    useGrouping: false,
    ...options,
  }).format(value);
}

export function formatMeasurement(
  locale: Locale,
  value: number | null,
  unit: string,
  digits = 0
): string {
  if (value === null || !Number.isFinite(value)) return MISSING_VALUE;
  const separator = unit === '%' || unit === '°C' ? '' : ' ';
  return `${formatNumber(locale, value, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${separator}${unit}`;
}

export function formatScore(locale: Locale, value: number): string {
  return `${formatNumber(locale, value, { maximumFractionDigits: 1 })}/100`;
}

export function formatPercentage(locale: Locale, value: number): string {
  return `${formatNumber(locale, value, { maximumFractionDigits: 0 })}%`;
}

export function formatCoordinates(
  locale: Locale,
  latitude: number,
  longitude: number
): string {
  const options = { minimumFractionDigits: 4, maximumFractionDigits: 4 };
  const separator = locale === 'en' ? ', ' : ' ; ';
  return `${formatNumber(locale, latitude, options)}${separator}${formatNumber(locale, longitude, options)}`;
}

export function formatSeasonMonths(
  locale: Locale,
  months: readonly number[],
  allYear: string
): string | null {
  const valid = Array.from(
    new Set(months.filter((month) => Number.isInteger(month) && month >= 1 && month <= 12))
  ).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  if (valid.length === 12) return allYear;
  const formatter = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    month: 'short',
    timeZone: 'UTC',
  });
  const name = (month: number) => formatter.format(new Date(Date.UTC(2024, month - 1, 1)));
  const ranges: string[] = [];
  let start = valid[0]!;
  let previous = start;
  for (let index = 1; index <= valid.length; index++) {
    const current = valid[index];
    if (current !== previous + 1) {
      ranges.push(start === previous ? name(start) : `${name(start)}–${name(previous)}`);
      if (current !== undefined) start = current;
    }
    if (current !== undefined) previous = current;
  }
  return ranges.join(', ');
}
