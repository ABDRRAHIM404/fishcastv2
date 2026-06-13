import Link from 'next/link';
import { PageTransition } from '@/components/shared/motion';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { removeFavorite } from '@/lib/supabase/actions';
import type { Tables } from '@/lib/supabase/types';

export const metadata = { title: 'Favorites' };

type SpotRow = Pick<
  Tables<'spots'>,
  'id' | 'name' | 'type' | 'difficulty_level'
>;

type FavoriteRow = {
  spot_id: string;
  created_at: string;
  spots: SpotRow | SpotRow[] | null;
};

// Protected route: middleware redirects unauthenticated users to /login.
export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('favorites')
    .select('spot_id, created_at, spots(id, name, type, difficulty_level)')
    .order('created_at', { ascending: false });

  const favorites = (data ?? []) as FavoriteRow[];

  const remove = removeFavorite.bind(null);

  return (
    <PageTransition className="space-y-4">
      <div>
        <h1 className="font-display text-h1">Favorites</h1>
        <p className="text-muted-foreground">
          Spots saved by {user?.email ?? 'you'}.
        </p>
      </div>

      {favorites.length === 0 ? (
        <p className="text-muted-foreground">
          No saved spots yet. Browse the{' '}
          <Link href="/map" className="text-primary underline">
            map
          </Link>{' '}
          and save your favorites.
        </p>
      ) : (
        <ul className="space-y-2">
          {favorites.map((fav) => {
            const spot = Array.isArray(fav.spots) ? fav.spots[0] : fav.spots;
            return (
              <li
                key={fav.spot_id}
                className="flex items-center justify-between rounded-lg border border-border/70 px-4 py-3"
              >
                <Link
                  href={`/spots/${fav.spot_id}`}
                  className="font-medium hover:text-primary"
                >
                  {spot?.name ?? 'Spot'}
                </Link>
                <form
                  action={async () => {
                    'use server';
                    await remove(fav.spot_id);
                  }}
                >
                  <Button type="submit" variant="outline" size="sm">
                    Remove
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </PageTransition>
  );
}