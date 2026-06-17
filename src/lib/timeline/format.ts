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

function parseIsoLocalDate(iso: string): string {
  return iso.slice(0, 10);
}

function parseIsoLocalDateParts(iso: string): [number, number, number] {
  return iso.slice(0, 10).split('-').map(Number) as [number, number, number];
}

function parseIsoLocalTime(iso: string): string {
  return iso.slice(11, 16);
}

function formatLocalDate(dateParts: [number, number, number], format: Intl.DateTimeFormat): string {
  const [year, month, day] = dateParts;
  return format.format(new Date(Date.UTC(year, month - 1, day)));
}

function dayOffset(startIso: string, referenceIso: string): string {
  const [startYear, startMonth, startDay] = parseIsoLocalDateParts(startIso);
  const [refYear, refMonth, refDay] = parseIsoLocalDateParts(referenceIso);
  const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const referenceDate = new Date(Date.UTC(refYear, refMonth - 1, refDay));
  const diffDays = Math.round((startDate.getTime() - referenceDate.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return formatLocalDate([startYear, startMonth, startDay], DOMESTIC_DATE_FORMAT);
}

export function formatTimeLabel(iso: string): string {
  return parseIsoLocalTime(iso);
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
  return `${dayOffset(startIso, referenceIso)} · ${formatTimeLabel(startIso)} – ${formatTimeLabel(
    endIso
  )}`;
}

export function formatDaySectionLabel(
  date: string,
  referenceIso = new Date().toISOString()
): string {
  const [dayYear, dayMonth, dayDay] = parseIsoLocalDateParts(date);
  const [refYear, refMonth, refDay] = parseIsoLocalDateParts(referenceIso);
  const dayDate = new Date(Date.UTC(dayYear, dayMonth - 1, dayDay));
  const referenceDate = new Date(Date.UTC(refYear, refMonth - 1, refDay));
  const diffDays = Math.round((dayDate.getTime() - referenceDate.getTime()) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return formatLocalDate([dayYear, dayMonth, dayDay], LOCAL_DAY_FORMAT);
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

export { parseIsoLocalDate };
