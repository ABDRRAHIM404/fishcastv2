import { FavoritesClient } from '@/app/(main)/favorites/favorites-client';
import { getActiveSpots } from '@/lib/spots/queries';

export const metadata = { title: 'Favorites' };

/** Public spot data is loaded on the server; local IDs are resolved client-side. */
export default async function FavoritesPage() {
  const spots = await getActiveSpots();
  return <FavoritesClient spots={spots} />;
}
