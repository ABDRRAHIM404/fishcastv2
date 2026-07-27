import { describe, expect, it } from 'vitest';
import {
  getSpotExposure,
  interpretDirections,
  swellRelationship,
  windRelationship,
} from '@/lib/spots/exposure';

describe('spot exposure interpretation', () => {
  const profile = getSpotExposure('sidi-rbat');

  it('classifies wind relative to the provisional seaward bearing', () => {
    expect(windRelationship(270, profile)).toBe('onshore');
    expect(windRelationship(90, profile)).toBe('offshore');
    expect(windRelationship(0, profile)).toBe('cross-shore');
  });

  it('classifies head-on, angled, cross-shore, and from-land swell', () => {
    expect(swellRelationship(270, profile)).toBe('head-on');
    expect(swellRelationship(220, profile)).toBe('angled');
    expect(swellRelationship(180, profile)).toBe('cross-shore');
    expect(swellRelationship(90, profile)).toBe('from-land');
  });

  it('keeps shelter unknown because the repository has no verified data', () => {
    expect(interpretDirections(270, 270, profile)).toMatchObject({
      sheltered: 'unknown',
      exposureVerification: 'unverified-editorial',
    });
  });

  it('resolves the repository Massa row and Am9erss product alias together', () => {
    const massa = getSpotExposure('massa');
    expect(massa?.aliases).toEqual(expect.arrayContaining(['Massa', 'Am9erss']));
    expect(massa?.editorialNote).toContain('repository conflict');
    expect(getSpotExposure('am9erss')).toBe(massa);
  });
});
