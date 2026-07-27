import type { AstronomyConditions } from '@/types/marine';
import { productDateKey } from '@/lib/time/casablanca';

const OFFICIAL_ZENITH_DEG = 90.833;
const CIVIL_ZENITH_DEG = 96;

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function radToDeg(value: number): number {
  return (value * 180) / Math.PI;
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function normalizeHours(value: number): number {
  return ((value % 24) + 24) % 24;
}

function dayOfYear(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const start = Date.UTC(year!, 0, 1);
  const current = Date.UTC(year!, month! - 1, day!);
  return Math.floor((current - start) / 86_400_000) + 1;
}

/**
 * NOAA-style sunrise equation. The result is an estimated absolute UTC event
 * suitable for daylight classification, not a surveyed/navigation timestamp.
 */
function solarEvent(
  date: string,
  latitude: number,
  longitude: number,
  sunrise: boolean,
  zenithDeg: number
): string | null {
  const [year, month, day] = date.split('-').map(Number);
  if (![year, month, day, latitude, longitude].every(Number.isFinite)) {
    return null;
  }

  const n = dayOfYear(date);
  const longitudeHour = longitude / 15;
  const approximateTime =
    n + ((sunrise ? 6 : 18) - longitudeHour) / 24;
  const meanAnomaly = 0.9856 * approximateTime - 3.289;
  const trueLongitude = normalizeDegrees(
    meanAnomaly +
      1.916 * Math.sin(degToRad(meanAnomaly)) +
      0.02 * Math.sin(degToRad(2 * meanAnomaly)) +
      282.634
  );

  let rightAscension = normalizeDegrees(
    radToDeg(Math.atan(0.91764 * Math.tan(degToRad(trueLongitude))))
  );
  const longitudeQuadrant = Math.floor(trueLongitude / 90) * 90;
  const raQuadrant = Math.floor(rightAscension / 90) * 90;
  rightAscension = (rightAscension + longitudeQuadrant - raQuadrant) / 15;

  const sinDeclination = 0.39782 * Math.sin(degToRad(trueLongitude));
  const cosDeclination = Math.cos(Math.asin(sinDeclination));
  const cosHour =
    (Math.cos(degToRad(zenithDeg)) -
      sinDeclination * Math.sin(degToRad(latitude))) /
    (cosDeclination * Math.cos(degToRad(latitude)));
  if (cosHour > 1 || cosHour < -1) return null;

  const hourAngle = sunrise
    ? 360 - radToDeg(Math.acos(cosHour))
    : radToDeg(Math.acos(cosHour));
  const localMeanTime =
    hourAngle / 15 +
    rightAscension -
    0.06571 * approximateTime -
    6.622;
  const utcHours = normalizeHours(localMeanTime - longitudeHour);
  const epochMs =
    Date.UTC(year!, month! - 1, day!) + utcHours * 3_600_000;
  return new Date(epochMs).toISOString();
}

export function daylightStateAt(
  instant: string | Date,
  times: Pick<
    AstronomyConditions,
    'sunrise' | 'sunset' | 'civilDawn' | 'civilDusk'
  >
): AstronomyConditions['daylightState'] {
  const ms =
    instant instanceof Date ? instant.getTime() : new Date(instant).getTime();
  if (
    Number.isNaN(ms) ||
    !times.sunrise ||
    !times.sunset ||
    !times.civilDawn ||
    !times.civilDusk
  ) {
    return 'unknown';
  }
  const sunrise = new Date(times.sunrise).getTime();
  const sunset = new Date(times.sunset).getTime();
  const dawn = new Date(times.civilDawn).getTime();
  const dusk = new Date(times.civilDusk).getTime();
  if (ms >= sunrise && ms < sunset) return 'daylight';
  if ((ms >= dawn && ms < sunrise) || (ms >= sunset && ms < dusk)) {
    return 'civil-twilight';
  }
  return 'night';
}

export function calculateAstronomy(
  latitude: number,
  longitude: number,
  observedAt: Date = new Date()
): AstronomyConditions {
  const date = productDateKey(observedAt);
  const sunrise = solarEvent(
    date,
    latitude,
    longitude,
    true,
    OFFICIAL_ZENITH_DEG
  );
  const sunset = solarEvent(
    date,
    latitude,
    longitude,
    false,
    OFFICIAL_ZENITH_DEG
  );
  const civilDawn = solarEvent(
    date,
    latitude,
    longitude,
    true,
    CIVIL_ZENITH_DEG
  );
  const civilDusk = solarEvent(
    date,
    latitude,
    longitude,
    false,
    CIVIL_ZENITH_DEG
  );
  const daylightState = daylightStateAt(observedAt, {
    sunrise,
    sunset,
    civilDawn,
    civilDusk,
  });

  return {
    observedAt: observedAt.toISOString(),
    source: 'calculated-noaa',
    sunrise,
    sunset,
    civilDawn,
    civilDusk,
    daylightState,
    isDaylight:
      daylightState === 'unknown' ? null : daylightState === 'daylight',
    moonPhase: null,
    moonIlluminationPct: null,
    moonTransitScore: null,
    timeOfDayScore: null,
  };
}

