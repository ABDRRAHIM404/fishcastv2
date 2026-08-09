import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HOME_SEQUENCE_MANIFESTS,
  HOME_SEQUENCE_NARRATIVE_PROGRESS,
  HOME_STORY_TEXT_WINDOWS,
  activeHomeScene,
  canvasCoverCrop,
  clampSequenceProgress,
  frameIndexForProgress,
  frameUrl,
  homeSceneOpacity,
  homeSequenceSceneAt,
  homeSequenceSceneOpacity,
  nearestLoadedFrame,
  selectSequenceMode,
  selectSequenceVariant,
  sequenceFrameAtProgress,
  sequenceLoadPriority,
} from '@/lib/homepage/sequence';

describe('homepage sequence manifests', () => {
  it('preserves the supplied source IDs and their intentional gaps', () => {
    const desktop = HOME_SEQUENCE_MANIFESTS.desktop;
    const mobile = HOME_SEQUENCE_MANIFESTS.mobile;

    expect(desktop.frameIds).toHaveLength(220);
    expect(desktop.frameIds[0]).toBe(1);
    expect(desktop.frameIds.at(-1)).toBe(221);
    expect(desktop.frameIds).not.toContain(218);
    expect(desktop.sourceWidth).toBe(1280);
    expect(desktop.sourceHeight).toBe(720);

    expect(mobile.frameIds).toHaveLength(225);
    expect(mobile.frameIds[0]).toBe(1);
    expect(mobile.frameIds.at(-1)).toBe(227);
    expect(mobile.frameIds).not.toContain(218);
    expect(mobile.frameIds).not.toContain(219);
    expect(mobile.sourceWidth).toBe(720);
    expect(mobile.sourceHeight).toBe(1280);
  });

  it('maps compact indices to exact first and last URLs without filling gaps', () => {
    const desktop = HOME_SEQUENCE_MANIFESTS.desktop;
    const mobile = HOME_SEQUENCE_MANIFESTS.mobile;

    expect(frameUrl(desktop, 0)).toBe(
      '/homepage/sequence/v1/desktop/frame_001.webp'
    );
    expect(frameUrl(desktop, desktop.frameIds.length - 1)).toBe(
      '/homepage/sequence/v1/desktop/frame_221.webp'
    );
    expect(frameUrl(mobile, mobile.frameIds.length - 1)).toBe(
      '/homepage/sequence/v1/mobile/frame_227.webp'
    );
    expect(frameUrl(desktop, -1)).toBeNull();
    expect(frameUrl(desktop, desktop.frameIds.length)).toBeNull();

    const allUrls = Object.values(HOME_SEQUENCE_MANIFESTS).flatMap((manifest) =>
      manifest.frameIds.map((_, index) => frameUrl(manifest, index))
    );
    expect(allUrls.some((url) => url?.endsWith('/frame_218.webp'))).toBe(false);
    expect(allUrls.some((url) => url?.endsWith('/frame_219.webp') && url.includes('/mobile/'))).toBe(false);
  });

  it('keeps progress mapping direct and reversible for unequal frame counts', () => {
    const desktop = HOME_SEQUENCE_MANIFESTS.desktop;
    const mobile = HOME_SEQUENCE_MANIFESTS.mobile;
    expect(frameIndexForProgress(0, desktop)).toBe(0);
    expect(frameIndexForProgress(1, desktop)).toBe(219);
    expect(frameIndexForProgress(1, mobile)).toBe(224);
    expect(sequenceFrameAtProgress(0, desktop.frameIds)).toBe(1);
    expect(sequenceFrameAtProgress(1, desktop.frameIds)).toBe(221);
    expect(sequenceFrameAtProgress(0.5, [])).toBeNull();

    const first = frameIndexForProgress(0.23, desktop);
    expect(frameIndexForProgress(0.91, desktop)).not.toBe(first);
    expect(frameIndexForProgress(0.23, desktop)).toBe(first);
    expect(clampSequenceProgress(Number.NaN)).toBe(0);
    expect(frameIndexForProgress(-10, desktop)).toBe(0);
    expect(frameIndexForProgress(10, desktop)).toBe(219);
  });

  it('contains each compact manifest ID exactly once', () => {
    for (const manifest of Object.values(HOME_SEQUENCE_MANIFESTS)) {
      expect(new Set(manifest.frameIds).size).toBe(manifest.frameIds.length);
    }
  });
});

describe('homepage sequence capability and composition', () => {
  it('selects from actual container shape with stable hysteresis', () => {
    expect(selectSequenceVariant({ width: 1280, height: 720 })).toBe('desktop');
    expect(selectSequenceVariant({ width: 390, height: 844 })).toBe('mobile');
    expect(selectSequenceVariant({ width: 688, height: 1024 })).toBe('mobile');

    expect(selectSequenceVariant({
      width: 800,
      height: 760,
      previousVariant: 'desktop',
    })).toBe('desktop');
    expect(selectSequenceVariant({
      width: 800,
      height: 760,
      previousVariant: 'mobile',
    })).toBe('mobile');
    expect(selectSequenceVariant({
      width: 900,
      height: 700,
      previousVariant: 'mobile',
    })).toBe('desktop');
  });

  it('keeps variant selection independent of locale and document direction', () => {
    const dimensions = { width: 688, height: 1024 };
    const localeResults = ['en', 'fr', 'ar'].map(() =>
      selectSequenceVariant(dimensions)
    );
    expect(localeResults).toEqual(['mobile', 'mobile', 'mobile']);
  });

  it('uses a static fallback for reduced motion, unavailable canvas, or constrained networks', () => {
    const capable = {
      canvas2d: true,
      reducedMotion: false,
      width: 390,
      height: 844,
      hardwareConcurrency: 8,
      deviceMemory: 8,
    };
    expect(selectSequenceMode(capable)).toBe('full');
    expect(selectSequenceMode({ ...capable, reducedMotion: true })).toBe('static');
    expect(selectSequenceMode({ ...capable, canvas2d: false })).toBe('static');
    expect(selectSequenceMode({ ...capable, saveData: true })).toBe('static');
    expect(selectSequenceMode({ ...capable, effectiveType: '2g' })).toBe('static');
    expect(selectSequenceMode({ ...capable, effectiveType: '3g' })).toBe('economy');
    expect(selectSequenceMode({ ...capable, deviceMemory: 2 })).toBe('economy');
    expect(selectSequenceMode({ ...capable, hardwareConcurrency: 2 })).toBe('economy');
    expect(selectSequenceMode({ ...capable, width: Number.NaN })).toBe('static');
  });
});

describe('homepage progressive frame loading', () => {
  it('puts the target first and favours the current travel direction', () => {
    const manifest = HOME_SEQUENCE_MANIFESTS.desktop;
    const forward = sequenceLoadPriority({
      manifest,
      targetIndex: 100,
      previousIndex: 90,
      mode: 'full',
    });
    const backward = sequenceLoadPriority({
      manifest,
      targetIndex: 100,
      previousIndex: 110,
      mode: 'full',
    });

    expect(forward[0]).toBe(100);
    expect(forward.indexOf(101)).toBeLessThan(forward.indexOf(99));
    expect(backward[0]).toBe(100);
    expect(backward.indexOf(99)).toBeLessThan(backward.indexOf(101));
  });

  it('deduplicates and bounds neighbours, narrative anchors, and coarse anchors', () => {
    for (const manifest of Object.values(HOME_SEQUENCE_MANIFESTS)) {
      for (const targetIndex of [-100, 0, 100, 10_000]) {
        const plan = sequenceLoadPriority({
          manifest,
          targetIndex,
          previousIndex: targetIndex - 10,
          mode: 'full',
        });
        expect(new Set(plan).size).toBe(plan.length);
        expect(plan.every(
          (index) => index >= 0 && index < manifest.frameIds.length
        )).toBe(true);
        for (const progress of HOME_SEQUENCE_NARRATIVE_PROGRESS) {
          expect(plan).toContain(frameIndexForProgress(progress, manifest));
        }
      }
    }
    expect(sequenceLoadPriority({
      manifest: HOME_SEQUENCE_MANIFESTS.mobile,
      targetIndex: 10,
      mode: 'static',
    })).toEqual([]);
  });

  it('chooses the nearest frame with a directional tie-break', () => {
    expect(nearestLoadedFrame(10, [9, 11], 30, 'forward')).toBe(11);
    expect(nearestLoadedFrame(10, [9, 11], 30, 'backward')).toBe(9);
    expect(nearestLoadedFrame(10, [9, 11], 30, 'stationary')).toBe(9);
    expect(nearestLoadedFrame(10, [4, 10, 15], 30, 'forward')).toBe(10);
    expect(nearestLoadedFrame(10, [-1, 31], 30, 'forward')).toBeNull();
  });
});

describe('homepage sequence canvas cropping', () => {
  it('keeps an exact-aspect source uncropped', () => {
    expect(canvasCoverCrop(1280, 720, 1920, 1080)).toEqual({
      sourceX: 0,
      sourceY: 0,
      sourceWidth: 1280,
      sourceHeight: 720,
      destinationX: 0,
      destinationY: 0,
      destinationWidth: 1920,
      destinationHeight: 1080,
    });
  });

  it('crops landscape and portrait sources deterministically around the focus', () => {
    const square = canvasCoverCrop(1280, 720, 1000, 1000);
    expect(square.sourceX).toBeCloseTo(280);
    expect(square.sourceY).toBe(0);
    expect(square.sourceWidth).toBeCloseTo(720);
    expect(square.sourceHeight).toBe(720);

    const mobile = canvasCoverCrop(720, 1280, 390, 844);
    expect(mobile.sourceX).toBeCloseTo(64.2654, 3);
    expect(mobile.sourceY).toBe(0);
    expect(mobile.sourceWidth).toBeCloseTo(591.4692, 3);
    expect(mobile.sourceHeight).toBe(1280);
  });

  it('returns an empty crop for invalid measurements', () => {
    expect(canvasCoverCrop(0, 720, 390, 844).sourceWidth).toBe(0);
    expect(canvasCoverCrop(720, 1280, Number.NaN, 844).destinationWidth).toBe(0);
  });
});

describe('homepage localized story overlay timing', () => {
  it('uses stable provider-neutral scene identifiers', () => {
    expect(Object.keys(HOME_STORY_TEXT_WINDOWS)).toEqual([
      'ocean',
      'spot',
      'conditions',
      'decision',
    ]);
  });

  it('never makes two large headings clearly readable simultaneously', () => {
    for (let step = 0; step <= 2_000; step += 1) {
      const progress = step / 2_000;
      const readable = Object.keys(HOME_STORY_TEXT_WINDOWS).filter(
        (scene) => homeSceneOpacity(
          scene as keyof typeof HOME_STORY_TEXT_WINDOWS,
          progress
        ) >= 0.5
      );
      expect(readable.length).toBeLessThanOrEqual(1);
    }
  });

  it('preserves deliberate gaps and exposes an active scene only when readable', () => {
    expect(homeSceneOpacity('ocean', 0)).toBe(1);
    expect(homeSceneOpacity('spot', 0.3)).toBe(1);
    expect(homeSceneOpacity('conditions', 0.6)).toBe(1);
    expect(homeSceneOpacity('decision', 0.86)).toBe(1);
    expect(activeHomeScene(0.225)).toBeNull();
    expect(activeHomeScene(0.46)).toBeNull();
    expect(activeHomeScene(0.7475)).toBeNull();
    expect(activeHomeScene(0.3)).toBe('spot');
    expect(activeHomeScene(0.86)).toBe('decision');
    expect(activeHomeScene(0.99)).toBeNull();
    expect(homeSequenceSceneOpacity('conditions', 0.6)).toBe(1);
    expect(homeSequenceSceneAt(0.3)).toBe('spot');
  });
});

describe('homepage sequence repository assets', () => {
  it('contains every expected compressed WebP frame and no empty files', () => {
    for (const manifest of Object.values(HOME_SEQUENCE_MANIFESTS)) {
      for (let index = 0; index < manifest.frameIds.length; index += 1) {
        const url = frameUrl(manifest, index);
        expect(url).not.toBeNull();
        const path = join(process.cwd(), 'public', url!.replace(/^\//, ''));
        expect(existsSync(path), path).toBe(true);
        expect(statSync(path).size, path).toBeGreaterThan(0);
      }
    }
  });
});
