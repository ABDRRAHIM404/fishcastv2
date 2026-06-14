'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addFavorite, removeFavorite } from '@/lib/supabase/actions';
import { cn } from '@/lib/utils';

/**
 * Optimistic favorite toggle for the spot details page.
 *
 * Reuses the existing addFavorite / removeFavorite server actions (no
 * duplicate favorites logic). State flips immediately for a premium, instant
 * feel; the server action runs inside a transition and the optimistic value is
 * rolled back if it throws. Logged-out users are redirected to /login by the
 * server action's existing auth flow.
 */
export function FavoriteButton({
  spotId,
  initialFavorited,
  className,
}: {
  spotId: string;
  initialFavorited: boolean;
  className?: string;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !favorited;
    setFavorited(next); // optimistic
    startTransition(async () => {
      try {
        if (next) {
          await addFavorite(spotId);
        } else {
          await removeFavorite(spotId);
        }
      } catch {
        setFavorited(!next); // rollback on failure
      }
    });
  }

  return (
    <Button
      type="button"
      variant={favorited ? 'default' : 'outline'}
      onClick={toggle}
      disabled={isPending}
      aria-pressed={favorited}
      aria-label={favorited ? 'Remove from favorites' : 'Save to favorites'}
      className={cn('w-full', className)}
    >
      <Heart
        className={cn('size-4', favorited && 'fill-current')}
        aria-hidden
      />
      {favorited ? 'Saved' : 'Save spot'}
    </Button>
  );
}
