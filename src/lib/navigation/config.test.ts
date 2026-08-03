import { describe, expect, it } from 'vitest';
import {
  DESKTOP_NAVIGATION,
  MOBILE_MORE_NAVIGATION,
  MOBILE_PRIMARY_NAVIGATION,
  isNavigationActive,
  parseShellPreference,
} from '@/lib/navigation/config';

describe('application navigation configuration', () => {
  it('uses only real destinations and limits mobile primary navigation to four links', () => {
    expect(DESKTOP_NAVIGATION.map((item) => item.href)).toEqual([
      '/',
      '/forecast',
      '/map',
      '/spots',
      '/species',
      '/favorites',
    ]);
    expect(MOBILE_PRIMARY_NAVIGATION).toHaveLength(4);
    expect(MOBILE_MORE_NAVIGATION.map((item) => item.href)).toEqual([
      '/species',
      '/favorites',
    ]);
  });

  it('uses an exact match for Overview and nested matches elsewhere', () => {
    expect(isNavigationActive('/', DESKTOP_NAVIGATION[0]!)).toBe(true);
    expect(isNavigationActive('/spots', DESKTOP_NAVIGATION[0]!)).toBe(false);
    expect(isNavigationActive('/spots/tifnit', DESKTOP_NAVIGATION[3]!)).toBe(
      true
    );
  });

  it('safely parses versioned sidebar state', () => {
    expect(
      parseShellPreference('{"version":1,"collapsed":true}')
    ).toEqual({ collapsed: true });
    expect(parseShellPreference('{"collapsed":true}')).toEqual({
      collapsed: false,
    });
    expect(parseShellPreference('broken')).toEqual({ collapsed: false });
  });
});

