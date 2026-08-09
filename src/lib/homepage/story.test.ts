import { describe, expect, it } from 'vitest';
import {
  HOME_CTA_ROUTES,
  HOME_STORY_SCENES,
  clampStoryProgress,
  normalizeSpotPositions,
  parseHomeMotionPreference,
  sceneProgress,
  shouldUseStaticStory,
  storySceneAt,
} from '@/lib/homepage/story';
import { publicSpotName } from '@/lib/forecast-ui/spots';

describe('homepage scroll story', () => {
  it('keeps locale-independent scene identifiers in narrative order', () => {
    expect(HOME_STORY_SCENES).toEqual([
      'ocean',
      'spot',
      'conditions',
      'decision',
    ]);
  });

  it('clamps invalid and out-of-range progress', () => {
    expect(clampStoryProgress(Number.NaN)).toBe(0);
    expect(clampStoryProgress(-0.4)).toBe(0);
    expect(clampStoryProgress(0.42)).toBe(0.42);
    expect(clampStoryProgress(4)).toBe(1);
  });

  it('selects scenes at the documented boundaries', () => {
    expect(storySceneAt(0)).toBe('ocean');
    expect(storySceneAt(0.249)).toBe('ocean');
    expect(storySceneAt(0.25)).toBe('spot');
    expect(storySceneAt(0.48)).toBe('conditions');
    expect(storySceneAt(0.76)).toBe('decision');
    expect(storySceneAt(1)).toBe('decision');
  });

  it('calculates deterministic progress within each scene', () => {
    expect(sceneProgress('ocean', 0.125)).toBe(0.5);
    expect(sceneProgress('spot', 0.25)).toBe(0);
    expect(sceneProgress('spot', 0.48)).toBe(1);
    expect(sceneProgress('decision', 4)).toBe(1);
  });

  it('safely parses the versioned animation preference', () => {
    expect(parseHomeMotionPreference(null)).toBe('auto');
    expect(parseHomeMotionPreference('{broken')).toBe('auto');
    expect(parseHomeMotionPreference(JSON.stringify({ version: 2, mode: 'reduced' }))).toBe('auto');
    expect(parseHomeMotionPreference(JSON.stringify({ version: 1, mode: 'lite' }))).toBe('lite');
    expect(parseHomeMotionPreference(JSON.stringify({ version: 1, mode: 'reduced' }))).toBe('reduced');
  });

  it('uses a static story for reduced-motion users', () => {
    expect(shouldUseStaticStory(true, 'auto')).toBe(true);
    expect(shouldUseStaticStory(false, 'reduced')).toBe(true);
    expect(shouldUseStaticStory(false, 'lite')).toBe(false);
  });

  it('preserves real geographic orientation when normalizing markers', () => {
    const positions = normalizeSpotPositions([
      { id: 'southwest', latitude: 29, longitude: -10 },
      { id: 'northeast', latitude: 31, longitude: -8 },
    ]);
    expect(positions[0]).toMatchObject({ id: 'southwest', xPercent: 16, yPercent: 84 });
    expect(positions[1]).toMatchObject({ id: 'northeast', xPercent: 84, yPercent: 16 });
  });

  it('keeps homepage CTA destinations and the Am9erss display mapping stable', () => {
    expect(HOME_CTA_ROUTES).toEqual({
      forecast: '/forecast',
      map: '/map',
      spots: '/spots',
    });
    expect(publicSpotName('massa', 'Massa')).toBe('Am9erss');
  });
});
