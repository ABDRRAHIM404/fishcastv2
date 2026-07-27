'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { PageTransition } from '@/components/shared/motion';
import { Button } from '@/components/ui/button';
import { useLocalFavorites } from '@/hooks/use-local-favorites';
import type { Spot } from '@/types/spot';

export function FavoritesClient({ spots }: { spots: Spot[] }) {
  const {
    status,
    error,
    spotIds,
    removeFavorite,
  } = useLocalFavorites();

  const favoriteSpots = useMemo(() => {
    const byId = new Map(spots.map((spot) => [spot.id, spot]));
    return spotIds
      .map((spotId) => byId.get(spotId))
      .filter((spot): spot is Spot => spot !== undefined);
  }, [spotIds, spots]);

  return (
    <PageTransition className="space-y-4">
      <div>
        <h1 className="font-display text-h1">Favorites</h1>
        <p className="text-muted-foreground">
          Spots saved only on this device. Clearing browser storage removes
          them.
        </p>
      </div>

      {status === 'pending' ? (
        <div
          className="rounded-2xl border border-border/70 bg-card/40 px-6 py-12 text-center"
          aria-busy="true"
          aria-live="polite"
        >
          <p className="font-medium">Loading saved spots…</p>
        </div>
      ) : error ? (
        <div
          className="rounded-2xl border border-destructive/50 bg-destructive/10 px-6 py-5 text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : favoriteSpots.length === 0 ? (
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
          {favoriteSpots.map((spot) => (
            <li
              key={spot.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/40 px-4 py-3 transition-colors hover:border-border"
            >
              <Link
                href={`/spots/${spot.slug}`}
                className="min-w-0 flex-1 truncate font-medium hover:text-primary"
              >
                {spot.name}
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeFavorite(spot.id)}
                aria-label={`Remove ${spot.name} from favorites`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </PageTransition>
  );
}
