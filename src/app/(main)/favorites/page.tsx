import Link from 'next/link';
import { PageTransition } from '@/components/shared/motion';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { removeFavorite } from '@/lib/supabase/actions';
import type { Tables } from '@/lib/supabase/types';

export const metadata = { title: 'Favorites' };

type SpotRow = Pick<
  Tables<'spots'>,
  'id' | 'slug' | 'name' | 'type' | 'difficulty_level'
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
    .select('spot_id, created_at, spots(id, slug, name, type, difficulty_level)')
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
        <div className="rounded-2xl border border-border/70 bg-card/40 px-6 py-12 text-center">
          <p className="font-display text-h3">No saved spots yet</p>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            Browse the map and tap the heart on any spot to save it here for
            quick access.
          </p>
          <Link
            href="/map"
            className="mt-5 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Explore the map
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {favorites.map((fav) => {
            const spot = Array.isArray(fav.spots) ? fav.spots[0] : fav.spots;
            const href = spot?.slug ? `/spots/${spot.slug}` : '/spots';
            return (
              <li
                key={fav.spot_id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/40 px-4 py-3 transition-colors hover:border-border"
              >
                <Link
                  href={href}
                  className="min-w-0 flex-1 truncate font-medium hover:text-primary"
                >
                  {spot?.name ?? 'Spot'}
                </Link>
                <form
                  action={async () => {
                    'use server';
                    await remove(fav.spot_id);
                  }}
                >
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    aria-label={`Remove ${spot?.name ?? 'spot'} from favorites`}
                  >
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