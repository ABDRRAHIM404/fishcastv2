import { describe, expect, it } from 'vitest';
import { publicSpotName } from '@/lib/forecast-ui/spots';

describe('forecast spot display names', () => {
  it('preserves the Massa row while displaying the product name Am9erss', () => {
    expect(publicSpotName('massa', 'Massa')).toBe('Am9erss');
    expect(publicSpotName('tifnit', 'Tifnit')).toBe('Tifnit');
  });
});

