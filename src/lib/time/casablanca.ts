/** Product-wide civil timezone. Never infer fishing dates from the server zone. */
export const PRODUCT_TIME_ZONE = 'Africa/Casablanca';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const ZONED_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: PRODUCT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const LOCAL_DATE_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: PRODUCT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export interface ProductDayRange {
  date: string;
  startMs: number;
  endMs: number;
  startIso: string;
  endIso: string;
  durationMinutes: number;
}

function partsMap(
  formatter: Intl.DateTimeFormat,
  date: Date
): Map<string, string> {
  return new Map(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
}

function parseDateKey(date: string): [number, number, number] | null {
  const match = DATE_RE.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return [year, month, day];
}

export function isProductDate(value: string): boolean {
  return parseDateKey(value) !== null;
}

/** Returns the Africa/Casablanca calendar date for an absolute instant. */
export function productDateKey(value: Date | number | string): string {
  const date =
    value instanceof Date
      ? value
      : new Date(typeof value === 'number' ? value : value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid instant');
  }
  const parts = partsMap(LOCAL_DATE_PARTS, date);
  return `${parts.get('year')}-${parts.get('month')}-${parts.get('day')}`;
}

export function productMonth(value: Date = new Date()): number {
  const parts = partsMap(LOCAL_DATE_PARTS, value);
  return Number(parts.get('month'));
}

export function addProductDays(date: string, days: number): string {
  const parsed = parseDateKey(date);
  if (!parsed) throw new Error(`Invalid product date: ${date}`);
  const [year, month, day] = parsed;
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Offset of the product timezone at an absolute instant. Reconstructing the
 * formatted wall clock in UTC avoids relying on non-standard offset parsing.
 */
function zoneOffsetMs(epochMs: number): number {
  const parts = partsMap(ZONED_PARTS, new Date(epochMs));
  const asUtc = Date.UTC(
    Number(parts.get('year')),
    Number(parts.get('month')) - 1,
    Number(parts.get('day')),
    Number(parts.get('hour')),
    Number(parts.get('minute')),
    Number(parts.get('second'))
  );
  return asUtc - Math.trunc(epochMs / 1000) * 1000;
}

/** Converts a Casablanca wall-clock value into an unambiguous epoch. */
export function productDateTimeToEpochMs(
  date: string,
  hour = 0,
  minute = 0,
  second = 0
): number {
  const parsed = parseDateKey(date);
  if (!parsed) throw new Error(`Invalid product date: ${date}`);
  const [year, month, day] = parsed;
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  // Iterate because the offset used for the initial UTC guess can differ from
  // the offset at the resulting instant around a timezone transition.
  let epochMs = wallClockUtc;
  for (let iteration = 0; iteration < 4; iteration++) {
    const candidate = wallClockUtc - zoneOffsetMs(epochMs);
    if (candidate === epochMs) break;
    epochMs = candidate;
  }
  return epochMs;
}

/** Exact start-inclusive/end-exclusive range of a Casablanca calendar day. */
export function productDayRange(date: string): ProductDayRange {
  if (!isProductDate(date)) throw new Error(`Invalid product date: ${date}`);
  const startMs = productDateTimeToEpochMs(date);
  const endMs = productDateTimeToEpochMs(addProductDays(date, 1));
  return {
    date,
    startMs,
    endMs,
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
    durationMinutes: (endMs - startMs) / 60_000,
  };
}

export function todayProductDate(now: Date = new Date()): string {
  return productDateKey(now);
}

