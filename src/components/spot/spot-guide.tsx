'use client';

import Link from 'next/link';
import { AlertTriangle, MapPinned, Navigation, Route } from 'lucide-react';
import { FavoriteButton } from '@/components/spot/favorite-button';
import { PremiumCard } from '@/components/spot/premium-card';
import { SpotGallery } from '@/components/spot/spot-gallery';
import { buttonVariants } from '@/components/ui/button';
import { publicSpotName } from '@/lib/forecast-ui/spots';
import type { SpotPhoto } from '@/lib/spots/photos';
import { cn } from '@/lib/utils';
import type { Spot } from '@/types/spot';
import { useI18n } from '@/i18n/provider';
import { formatCoordinates } from '@/i18n/formatting';
import { difficultyLabel, spotTypeLabel } from '@/i18n/presentation';

export function SpotGuide({ spot, photos }: { spot: Spot; photos: SpotPhoto[] }) {
  const { locale, t } = useI18n();
  const displayName = publicSpotName(spot.slug, spot.name);
  const factors = Object.entries(spot.difficultyFactors ?? {}).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[1].length > 0
  );
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <PremiumCard className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <MapPinned className="size-5 text-primary" aria-hidden />
            <h2 className="font-display text-h2">{t('spot.about', { spot: displayName })}</h2>
          </div>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            <span dir="auto">{spot.description ?? t('spot.noDescription')}</span>
          </p>
        </PremiumCard>

        <PremiumCard className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Route className="size-5 text-primary" aria-hidden />
            <h2 className="font-display text-h3">{t('spot.accessTerrainHazards')}</h2>
          </div>
          {factors.length > 0 ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {factors.map(([key, value]) => (
                <div key={key} className="rounded-lg border border-border/70 p-4">
                  <dt className="text-sm capitalize text-muted-foreground">{key === 'access' ? t('spot.access') : key === 'terrain' ? t('spot.terrain') : key === 'hazards' ? t('spot.hazards') : key === 'parking' ? t('spot.parking') : key.replaceAll('_', ' ')}</dt>
                  <dd className="mt-1 text-base capitalize" dir="auto">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t('spot.noHazards')}
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            {t('spot.noParking')}
          </p>
        </PremiumCard>

        <SpotGallery photos={photos} spotName={displayName} />
      </div>

      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <PremiumCard className="p-5">
          <h2 className="font-display text-h3">{t('spot.information')}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('spot.type')}</dt><dd>{spotTypeLabel(t, spot.spotType)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('spot.difficulty')}</dt><dd>{difficultyLabel(t, spot.difficultyLevel)}</dd></div>
            {spot.region ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('spot.region')}</dt><dd className="text-end" dir="auto">{spot.region}</dd></div> : null}
            {spot.province ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('spot.province')}</dt><dd className="text-end" dir="auto">{spot.province}</dd></div> : null}
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('spot.coordinates')}</dt><dd className="text-end tabular-nums" dir="ltr">{formatCoordinates(locale, spot.latitude, spot.longitude)}</dd></div>
          </dl>
          <div className="mt-5 space-y-2">
            <FavoriteButton spotId={spot.id} />
            <a href={`https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 w-full')}><Navigation aria-hidden />{t('spot.openMaps')}</a>
          </div>
        </PremiumCard>
        <Link href="/map" className={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11 w-full')}>{t('common.backToMap')}</Link>
      </aside>
    </div>
  );
}
