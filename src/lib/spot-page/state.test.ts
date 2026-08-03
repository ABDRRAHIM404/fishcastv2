import { describe, expect, it } from 'vitest';
import {
  isSpotPageSection,
  spotPageSectionOrDefault,
} from '@/lib/spot-page/state';

describe('spot-page section query state', () => {
  it('accepts every real section', () => {
    expect(['overview', 'forecast', 'conditions', 'species', 'guide'].every(isSpotPageSection)).toBe(true);
  });

  it('defaults invalid or absent values to Overview', () => {
    expect(spotPageSectionOrDefault(undefined)).toBe('overview');
    expect(spotPageSectionOrDefault('technical-report')).toBe('overview');
    expect(spotPageSectionOrDefault('forecast')).toBe('forecast');
  });
});

