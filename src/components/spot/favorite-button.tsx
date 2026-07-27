'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalFavorites } from '@/hooks/use-local-favorites';
import { cn } from '@/lib/utils';

export function FavoriteButton({
  spotId,
  className,
}: {
  spotId: string;
  className?: string;
}) {
  const {
    status,
    error,
    available,
    isFavorite,
    toggleFavorite,
  } = useLocalFavorites();
  const favorited = isFavorite(spotId);
  const pending = status === 'pending';
  const feedback = pending
    ? 'Loading saved status'
    : error
      ? error
      : favorited
        ? 'Spot saved on this device'
        : 'Spot not saved';

  return (
    <div className={cn('w-full', className)}>
      <Button
        type="button"
        variant={favorited ? 'default' : 'outline'}
        onClick={() => toggleFavorite(spotId)}
        disabled={!available}
        aria-busy={pending}
        aria-pressed={favorited}
        aria-label={
          pending
            ? 'Loading saved status'
            : favorited
              ? 'Remove from favorites'
              : 'Save to favorites'
        }
        className="w-full"
      >
        <Heart
          className={cn('size-4', favorited && 'fill-current')}
          aria-hidden
        />
        {pending ? 'Loading…' : favorited ? 'Saved' : 'Save spot'}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {feedback}
      </span>
      {error ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
