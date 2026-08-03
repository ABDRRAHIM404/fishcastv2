import Link from 'next/link';
import { AlertTriangle, MapPinned, Navigation, Route } from 'lucide-react';
import { FavoriteButton } from '@/components/spot/favorite-button';
import { PremiumCard } from '@/components/spot/premium-card';
import { SpotGallery } from '@/components/spot/spot-gallery';
import { buttonVariants } from '@/components/ui/button';
import { publicSpotName } from '@/lib/forecast-ui/spots';
import type { SpotPhoto } from '@/lib/spots/photos';
import { cn } from '@/lib/utils';
import {
  DIFFICULTY_LABELS,
  SPOT_TYPE_LABELS,
  type Spot,
} from '@/types/spot';

export function SpotGuide({ spot, photos }: { spot: Spot; photos: SpotPhoto[] }) {
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
            <h2 className="font-display text-h2">About {displayName}</h2>
          </div>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            {spot.description ?? 'A verified editorial description is not available for this spot yet.'}
          </p>
        </PremiumCard>

        <PremiumCard className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Route className="size-5 text-primary" aria-hidden />
            <h2 className="font-display text-h3">Access, terrain and hazards</h2>
          </div>
          {factors.length > 0 ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {factors.map(([key, value]) => (
                <div key={key} className="rounded-lg border border-border/70 p-4">
                  <dt className="text-sm capitalize text-muted-foreground">{key.replaceAll('_', ' ')}</dt>
                  <dd className="mt-1 text-base capitalize">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              Detailed access and hazard information has not been recorded. Verify the route and shoreline locally.
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Parking and route information is shown only when present in the recorded difficulty details. Missing details are not inferred.
          </p>
        </PremiumCard>

        <SpotGallery photos={photos} spotName={displayName} />
      </div>

      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <PremiumCard className="p-5">
          <h2 className="font-display text-h3">Spot information</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Type</dt><dd>{SPOT_TYPE_LABELS[spot.spotType]}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Difficulty</dt><dd>{DIFFICULTY_LABELS[spot.difficultyLevel]}</dd></div>
            {spot.region ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Region</dt><dd className="text-right">{spot.region}</dd></div> : null}
            {spot.province ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Province</dt><dd className="text-right">{spot.province}</dd></div> : null}
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Coordinates</dt><dd className="text-right tabular-nums">{spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}</dd></div>
          </dl>
          <div className="mt-5 space-y-2">
            <FavoriteButton spotId={spot.id} />
            <a href={`https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 w-full')}><Navigation aria-hidden />Open in Maps</a>
          </div>
        </PremiumCard>
        <Link href="/map" className={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11 w-full')}>Back to map</Link>
      </aside>
    </div>
  );
}

