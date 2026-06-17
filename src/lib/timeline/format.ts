const DOMESTIC_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const LOCAL_DAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

const LOCAL_DAY_WITH_YEAR_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
});

function localDayStart(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayOffset(startIso: string, now = new Date()): string {
  const start = new Date(startIso);
  const today = localDayStart(now.getTime());
  const pointDay = localDayStart(start.getTime());
  const diffDays = Math.round((pointDay - today) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return DOMESTIC_DATE_FORMAT.format(start);
}

export function formatTimeLabel(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

export function formatScrubberLabel(iso: string, now = new Date()): string {
  return `${dayOffset(iso, now)} · ${formatTimeLabel(iso)}`;
}

export function formatWindowLabel(
  startIso: string,
  endIso: string,
  now = new Date()
): string {
  return `${dayOffset(startIso, now)} · ${formatTimeLabel(startIso)} – ${formatTimeLabel(
    endIso
  )}`;
}

export function formatTimelineRange(
  startIso: string,
  endIso: string
): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startLabel = LOCAL_DAY_FORMAT.format(start);
  const endLabel = LOCAL_DAY_WITH_YEAR_FORMAT.format(end);

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  ) {
    return endLabel;
  }

  const endWithoutYear = LOCAL_DAY_FORMAT.format(end);
  return `${startLabel} – ${endWithoutYear} ${end.getFullYear()}`;
}
