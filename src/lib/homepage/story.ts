export const HOME_STORY_SCENES = [
  'ocean',
  'spot',
  'conditions',
  'decision',
] as const;

export type HomeStoryScene = (typeof HOME_STORY_SCENES)[number];

export const HOME_STORY_BOUNDARIES = {
  ocean: [0, 0.25],
  spot: [0.25, 0.48],
  conditions: [0.48, 0.76],
  decision: [0.76, 1],
} as const satisfies Readonly<Record<HomeStoryScene, readonly [number, number]>>;

export const HOME_CTA_ROUTES = {
  forecast: '/forecast',
  map: '/map',
  spots: '/spots',
} as const;

export const HOME_MOTION_PREFERENCE_KEY = 'fishcast_home_motion_v1';

export type HomeMotionMode = 'auto' | 'lite' | 'reduced';

export function clampStoryProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function storySceneAt(value: number): HomeStoryScene {
  const progress = clampStoryProgress(value);
  if (progress < HOME_STORY_BOUNDARIES.ocean[1]) return 'ocean';
  if (progress < HOME_STORY_BOUNDARIES.spot[1]) return 'spot';
  if (progress < HOME_STORY_BOUNDARIES.conditions[1]) return 'conditions';
  return 'decision';
}

export function sceneProgress(scene: HomeStoryScene, value: number): number {
  const progress = clampStoryProgress(value);
  const [start, end] = HOME_STORY_BOUNDARIES[scene];
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

export function parseHomeMotionPreference(value: string | null): HomeMotionMode {
  if (!value) return 'auto';
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return 'auto';
    const candidate = parsed as Record<string, unknown>;
    return candidate.version === 1 &&
      (candidate.mode === 'auto' ||
        candidate.mode === 'lite' ||
        candidate.mode === 'reduced')
      ? candidate.mode
      : 'auto';
  } catch {
    return 'auto';
  }
}

export function shouldUseStaticStory(
  prefersReducedMotion: boolean,
  preference: HomeMotionMode
): boolean {
  return prefersReducedMotion || preference === 'reduced';
}

export interface HomeSpotCoordinate {
  id: string;
  latitude: number;
  longitude: number;
}

export interface HomeSpotPosition extends HomeSpotCoordinate {
  /** East remains right and north remains up, including in an RTL document. */
  xPercent: number;
  yPercent: number;
}

export function normalizeSpotPositions(
  spots: readonly HomeSpotCoordinate[]
): HomeSpotPosition[] {
  const valid = spots.filter(
    (spot) => Number.isFinite(spot.latitude) && Number.isFinite(spot.longitude)
  );
  if (valid.length === 0) return [];

  const latitudes = valid.map((spot) => spot.latitude);
  const longitudes = valid.map((spot) => spot.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeRange = maxLatitude - minLatitude;
  const longitudeRange = maxLongitude - minLongitude;

  return valid.map((spot) => ({
    ...spot,
    xPercent:
      longitudeRange === 0
        ? 50
        : 16 + ((spot.longitude - minLongitude) / longitudeRange) * 68,
    yPercent:
      latitudeRange === 0
        ? 50
        : 16 + ((maxLatitude - spot.latitude) / latitudeRange) * 68,
  }));
}
