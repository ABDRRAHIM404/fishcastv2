'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalFavorites } from '@/hooks/use-local-favorites';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';

export function FavoriteButton({
  spotId,
  className,
}: {
  spotId: string;
  className?: string;
}) {
  const { t } = useI18n();
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
    ? t('favourites.loadingStatus')
    : error
      ? t('favourites.storageError')
      : favorited
        ? t('favourites.savedStatus')
        : t('favourites.notSavedStatus');

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
            ? t('favourites.loadingStatus')
            : favorited
              ? t('favourites.remove')
              : t('favourites.save')
        }
        className="w-full"
      >
        <Heart
          className={cn('size-4', favorited && 'fill-current')}
          aria-hidden
        />
        {pending ? `${t('common.loading')}…` : favorited ? t('favourites.saved') : t('favourites.saveSpot')}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {feedback}
      </span>
      {error ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {t('favourites.storageError')}
        </p>
      ) : null}
    </div>
  );
}
