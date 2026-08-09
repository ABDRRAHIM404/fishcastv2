import type { HomeStoryScene } from './story';

export type Home3DQuality = 'fallback' | 'low' | 'medium' | 'high';

export type Home3DComposition = 'portrait' | 'landscape';

export interface Home3DQualityInput {
  /** Result of an explicit WebGL support check, not a user-agent guess. */
  webgl: boolean;
  reducedMotion: boolean;
  width: number;
  height: number;
  dpr: number;
  coarsePointer: boolean;
  hardwareConcurrency?: number | null;
  deviceMemory?: number | null;
  saveData?: boolean;
}

export interface Home3DQualitySettings {
  enabled: boolean;
  maxDpr: number;
  oceanSegments: number;
  coastSegments: number;
  /** Deterministic point count for the single atmospheric draw call. */
  particles: number;
  /** Tube/path subdivisions for marine signal curves. */
  curveSegments: number;
  antialias: boolean;
  shadows: boolean;
}

/**
 * Every numeric detail setting is non-decreasing from fallback to high. This
 * makes a tier safe to use as a single rendering budget rather than combining
 * unrelated capability guesses inside visual components.
 */
export const HOME_3D_QUALITY_SETTINGS = {
  fallback: {
    enabled: false,
    maxDpr: 0,
    oceanSegments: 0,
    coastSegments: 0,
    particles: 0,
    curveSegments: 0,
    antialias: false,
    shadows: false,
  },
  low: {
    enabled: true,
    maxDpr: 1,
    oceanSegments: 24,
    coastSegments: 16,
    particles: 10,
    curveSegments: 16,
    antialias: false,
    shadows: false,
  },
  medium: {
    enabled: true,
    maxDpr: 1.25,
    oceanSegments: 48,
    coastSegments: 32,
    particles: 28,
    curveSegments: 32,
    antialias: true,
    shadows: false,
  },
  high: {
    enabled: true,
    maxDpr: 1.6,
    oceanSegments: 72,
    coastSegments: 48,
    particles: 72,
    curveSegments: 48,
    antialias: true,
    shadows: false,
  },
} as const satisfies Readonly<Record<Home3DQuality, Home3DQualitySettings>>;

function validPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function knownCapability(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;
}

/**
 * Selects a conservative initial rendering budget from observable capability
 * signals. Locale is intentionally not an input: neither rendering quality nor
 * the geographic world changes when the document direction changes.
 */
export function selectHome3DQuality(input: Home3DQualityInput): Home3DQuality {
  if (!input.webgl || input.reducedMotion) return 'fallback';
  if (
    !validPositive(input.width) ||
    !validPositive(input.height) ||
    !validPositive(input.dpr) ||
    input.width < 280 ||
    input.height < 400
  ) {
    return 'fallback';
  }

  const hardwareConcurrency = knownCapability(input.hardwareConcurrency);
  const deviceMemory = knownCapability(input.deviceMemory);

  if (
    input.saveData === true ||
    (hardwareConcurrency !== null && hardwareConcurrency <= 2) ||
    (deviceMemory !== null && deviceMemory <= 2) ||
    input.width < 360 ||
    input.height < 600
  ) {
    return 'low';
  }

  const strongDesktop =
    !input.coarsePointer &&
    input.width >= 1100 &&
    input.height >= 650 &&
    input.dpr <= 2.5 &&
    (hardwareConcurrency === null || hardwareConcurrency >= 8) &&
    (deviceMemory === null || deviceMemory >= 8);

  if (strongDesktop) return 'high';

  const mediumCapability =
    (hardwareConcurrency === null || hardwareConcurrency >= 4) &&
    (deviceMemory === null || deviceMemory >= 4);

  return mediumCapability ? 'medium' : 'low';
}

export type Home3DVector = readonly [x: number, y: number, z: number];

export interface Home3DCameraPose {
  position: Home3DVector;
  target: Home3DVector;
  fov: number;
}

export interface Home3DCameraKeyframe extends Home3DCameraPose {
  progress: number;
}

type CameraJourney = readonly [
  Home3DCameraKeyframe,
  Home3DCameraKeyframe,
  ...Home3DCameraKeyframe[],
];

/**
 * Portrait uses the same world path with a higher, more centred composition.
 * The geographic scene itself is never mirrored for an RTL locale.
 */
export const HOME_3D_CAMERA_KEYFRAMES = {
  landscape: [
    { progress: 0, position: [0, 6, 18], target: [0, 0, -4], fov: 47 },
    { progress: 0.18, position: [0, 4.8, 9], target: [0, 0.1, -8], fov: 45 },
    { progress: 0.36, position: [-3, 7, -1], target: [-1, 0, -13], fov: 43 },
    { progress: 0.52, position: [-1.2, 4.2, -13], target: [0, 0.4, -20], fov: 42 },
    { progress: 0.68, position: [1.5, 2.4, -23], target: [0, 0.7, -30], fov: 40 },
    { progress: 0.82, position: [0.4, 1.5, -32], target: [0, 0.5, -40], fov: 38 },
    { progress: 1, position: [0, 1, -42], target: [0, 0.6, -50], fov: 36 },
  ],
  portrait: [
    { progress: 0, position: [0, 7.8, 22], target: [0, 1, -3], fov: 52 },
    { progress: 0.18, position: [0, 6.4, 13], target: [0, 1, -8], fov: 50 },
    { progress: 0.36, position: [-1.1, 9, 2], target: [-0.4, 1, -13], fov: 48 },
    { progress: 0.52, position: [-0.4, 6, -11], target: [0, 1.2, -20], fov: 48 },
    { progress: 0.68, position: [0.5, 4, -21], target: [0, 1.6, -29], fov: 46 },
    { progress: 0.82, position: [0.2, 2.8, -31], target: [0, 1.5, -39], fov: 44 },
    { progress: 1, position: [0, 2.2, -42], target: [0, 1.6, -50], fov: 42 },
  ],
} as const satisfies Readonly<Record<Home3DComposition, CameraJourney>>;

export function clampHome3DProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const clamped = clampHome3DProgress(value);
  return clamped * clamped * (3 - 2 * clamped);
}

type CameraValueSelector = (keyframe: Home3DCameraKeyframe) => number;

/**
 * Returns a derivative in progress-space for a camera value. Interior
 * keyframes share one centred derivative between their incoming and outgoing
 * segments, which removes the stop/start motion created by easing every
 * segment independently. Endpoints use a deterministic one-sided derivative.
 */
function cameraTangent(
  keyframes: CameraJourney,
  index: number,
  select: CameraValueSelector
): number {
  const current = keyframes[index]!;
  const previous = keyframes[index - 1];
  const next = keyframes[index + 1];

  if (!previous && next) {
    const span = next.progress - current.progress;
    return span > 0 ? (select(next) - select(current)) / span : 0;
  }
  if (previous && !next) {
    const span = current.progress - previous.progress;
    return span > 0 ? (select(current) - select(previous)) / span : 0;
  }
  if (!previous || !next) return 0;

  const span = next.progress - previous.progress;
  return span > 0 ? (select(next) - select(previous)) / span : 0;
}

/** Cubic Hermite interpolation with tangents expressed per progress unit. */
function interpolateCameraValue(
  from: number,
  to: number,
  fromTangent: number,
  toTangent: number,
  localProgress: number,
  segmentSpan: number
): number {
  const amount = clampHome3DProgress(localProgress);
  const squared = amount * amount;
  const cubed = squared * amount;
  const fromBasis = 2 * cubed - 3 * squared + 1;
  const fromTangentBasis = cubed - 2 * squared + amount;
  const toBasis = -2 * cubed + 3 * squared;
  const toTangentBasis = cubed - squared;

  return (
    fromBasis * from +
    fromTangentBasis * segmentSpan * fromTangent +
    toBasis * to +
    toTangentBasis * segmentSpan * toTangent
  );
}

/**
 * Samples the camera directly from clamped scroll progress. A non-uniform
 * cubic Hermite path passes through every authored keyframe while preserving a
 * shared first derivative at interior keyframes. It remains a pure progress
 * lookup: there is no temporal state, lag, locale input, or catch-up behavior.
 */
export function sampleHomeCamera(
  value: number,
  composition: Home3DComposition
): Home3DCameraPose {
  const progress = clampHome3DProgress(value);
  const keyframes = HOME_3D_CAMERA_KEYFRAMES[composition];

  for (let index = 1; index < keyframes.length; index += 1) {
    const from = keyframes[index - 1];
    const to = keyframes[index];
    if (!from || !to || progress > to.progress) continue;

    if (progress === from.progress) {
      return { position: from.position, target: from.target, fov: from.fov };
    }
    if (progress === to.progress) {
      return { position: to.position, target: to.target, fov: to.fov };
    }

    const span = to.progress - from.progress;
    const localProgress = span <= 0 ? 1 : (progress - from.progress) / span;
    const interpolate = (select: CameraValueSelector) => interpolateCameraValue(
      select(from),
      select(to),
      cameraTangent(keyframes, index - 1, select),
      cameraTangent(keyframes, index, select),
      localProgress,
      span
    );
    return {
      position: [
        interpolate((keyframe) => keyframe.position[0]),
        interpolate((keyframe) => keyframe.position[1]),
        interpolate((keyframe) => keyframe.position[2]),
      ],
      target: [
        interpolate((keyframe) => keyframe.target[0]),
        interpolate((keyframe) => keyframe.target[1]),
        interpolate((keyframe) => keyframe.target[2]),
      ],
      fov: interpolate((keyframe) => keyframe.fov),
    };
  }

  const finalKeyframe = keyframes.at(-1) ?? keyframes[0];
  return {
    position: finalKeyframe.position,
    target: finalKeyframe.target,
    fov: finalKeyframe.fov,
  };
}

export interface Home3DTextWindow {
  enterStart: number;
  visibleStart: number;
  visibleEnd: number;
  exitEnd: number;
}

/**
 * Large-copy windows are separated by deliberate zero-opacity gaps. The final
 * decision remains readable at progress 1 while the normal page enters below.
 */
export const HOME_3D_TEXT_WINDOWS = {
  ocean: { enterStart: 0, visibleStart: 0, visibleEnd: 0.17, exitEnd: 0.21 },
  spot: { enterStart: 0.24, visibleStart: 0.265, visibleEnd: 0.405, exitEnd: 0.445 },
  conditions: { enterStart: 0.475, visibleStart: 0.505, visibleEnd: 0.69, exitEnd: 0.73 },
  decision: { enterStart: 0.765, visibleStart: 0.795, visibleEnd: 1, exitEnd: 1 },
} as const satisfies Readonly<Record<HomeStoryScene, Home3DTextWindow>>;

/** Returns scroll-linked opacity without retaining any animation state. */
export function homeSceneOpacity(scene: HomeStoryScene, value: number): number {
  const progress = clampHome3DProgress(value);
  const window = HOME_3D_TEXT_WINDOWS[scene];

  if (progress < window.enterStart || progress > window.exitEnd) return 0;
  if (progress < window.visibleStart) {
    const span = window.visibleStart - window.enterStart;
    return span <= 0 ? 1 : smoothstep((progress - window.enterStart) / span);
  }
  if (progress <= window.visibleEnd) return 1;

  const span = window.exitEnd - window.visibleEnd;
  return span <= 0 ? 0 : 1 - smoothstep((progress - window.visibleEnd) / span);
}

export type Home3DVisualLayer = 'ocean' | 'coast' | 'marine' | 'decision';

/**
 * World-layer windows intentionally overlap so the continuous environment can
 * hand visual focus from the Atlantic to the coast, analysis, and decision
 * without a blank frame. These stable spatial identifiers are never localized.
 */
export const HOME_3D_VISUAL_WINDOWS = {
  ocean: { enterStart: 0, visibleStart: 0, visibleEnd: 0.34, exitEnd: 0.62 },
  coast: { enterStart: 0.14, visibleStart: 0.25, visibleEnd: 0.5, exitEnd: 0.7 },
  marine: { enterStart: 0.42, visibleStart: 0.52, visibleEnd: 0.74, exitEnd: 0.86 },
  decision: { enterStart: 0.74, visibleStart: 0.82, visibleEnd: 1, exitEnd: 1 },
} as const satisfies Readonly<Record<Home3DVisualLayer, Home3DTextWindow>>;

/** Returns a finite, clamped opacity for a scroll-linked world layer. */
export function homeVisualPresence(layer: Home3DVisualLayer, value: number): number {
  const progress = clampHome3DProgress(value);
  const window = HOME_3D_VISUAL_WINDOWS[layer];

  if (progress < window.enterStart || progress > window.exitEnd) return 0;
  if (progress < window.visibleStart) {
    const span = window.visibleStart - window.enterStart;
    return span <= 0 ? 1 : smoothstep((progress - window.enterStart) / span);
  }
  if (progress <= window.visibleEnd) return 1;

  const span = window.exitEnd - window.visibleEnd;
  return span <= 0 ? 0 : 1 - smoothstep((progress - window.visibleEnd) / span);
}

export type Home3DRuntimePhase =
  | 'ssr'
  | 'loading'
  | 'ready'
  | 'import-error'
  | 'initialization-error'
  | 'runtime-error'
  | 'context-lost';

export type Home3DMode = 'fallback' | 'loading' | 'active' | 'paused';

export type Home3DModeReason =
  | Home3DRuntimePhase
  | 'quality-fallback'
  | 'offscreen'
  | 'hidden';

export interface Home3DModeInput {
  phase: Home3DRuntimePhase;
  quality: Home3DQuality;
  offscreen?: boolean;
  hidden?: boolean;
}

export interface Home3DModeResolution {
  mode: Home3DMode;
  reason: Home3DModeReason;
  /** Whether the enhancement canvas should be mounted. */
  mountCanvas: boolean;
  /** Whether demand rendering should currently advance a frame. */
  shouldRender: boolean;
  /** The SSR CSS/SVG fallback remains the visible presentation in this mode. */
  showFallback: boolean;
}

const FAILURE_PHASES: ReadonlySet<Home3DRuntimePhase> = new Set([
  'import-error',
  'initialization-error',
  'runtime-error',
  'context-lost',
]);

/**
 * Resolves all progressive-enhancement states without touching browser APIs.
 * A failed canvas is never the only visible homepage presentation.
 */
export function resolveHome3DMode(input: Home3DModeInput): Home3DModeResolution {
  if (input.phase === 'ssr') {
    return {
      mode: 'fallback',
      reason: 'ssr',
      mountCanvas: false,
      shouldRender: false,
      showFallback: true,
    };
  }

  if (FAILURE_PHASES.has(input.phase)) {
    return {
      mode: 'fallback',
      reason: input.phase,
      mountCanvas: false,
      shouldRender: false,
      showFallback: true,
    };
  }

  if (input.quality === 'fallback') {
    return {
      mode: 'fallback',
      reason: 'quality-fallback',
      mountCanvas: false,
      shouldRender: false,
      showFallback: true,
    };
  }

  if (input.phase === 'loading') {
    return {
      mode: 'loading',
      reason: 'loading',
      mountCanvas: false,
      shouldRender: false,
      showFallback: true,
    };
  }

  if (input.hidden) {
    return {
      mode: 'paused',
      reason: 'hidden',
      mountCanvas: true,
      shouldRender: false,
      showFallback: false,
    };
  }

  if (input.offscreen) {
    return {
      mode: 'paused',
      reason: 'offscreen',
      mountCanvas: true,
      shouldRender: false,
      showFallback: false,
    };
  }

  return {
    mode: 'active',
    reason: 'ready',
    mountCanvas: true,
    shouldRender: true,
    showFallback: false,
  };
}
