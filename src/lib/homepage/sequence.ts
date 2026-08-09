import {
  HOME_STORY_SCENES,
  type HomeStoryScene,
} from '@/lib/homepage/story';

export type HomeSequenceVariant = 'desktop' | 'mobile';

export interface HomeSequenceManifest {
  variant: HomeSequenceVariant;
  sourceWidth: number;
  sourceHeight: number;
  baseUrl: `/homepage/sequence/v1/${HomeSequenceVariant}`;
  frameIds: readonly number[];
}

function frameIdsThrough(
  finalId: number,
  excludedIds: ReadonlySet<number>
): readonly number[] {
  return Object.freeze(
    Array.from({ length: finalId }, (_, index) => index + 1).filter(
      (id) => !excludedIds.has(id)
    )
  );
}

const DESKTOP_FRAME_IDS = frameIdsThrough(221, new Set([218]));
const MOBILE_FRAME_IDS = frameIdsThrough(227, new Set([218, 219]));

/**
 * The source IDs intentionally preserve gaps in the supplied sequences. UI
 * progress addresses the compact frameIds array, so a missing source ID can
 * never be turned into a request.
 */
export const HOME_SEQUENCE_MANIFESTS = {
  desktop: {
    variant: 'desktop',
    sourceWidth: 1280,
    sourceHeight: 720,
    baseUrl: '/homepage/sequence/v1/desktop',
    frameIds: DESKTOP_FRAME_IDS,
  },
  mobile: {
    variant: 'mobile',
    sourceWidth: 720,
    sourceHeight: 1280,
    baseUrl: '/homepage/sequence/v1/mobile',
    frameIds: MOBILE_FRAME_IDS,
  },
} as const satisfies Readonly<
  Record<HomeSequenceVariant, HomeSequenceManifest>
>;

export function clampSequenceProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Stateless scroll-to-frame lookup. The same progress always returns the same index. */
export function frameIndexForProgress(
  value: number,
  manifestOrFrameCount: HomeSequenceManifest | number
): number {
  const rawCount =
    typeof manifestOrFrameCount === 'number'
      ? manifestOrFrameCount
      : manifestOrFrameCount.frameIds.length;
  const frameCount = Number.isFinite(rawCount)
    ? Math.max(0, Math.floor(rawCount))
    : 0;
  if (frameCount <= 1) return 0;
  return Math.round(clampSequenceProgress(value) * (frameCount - 1));
}

/** Resolves normalized progress directly to a source frame ID. */
export function sequenceFrameAtProgress(
  value: number,
  frameNumbers: readonly number[]
): number | null {
  if (frameNumbers.length === 0) return null;
  return frameNumbers[frameIndexForProgress(value, frameNumbers.length)] ?? null;
}

/** Resolves a compact manifest index, returning null rather than inventing a URL. */
export function frameUrl(
  manifest: HomeSequenceManifest,
  frameIndex: number
): string | null {
  if (!Number.isInteger(frameIndex) || frameIndex < 0) return null;
  const sourceId = manifest.frameIds[frameIndex];
  if (sourceId === undefined) return null;
  return `${manifest.baseUrl}/frame_${String(sourceId).padStart(3, '0')}.webp`;
}

export interface HomeSequenceVariantInput {
  /** Measure the sticky stage, not the browser window. */
  width: number;
  height: number;
  previousVariant?: HomeSequenceVariant | null;
}

function validDimension(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Chooses the asset composition from the rendered container. Separate enter
 * and exit thresholds provide hysteresis during sidebar and resize changes.
 * Locale and document direction are deliberately not inputs.
 */
export function selectSequenceVariant(
  input: HomeSequenceVariantInput
): HomeSequenceVariant {
  if (!validDimension(input.width) || !validDimension(input.height)) {
    return input.previousVariant ?? 'mobile';
  }

  const aspectRatio = input.width / input.height;
  if (input.previousVariant === 'desktop') {
    return input.width < 640 || aspectRatio < 0.88 ? 'mobile' : 'desktop';
  }
  if (input.previousVariant === 'mobile') {
    return input.width >= 760 && aspectRatio > 1.12 ? 'desktop' : 'mobile';
  }
  return input.width >= 700 && aspectRatio >= 1.02 ? 'desktop' : 'mobile';
}

export type HomeSequenceMode = 'static' | 'economy' | 'full';

export interface HomeSequenceCapabilityInput {
  canvas2d: boolean;
  reducedMotion: boolean;
  width: number;
  height: number;
  saveData?: boolean;
  effectiveType?: string | null;
  hardwareConcurrency?: number | null;
  deviceMemory?: number | null;
}

function knownPositiveCapability(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;
}

/** Selects a network and decoded-memory budget without user-agent sniffing. */
export function selectSequenceMode(
  input: HomeSequenceCapabilityInput
): HomeSequenceMode {
  if (
    !input.canvas2d ||
    input.reducedMotion ||
    input.saveData === true ||
    !validDimension(input.width) ||
    !validDimension(input.height) ||
    input.width < 280 ||
    input.height < 400 ||
    input.effectiveType === 'slow-2g' ||
    input.effectiveType === '2g'
  ) {
    return 'static';
  }

  const hardwareConcurrency = knownPositiveCapability(input.hardwareConcurrency);
  const deviceMemory = knownPositiveCapability(input.deviceMemory);
  if (
    input.effectiveType === '3g' ||
    (hardwareConcurrency !== null && hardwareConcurrency <= 2) ||
    (deviceMemory !== null && deviceMemory <= 2) ||
    input.width < 360 ||
    input.height < 600
  ) {
    return 'economy';
  }

  return 'full';
}

export type HomeSequenceDirection = 'forward' | 'backward' | 'stationary';

export const HOME_SEQUENCE_NARRATIVE_PROGRESS = [
  0,
  0.25,
  0.48,
  0.76,
  1,
] as const;

export interface HomeSequenceLoadPlanInput {
  manifest: HomeSequenceManifest;
  targetIndex: number;
  previousIndex?: number | null;
  mode: HomeSequenceMode;
}

function boundedFrameIndex(value: number, frameCount: number): number {
  if (frameCount <= 1 || !Number.isFinite(value)) return 0;
  return Math.min(frameCount - 1, Math.max(0, Math.round(value)));
}

function directionForIndices(
  targetIndex: number,
  previousIndex: number | null | undefined
): HomeSequenceDirection {
  if (!Number.isFinite(previousIndex)) return 'stationary';
  if (targetIndex > (previousIndex as number)) return 'forward';
  if (targetIndex < (previousIndex as number)) return 'backward';
  return 'stationary';
}

function indicesByProximity(
  indices: readonly number[],
  targetIndex: number,
  direction: HomeSequenceDirection
): number[] {
  const directionSign = direction === 'forward' ? 1 : direction === 'backward' ? -1 : 0;
  return [...indices].sort((left, right) => {
    const distanceDifference =
      Math.abs(left - targetIndex) - Math.abs(right - targetIndex);
    if (distanceDifference !== 0) return distanceDifference;
    if (directionSign !== 0) {
      const leftFavoured = Math.sign(left - targetIndex) === directionSign;
      const rightFavoured = Math.sign(right - targetIndex) === directionSign;
      if (leftFavoured !== rightFavoured) return leftFavoured ? -1 : 1;
    }
    return left - right;
  });
}

/**
 * Produces a deterministic, bounded request plan. The current target is first,
 * followed by direction-aware neighbours, narrative anchors, and coarse idle
 * anchors. Consumers may stop at any point without invalidating the plan.
 */
export function sequenceLoadPriority(
  input: HomeSequenceLoadPlanInput
): readonly number[] {
  const frameCount = input.manifest.frameIds.length;
  if (input.mode === 'static' || frameCount === 0) return [];

  const targetIndex = boundedFrameIndex(input.targetIndex, frameCount);
  const previousIndex =
    input.previousIndex === null || input.previousIndex === undefined
      ? input.previousIndex
      : boundedFrameIndex(input.previousIndex, frameCount);
  const direction = directionForIndices(targetIndex, previousIndex);
  const directionSign = direction === 'backward' ? -1 : 1;
  const result: number[] = [];
  const seen = new Set<number>();
  const add = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= frameCount || seen.has(index)) {
      return;
    }
    seen.add(index);
    result.push(index);
  };

  add(targetIndex);
  const neighbourOffsets =
    input.mode === 'full'
      ? [directionSign, directionSign * 2, -directionSign, directionSign * 3, -directionSign * 2]
      : [directionSign, -directionSign];
  neighbourOffsets.forEach((offset) => add(targetIndex + offset));

  const narrativeAnchors = HOME_SEQUENCE_NARRATIVE_PROGRESS.map((progress) =>
    frameIndexForProgress(progress, frameCount)
  );
  indicesByProximity(narrativeAnchors, targetIndex, direction).forEach(add);

  const coarseStep = input.mode === 'full' ? 8 : 18;
  const coarseAnchors: number[] = [];
  for (let index = 0; index < frameCount; index += coarseStep) {
    coarseAnchors.push(index);
  }
  coarseAnchors.push(frameCount - 1);
  indicesByProximity(coarseAnchors, targetIndex, direction).forEach(add);

  return result;
}

/** Selects the closest decoded frame, preferring the direction of travel on ties. */
export function nearestLoadedFrame(
  targetIndex: number,
  loadedIndices: readonly number[],
  frameCount: number,
  direction: HomeSequenceDirection = 'stationary'
): number | null {
  if (!Number.isFinite(frameCount) || frameCount <= 0) return null;
  const count = Math.floor(frameCount);
  const target = boundedFrameIndex(targetIndex, count);
  const candidates = [...new Set(loadedIndices)].filter(
    (index) => Number.isInteger(index) && index >= 0 && index < count
  );
  if (candidates.length === 0) return null;

  return candidates.reduce((best, candidate) => {
    const candidateDistance = Math.abs(candidate - target);
    const bestDistance = Math.abs(best - target);
    if (candidateDistance < bestDistance) return candidate;
    if (candidateDistance > bestDistance) return best;

    if (direction === 'forward') {
      const candidateAhead = candidate >= target;
      const bestAhead = best >= target;
      if (candidateAhead !== bestAhead) return candidateAhead ? candidate : best;
    } else if (direction === 'backward') {
      const candidateBehind = candidate <= target;
      const bestBehind = best <= target;
      if (candidateBehind !== bestBehind) return candidateBehind ? candidate : best;
    }
    return Math.min(best, candidate);
  });
}

export interface CanvasCoverCrop {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  destinationX: number;
  destinationY: number;
  destinationWidth: number;
  destinationHeight: number;
}

const EMPTY_CROP: CanvasCoverCrop = {
  sourceX: 0,
  sourceY: 0,
  sourceWidth: 0,
  sourceHeight: 0,
  destinationX: 0,
  destinationY: 0,
  destinationWidth: 0,
  destinationHeight: 0,
};

function normalizedFocus(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

/** Returns source cropping coordinates for CanvasRenderingContext2D.drawImage. */
export function canvasCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  destinationWidth: number,
  destinationHeight: number,
  focusX?: number,
  focusY?: number
): CanvasCoverCrop {
  if (
    !validDimension(sourceWidth) ||
    !validDimension(sourceHeight) ||
    !validDimension(destinationWidth) ||
    !validDimension(destinationHeight)
  ) {
    return { ...EMPTY_CROP };
  }

  const sourceAspect = sourceWidth / sourceHeight;
  const destinationAspect = destinationWidth / destinationHeight;
  let croppedWidth = sourceWidth;
  let croppedHeight = sourceHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceAspect > destinationAspect) {
    croppedWidth = sourceHeight * destinationAspect;
    sourceX = (sourceWidth - croppedWidth) * normalizedFocus(focusX);
  } else if (sourceAspect < destinationAspect) {
    croppedHeight = sourceWidth / destinationAspect;
    sourceY = (sourceHeight - croppedHeight) * normalizedFocus(focusY);
  }

  return {
    sourceX,
    sourceY,
    sourceWidth: croppedWidth,
    sourceHeight: croppedHeight,
    destinationX: 0,
    destinationY: 0,
    destinationWidth,
    destinationHeight,
  };
}

export interface HomeStoryTextWindow {
  enterStart: number;
  visibleStart: number;
  visibleEnd: number;
  exitEnd: number;
}

/** Provider-neutral timing for the localized semantic story overlays. */
export const HOME_STORY_TEXT_WINDOWS = {
  ocean: { enterStart: 0, visibleStart: 0, visibleEnd: 0.17, exitEnd: 0.21 },
  spot: { enterStart: 0.24, visibleStart: 0.265, visibleEnd: 0.405, exitEnd: 0.445 },
  conditions: { enterStart: 0.475, visibleStart: 0.505, visibleEnd: 0.69, exitEnd: 0.73 },
  decision: { enterStart: 0.765, visibleStart: 0.795, visibleEnd: 0.91, exitEnd: 0.965 },
} as const satisfies Readonly<Record<HomeStoryScene, HomeStoryTextWindow>>;

function smoothstep(value: number): number {
  const progress = clampSequenceProgress(value);
  return progress * progress * (3 - 2 * progress);
}

export function homeSceneOpacity(scene: HomeStoryScene, value: number): number {
  const progress = clampSequenceProgress(value);
  const window = HOME_STORY_TEXT_WINDOWS[scene];
  if (progress < window.enterStart || progress > window.exitEnd) return 0;
  if (progress < window.visibleStart) {
    const span = window.visibleStart - window.enterStart;
    return span <= 0 ? 1 : smoothstep((progress - window.enterStart) / span);
  }
  if (progress <= window.visibleEnd) return 1;
  const span = window.exitEnd - window.visibleEnd;
  return span <= 0 ? 0 : 1 - smoothstep((progress - window.visibleEnd) / span);
}

/** Returns null in copy gaps and the final dissolve so inactive controls can be inert. */
export function activeHomeScene(
  value: number,
  minimumOpacity = 0.5
): HomeStoryScene | null {
  const threshold = Number.isFinite(minimumOpacity)
    ? Math.min(1, Math.max(0, minimumOpacity))
    : 0.5;
  let active: HomeStoryScene | null = null;
  let activeOpacity = 0;
  for (const scene of HOME_STORY_SCENES) {
    const opacity = homeSceneOpacity(scene, value);
    if (opacity > 0 && opacity >= threshold && opacity > activeOpacity) {
      active = scene;
      activeOpacity = opacity;
    }
  }
  return active;
}

/** Explicit sequence-facing names used by the cinematic presentation layer. */
export const homeSequenceSceneOpacity = homeSceneOpacity;
export const homeSequenceSceneAt = activeHomeScene;

/** Singular alias retained for concise renderer imports. */
export const HOME_SEQUENCE_MANIFEST = HOME_SEQUENCE_MANIFESTS;
