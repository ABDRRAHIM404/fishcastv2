import {
  PRODUCT_TIME_ZONE,
  productDateKey,
} from '@/lib/time/casablanca';

const DOMESTIC_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const LOCAL_DAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});

const LOCAL_DAY_WITH_YEAR_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const LOCAL_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: PRODUCT_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function diffDays(first: string, second: string): number {
  return Math.round(
    (dateFromKey(first).getTime() - dateFromKey(second).getTime()) /
      86_400_000
  );
}

function dayOffset(startIso: string, referenceIso: string): string {
  const startKey = parseIsoLocalDate(startIso);
  const referenceKey = parseIsoLocalDate(referenceIso);
  const difference = diffDays(startKey, referenceKey);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Tomorrow';
  return DOMESTIC_DATE_FORMAT.format(dateFromKey(startKey));
}

export function parseIsoLocalDate(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : productDateKey(iso);
}

export function formatTimeLabel(iso: string): string {
  return LOCAL_TIME_FORMAT.format(new Date(iso));
}

export function formatScrubberLabel(
  iso: string,
  referenceIso = new Date().toISOString()
): string {
  return `${dayOffset(iso, referenceIso)} · ${formatTimeLabel(iso)}`;
}

export function formatWindowLabel(
  startIso: string,
  endIso: string,
  referenceIso = new Date().toISOString()
): string {
  return `${dayOffset(startIso, referenceIso)} · ${formatTimeLabel(
    startIso
  )} – ${formatTimeLabel(endIso)}`;
}

export function formatDaySectionLabel(
  date: string,
  referenceIso = new Date().toISOString()
): string {
  const dayKey = parseIsoLocalDate(date);
  const referenceKey = parseIsoLocalDate(referenceIso);
  const difference = diffDays(dayKey, referenceKey);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Tomorrow';
  return LOCAL_DAY_FORMAT.format(dateFromKey(dayKey));
}

export function formatTimelineRange(
  startIso: string,
  endIso: string
): string {
  const startKey = parseIsoLocalDate(startIso);
  const endKey = parseIsoLocalDate(endIso);
  if (startKey === endKey) {
    return LOCAL_DAY_WITH_YEAR_FORMAT.format(dateFromKey(startKey));
  }
  return `${LOCAL_DAY_FORMAT.format(
    dateFromKey(startKey)
  )} – ${LOCAL_DAY_WITH_YEAR_FORMAT.format(dateFromKey(endKey))}`;
}
