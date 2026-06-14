/** Static site-wide configuration. No business logic. */
export const siteConfig = {
  name: 'FishCast',
  tagline: 'Should I go fishing now, and where is the best spot?',
  description:
    'Marine fishing intelligence for Chtouka Aït Baha and the Souss-Massa region of Morocco.',
  region: 'Chtouka Aït Baha · Souss-Massa, Morocco',
} as const;

/** Primary navigation. */
export const mainNav = [
  { title: 'Map', href: '/map' },
  { title: 'Spots', href: '/spots' },
  { title: 'Species', href: '/species' },
  { title: 'Favorites', href: '/favorites' },
] as const;

export type NavItem = (typeof mainNav)[number];
