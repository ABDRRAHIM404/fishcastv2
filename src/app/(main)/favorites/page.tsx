import { FavoritesClient } from '@/app/(main)/favorites/favorites-client';
import { getActiveSpots } from '@/lib/spots/queries';
import type { Metadata } from 'next';
import { createTranslator } from '@/i18n/dictionaries';
import { getRequestLocale } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = createTranslator(await getRequestLocale());
  return { title: t('metadata.favouritesTitle') };
}

/** Public spot data is loaded on the server; local IDs are resolved client-side. */
export default async function FavoritesPage() {
  const spots = await getActiveSpots();
  return <FavoritesClient spots={spots} />;
}
