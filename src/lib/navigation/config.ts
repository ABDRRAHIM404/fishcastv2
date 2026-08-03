export type NavigationIcon =
  | 'home'
  | 'forecast'
  | 'map'
  | 'spots'
  | 'species'
  | 'favorites';

export interface NavigationDestination {
  title: string;
  href: string;
  icon: NavigationIcon;
}

/** Every destination below resolves to a real application page. */
export const DESKTOP_NAVIGATION: readonly NavigationDestination[] = [
  { title: 'Overview', href: '/', icon: 'home' },
  { title: 'Forecast', href: '/forecast', icon: 'forecast' },
  { title: 'Map', href: '/map', icon: 'map' },
  { title: 'Spots', href: '/spots', icon: 'spots' },
  { title: 'Species', href: '/species', icon: 'species' },
  { title: 'Favourites', href: '/favorites', icon: 'favorites' },
] as const;

export const MOBILE_PRIMARY_NAVIGATION = DESKTOP_NAVIGATION.slice(0, 4);
export const MOBILE_MORE_NAVIGATION = DESKTOP_NAVIGATION.slice(4);

export function isNavigationActive(
  pathname: string,
  destination: NavigationDestination
): boolean {
  if (destination.href === '/') return pathname === '/';
  return (
    pathname === destination.href || pathname.startsWith(`${destination.href}/`)
  );
}

export function parseShellPreference(raw: string | null): {
  collapsed: boolean;
} {
  if (!raw) return { collapsed: false };
  try {
    const value: unknown = JSON.parse(raw);
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (value as Record<string, unknown>).version === 1 &&
      typeof (value as Record<string, unknown>).collapsed === 'boolean'
    ) {
      return {
        collapsed: (value as Record<string, unknown>).collapsed as boolean,
      };
    }
  } catch {
    // Invalid device-local state falls back to the expanded desktop sidebar.
  }
  return { collapsed: false };
}

