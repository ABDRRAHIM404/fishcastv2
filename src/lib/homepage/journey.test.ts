import { describe, expect, it } from 'vitest';
import {
  HOME_3D_CAMERA_KEYFRAMES,
  HOME_3D_QUALITY_SETTINGS,
  HOME_3D_TEXT_WINDOWS,
  HOME_3D_VISUAL_WINDOWS,
  clampHome3DProgress,
  homeSceneOpacity,
  homeVisualPresence,
  resolveHome3DMode,
  sampleHomeCamera,
  selectHome3DQuality,
  type Home3DQuality,
  type Home3DQualityInput,
} from '@/lib/homepage/journey';
import { normalizeSpotPositions } from '@/lib/homepage/story';

const capableDesktop: Home3DQualityInput = {
  webgl: true,
  reducedMotion: false,
  width: 1536,
  height: 864,
  dpr: 2,
  coarsePointer: false,
  hardwareConcurrency: 8,
  deviceMemory: 8,
  saveData: false,
};

describe('homepage 3D quality selection', () => {
  it('uses fallback when WebGL is unavailable or reduced motion is requested', () => {
    expect(selectHome3DQuality({ ...capableDesktop, webgl: false })).toBe('fallback');
    expect(selectHome3DQuality({ ...capableDesktop, reducedMotion: true })).toBe('fallback');
  });

  it('rejects incomplete viewport measurements safely', () => {
    expect(selectHome3DQuality({ ...capableDesktop, width: Number.NaN })).toBe('fallback');
    expect(selectHome3DQuality({ ...capableDesktop, height: 0 })).toBe('fallback');
    expect(selectHome3DQuality({ ...capableDesktop, dpr: 0 })).toBe('fallback');
  });

  it('selects high only for a strong desktop profile', () => {
    expect(selectHome3DQuality(capableDesktop)).toBe('high');
    expect(selectHome3DQuality({ ...capableDesktop, coarsePointer: true })).toBe('medium');
    expect(selectHome3DQuality({ ...capableDesktop, dpr: 3 })).toBe('medium');
    expect(selectHome3DQuality({ ...capableDesktop, hardwareConcurrency: 4 })).toBe('medium');
  });

  it('assigns modern portrait phones and tablets to the capped medium tier', () => {
    expect(
      selectHome3DQuality({
        ...capableDesktop,
        width: 390,
        height: 844,
        dpr: 3,
        coarsePointer: true,
      })
    ).toBe('medium');
    expect(
      selectHome3DQuality({
        ...capableDesktop,
        width: 768,
        height: 1024,
        coarsePointer: true,
      })
    ).toBe('medium');
  });

  it('uses low for constrained devices and data-saving connections', () => {
    expect(selectHome3DQuality({ ...capableDesktop, hardwareConcurrency: 2 })).toBe('low');
    expect(selectHome3DQuality({ ...capableDesktop, deviceMemory: 2 })).toBe('low');
    expect(selectHome3DQuality({ ...capableDesktop, saveData: true })).toBe('low');
    expect(selectHome3DQuality({ ...capableDesktop, width: 340, height: 620 })).toBe('low');
  });

  it('does not penalize browsers that omit optional hardware hints', () => {
    expect(
      selectHome3DQuality({
        ...capableDesktop,
        hardwareConcurrency: undefined,
        deviceMemory: undefined,
      })
    ).toBe('high');
  });

  it('keeps all quality budgets monotonic', () => {
    const tiers: readonly Home3DQuality[] = ['fallback', 'low', 'medium', 'high'];
    const numericSettings = [
      'maxDpr',
      'oceanSegments',
      'coastSegments',
      'particles',
      'curveSegments',
    ] as const;

    for (const setting of numericSettings) {
      const values = tiers.map((tier) => HOME_3D_QUALITY_SETTINGS[tier][setting]);
      expect(values).toEqual([...values].sort((left, right) => left - right));
    }

    expect(tiers.map((tier) => Number(HOME_3D_QUALITY_SETTINGS[tier].antialias))).toEqual([
      0, 0, 1, 1,
    ]);
    expect(tiers.map((tier) => Number(HOME_3D_QUALITY_SETTINGS[tier].shadows))).toEqual([
      0, 0, 0, 0,
    ]);
  });
});

describe('homepage camera journey', () => {
  it('clamps scroll progress deterministically', () => {
    expect(clampHome3DProgress(Number.NaN)).toBe(0);
    expect(clampHome3DProgress(-1)).toBe(0);
    expect(clampHome3DProgress(0.42)).toBe(0.42);
    expect(clampHome3DProgress(2)).toBe(1);
  });

  it('returns exact landscape endpoints for out-of-range progress', () => {
    const first = HOME_3D_CAMERA_KEYFRAMES.landscape[0];
    const last = HOME_3D_CAMERA_KEYFRAMES.landscape.at(-1);
    expect(sampleHomeCamera(-4, 'landscape')).toEqual({
      position: first.position,
      target: first.target,
      fov: first.fov,
    });
    expect(sampleHomeCamera(4, 'landscape')).toEqual({
      position: last?.position,
      target: last?.target,
      fov: last?.fov,
    });
  });

  it('passes through every declared keyframe exactly', () => {
    for (const composition of ['landscape', 'portrait'] as const) {
      for (const keyframe of HOME_3D_CAMERA_KEYFRAMES[composition]) {
        expect(sampleHomeCamera(keyframe.progress, composition)).toEqual({
          position: keyframe.position,
          target: keyframe.target,
          fov: keyframe.fov,
        });
      }
    }
  });

  it('uses a portrait composition without reversing the world path', () => {
    const landscape = sampleHomeCamera(0.52, 'landscape');
    const portrait = sampleHomeCamera(0.52, 'portrait');
    expect(portrait.position[1]).toBeGreaterThan(landscape.position[1]);
    expect(portrait.fov).toBeGreaterThan(landscape.fov);
    expect(Math.sign(portrait.position[2])).toBe(Math.sign(landscape.position[2]));
    expect(Math.sign(portrait.target[2])).toBe(Math.sign(landscape.target[2]));
  });

  it('keeps east right and north up without accepting locale as an input', () => {
    const positions = normalizeSpotPositions([
      { id: 'southwest', latitude: 29, longitude: -10 },
      { id: 'northeast', latitude: 31, longitude: -8 },
    ]);
    expect(positions).toEqual([
      { id: 'southwest', latitude: 29, longitude: -10, xPercent: 16, yPercent: 84 },
      { id: 'northeast', latitude: 31, longitude: -8, xPercent: 84, yPercent: 16 },
    ]);
  });

  it('maps the same progress to the same pose on repeated and reverse sampling', () => {
    const forward = sampleHomeCamera(0.61, 'landscape');
    sampleHomeCamera(0.95, 'landscape');
    const backward = sampleHomeCamera(0.61, 'landscape');
    expect(backward).toEqual(forward);
  });

  it('keeps camera velocity continuous through interior keyframes', () => {
    const epsilon = 0.00001;

    for (const composition of ['landscape', 'portrait'] as const) {
      const keyframes = HOME_3D_CAMERA_KEYFRAMES[composition];
      for (let index = 1; index < keyframes.length - 1; index += 1) {
        const keyframe = keyframes[index]!;
        const before = sampleHomeCamera(keyframe.progress - epsilon, composition);
        const at = sampleHomeCamera(keyframe.progress, composition);
        const after = sampleHomeCamera(keyframe.progress + epsilon, composition);
        const beforeValues = [...before.position, ...before.target, before.fov];
        const atValues = [...at.position, ...at.target, at.fov];
        const afterValues = [...after.position, ...after.target, after.fov];

        for (let valueIndex = 0; valueIndex < atValues.length; valueIndex += 1) {
          const incoming = (atValues[valueIndex]! - beforeValues[valueIndex]!) / epsilon;
          const outgoing = (afterValues[valueIndex]! - atValues[valueIndex]!) / epsilon;
          expect(outgoing).toBeCloseTo(incoming, 2);
        }
      }
    }
  });

  it('does not stop the forward camera travel at each interior keyframe', () => {
    const epsilon = 0.00001;

    for (const composition of ['landscape', 'portrait'] as const) {
      for (const keyframe of HOME_3D_CAMERA_KEYFRAMES[composition].slice(1, -1)) {
        const before = sampleHomeCamera(keyframe.progress - epsilon, composition);
        const after = sampleHomeCamera(keyframe.progress + epsilon, composition);
        const zVelocity = (after.position[2] - before.position[2]) / (epsilon * 2);
        expect(Math.abs(zVelocity)).toBeGreaterThan(20);
      }
    }
  });

  it('returns only finite camera values throughout both paths', () => {
    for (const composition of ['landscape', 'portrait'] as const) {
      for (let step = 0; step <= 1000; step += 1) {
        const pose = sampleHomeCamera(step / 1000, composition);
        expect([...pose.position, ...pose.target, pose.fov].every(Number.isFinite)).toBe(true);
        expect(pose.fov).toBeGreaterThan(0);
      }
    }
  });
});

describe('homepage scene-copy windows', () => {
  it('keeps scene identifiers locale-independent', () => {
    expect(Object.keys(HOME_3D_TEXT_WINDOWS)).toEqual([
      'ocean',
      'spot',
      'conditions',
      'decision',
    ]);
  });

  it('never makes two large scene headlines readable together', () => {
    for (let step = 0; step <= 1000; step += 1) {
      const progress = step / 1000;
      const readable = Object.keys(HOME_3D_TEXT_WINDOWS).filter(
        (scene) => homeSceneOpacity(scene as keyof typeof HOME_3D_TEXT_WINDOWS, progress) >= 0.5
      );
      expect(readable.length).toBeLessThanOrEqual(1);
    }
  });

  it('has clean zero-opacity gaps between consecutive copy windows', () => {
    expect(homeSceneOpacity('ocean', 0.225)).toBe(0);
    expect(homeSceneOpacity('spot', 0.46)).toBe(0);
    expect(homeSceneOpacity('conditions', 0.7475)).toBe(0);
  });

  it('keeps each headline fully readable during its hold window', () => {
    expect(homeSceneOpacity('ocean', 0)).toBe(1);
    expect(homeSceneOpacity('spot', 0.3)).toBe(1);
    expect(homeSceneOpacity('conditions', 0.6)).toBe(1);
    expect(homeSceneOpacity('decision', 1)).toBe(1);
  });

  it('clamps invalid opacity progress', () => {
    expect(homeSceneOpacity('ocean', Number.NaN)).toBe(1);
    expect(homeSceneOpacity('ocean', -1)).toBe(1);
    expect(homeSceneOpacity('decision', 2)).toBe(1);
  });
});

describe('homepage world-layer presence', () => {
  it('uses stable, locale-independent spatial layer identifiers', () => {
    expect(Object.keys(HOME_3D_VISUAL_WINDOWS)).toEqual([
      'ocean',
      'coast',
      'marine',
      'decision',
    ]);
  });

  it('preserves an overlapping visual handoff throughout the journey', () => {
    for (let step = 0; step <= 1000; step += 1) {
      const progress = step / 1000;
      const opacities = Object.keys(HOME_3D_VISUAL_WINDOWS).map((layer) =>
        homeVisualPresence(layer as keyof typeof HOME_3D_VISUAL_WINDOWS, progress)
      );
      expect(Math.max(...opacities)).toBeGreaterThan(0);
    }
  });

  it('returns only finite opacity values in the inclusive unit interval', () => {
    const samples = [Number.NaN, Number.NEGATIVE_INFINITY, -1, 0, 0.5, 1, 2];
    for (let step = 0; step <= 1000; step += 1) samples.push(step / 1000);

    for (const layer of Object.keys(HOME_3D_VISUAL_WINDOWS)) {
      for (const progress of samples) {
        const opacity = homeVisualPresence(
          layer as keyof typeof HOME_3D_VISUAL_WINDOWS,
          progress
        );
        expect(Number.isFinite(opacity)).toBe(true);
        expect(opacity).toBeGreaterThanOrEqual(0);
        expect(opacity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps exact journey boundary states', () => {
    expect(homeVisualPresence('ocean', -1)).toBe(1);
    expect(homeVisualPresence('coast', 0)).toBe(0);
    expect(homeVisualPresence('marine', 0)).toBe(0);
    expect(homeVisualPresence('decision', 0)).toBe(0);
    expect(homeVisualPresence('ocean', 1)).toBe(0);
    expect(homeVisualPresence('coast', 1)).toBe(0);
    expect(homeVisualPresence('marine', 1)).toBe(0);
    expect(homeVisualPresence('decision', 2)).toBe(1);
  });
});

describe('homepage progressive-enhancement runtime mode', () => {
  it('keeps the fallback visible during SSR and loading', () => {
    expect(resolveHome3DMode({ phase: 'ssr', quality: 'high' })).toEqual({
      mode: 'fallback',
      reason: 'ssr',
      mountCanvas: false,
      shouldRender: false,
      showFallback: true,
    });
    expect(resolveHome3DMode({ phase: 'loading', quality: 'medium' })).toEqual({
      mode: 'loading',
      reason: 'loading',
      mountCanvas: false,
      shouldRender: false,
      showFallback: true,
    });
  });

  it('does not mount a canvas for a fallback quality budget', () => {
    expect(resolveHome3DMode({ phase: 'ready', quality: 'fallback' })).toMatchObject({
      mode: 'fallback',
      reason: 'quality-fallback',
      mountCanvas: false,
      showFallback: true,
    });
  });

  it.each([
    'import-error',
    'initialization-error',
    'runtime-error',
    'context-lost',
  ] as const)('falls back after %s', (phase) => {
    expect(resolveHome3DMode({ phase, quality: 'high' })).toEqual({
      mode: 'fallback',
      reason: phase,
      mountCanvas: false,
      shouldRender: false,
      showFallback: true,
    });
  });

  it('runs only a ready, visible, onscreen enhancement', () => {
    expect(resolveHome3DMode({ phase: 'ready', quality: 'high' })).toMatchObject({
      mode: 'active',
      reason: 'ready',
      mountCanvas: true,
      shouldRender: true,
      showFallback: false,
    });
  });

  it('pauses without disposing the canvas while hidden or offscreen', () => {
    expect(
      resolveHome3DMode({ phase: 'ready', quality: 'medium', hidden: true })
    ).toMatchObject({ mode: 'paused', reason: 'hidden', mountCanvas: true, shouldRender: false });
    expect(
      resolveHome3DMode({ phase: 'ready', quality: 'medium', offscreen: true })
    ).toMatchObject({ mode: 'paused', reason: 'offscreen', mountCanvas: true, shouldRender: false });
  });
});
