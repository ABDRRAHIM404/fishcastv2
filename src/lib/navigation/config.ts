export type NavigationIcon =
  | 'home'
  | 'forecast'
  | 'map'
  | 'spots'
  | 'species'
  | 'favorites';

export interface NavigationDestination {
  label: NavigationIcon;
  href: string;
  icon: NavigationIcon;
}

/** Every destination below resolves to a real application page. */
export const DESKTOP_NAVIGATION: readonly NavigationDestination[] = [
  { label: 'home', href: '/', icon: 'home' },
  { label: 'forecast', href: '/forecast', icon: 'forecast' },
  { label: 'map', href: '/map', icon: 'map' },
  { label: 'spots', href: '/spots', icon: 'spots' },
  { label: 'species', href: '/species', icon: 'species' },
  { label: 'favorites', href: '/favorites', icon: 'favorites' },
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
