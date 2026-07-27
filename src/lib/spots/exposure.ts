import { angularDifferenceDeg } from '@/lib/waves/derived';

export type ExposureVerification = 'unverified-editorial';
export type WindRelationship =
  | 'onshore'
  | 'offshore'
  | 'cross-shore'
  | 'unknown';
export type SwellRelationship =
  | 'head-on'
  | 'angled'
  | 'cross-shore'
  | 'from-land'
  | 'unknown';

export interface SpotExposureProfile {
  slug: string;
  aliases: string[];
  /**
   * Approximate bearing from land towards open water. These broad cardinal
   * values are editorial placeholders, not surveyed shoreline normals.
   */
  seawardBearingDeg: number;
  verification: ExposureVerification;
  staticHazards: string[];
  shelteredFrom: null;
  editorialNote: string;
}

export interface DirectionInterpretation {
  wind: WindRelationship;
  swell: SwellRelationship;
  sheltered: 'unknown';
  exposureVerification: ExposureVerification | 'missing';
}

const ATLANTIC_EDITORIAL_NOTE =
  'Unverified provisional west-facing Atlantic exposure; verify against local shoreline and access surveys.';

/**
 * Least-destructive exposure metadata for the six repository spots. Every
 * bearing is deliberately coarse and explicitly unverified. Safety output must
 * disclose that limitation rather than presenting it as measured geography.
 */
export const SPOT_EXPOSURE_PROFILES: Readonly<
  Record<string, SpotExposureProfile>
> = {
  'sidi-rbat': {
    slug: 'sidi-rbat',
    aliases: ["Sidi R'bat", 'Sidi R’bat'],
    seawardBearingDeg: 270,
    verification: 'unverified-editorial',
    staticHazards: ['sandbars', 'river-mouth influence'],
    shelteredFrom: null,
    editorialNote: ATLANTIC_EDITORIAL_NOTE,
  },
  tifnit: {
    slug: 'tifnit',
    aliases: ['Tifnit'],
    seawardBearingDeg: 270,
    verification: 'unverified-editorial',
    staticHazards: ['rock platform', 'swell exposure'],
    shelteredFrom: null,
    editorialNote: ATLANTIC_EDITORIAL_NOTE,
  },
  douira: {
    slug: 'douira',
    aliases: ['Douira'],
    seawardBearingDeg: 270,
    verification: 'unverified-editorial',
    staticHazards: ['mixed sand and rock'],
    shelteredFrom: null,
    editorialNote: ATLANTIC_EDITORIAL_NOTE,
  },
  massa: {
    slug: 'massa',
    aliases: ['Massa', 'Am9erss'],
    seawardBearingDeg: 270,
    verification: 'unverified-editorial',
    staticHazards: ['currents', 'shifting sandbars'],
    shelteredFrom: null,
    editorialNote:
      'Unverified repository conflict: the spot row is Massa while species seed comments call it Am9erss. Exposure and identity require local editorial verification.',
  },
  'sidi-boulfdail': {
    slug: 'sidi-boulfdail',
    aliases: ['Sidi Boulfdail'],
    seawardBearingDeg: 270,
    verification: 'unverified-editorial',
    staticHazards: ['remote access', 'open exposure'],
    shelteredFrom: null,
    editorialNote: ATLANTIC_EDITORIAL_NOTE,
  },
  aglou: {
    slug: 'aglou',
    aliases: ['Aglou'],
    seawardBearingDeg: 270,
    verification: 'unverified-editorial',
    staticHazards: ['mixed beach and rock'],
    shelteredFrom: null,
    editorialNote: ATLANTIC_EDITORIAL_NOTE,
  },
};

export function getSpotExposure(
  slug: string
): SpotExposureProfile | null {
  if (slug === 'am9erss') return SPOT_EXPOSURE_PROFILES.massa ?? null;
  return SPOT_EXPOSURE_PROFILES[slug] ?? null;
}

/**
 * Open-Meteo wind and wave bearings are directions they come from. A bearing
 * close to the seaward normal is therefore onshore/head-on.
 */
export function windRelationship(
  directionFromDeg: number | null,
  profile: SpotExposureProfile | null
): WindRelationship {
  if (directionFromDeg === null || !profile) return 'unknown';
  const difference = angularDifferenceDeg(
    directionFromDeg,
    profile.seawardBearingDeg
  );
  if (difference <= 45) return 'onshore';
  if (difference >= 135) return 'offshore';
  return 'cross-shore';
}

export function swellRelationship(
  directionFromDeg: number | null,
  profile: SpotExposureProfile | null
): SwellRelationship {
  if (directionFromDeg === null || !profile) return 'unknown';
  const difference = angularDifferenceDeg(
    directionFromDeg,
    profile.seawardBearingDeg
  );
  if (difference <= 30) return 'head-on';
  if (difference <= 70) return 'angled';
  if (difference <= 120) return 'cross-shore';
  return 'from-land';
}

export function interpretDirections(
  windDirectionFromDeg: number | null,
  swellDirectionFromDeg: number | null,
  profile: SpotExposureProfile | null
): DirectionInterpretation {
  return {
    wind: windRelationship(windDirectionFromDeg, profile),
    swell: swellRelationship(swellDirectionFromDeg, profile),
    sheltered: 'unknown',
    exposureVerification: profile?.verification ?? 'missing',
  };
}
