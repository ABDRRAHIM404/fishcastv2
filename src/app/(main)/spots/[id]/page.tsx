import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Navigation } from 'lucide-react';
import { PageTransition } from '@/components/shared/motion';
import { PremiumCard } from '@/components/spot/premium-card';
import { SpotHero } from '@/components/spot/spot-hero';
import { SpotGallery } from '@/components/spot/spot-gallery';
import { FavoriteButton } from '@/components/spot/favorite-button';
import { SpeciesSection } from '@/components/species/species-section';
import { MarineConditionsSection } from '@/components/marine/marine-conditions';
import { FishingScoreCard } from '@/components/scoring/fishing-score-card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getSpotBySlug } from '@/lib/spots/queries';
import { getSpotPhotos } from '@/lib/spots/photos';
import { getSpotSpecies } from '@/lib/species/queries';
import { isSpotFavorited } from '@/lib/spots/favorites';
import { SPOT_TYPE_LABELS, DIFFICULTY_LABELS } from '@/types/spot';

// The dynamic segment is the spot slug (route folder name kept as [id]).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const spot = await getSpotBySlug(id);
  return { title: spot?.name ?? 'Spot' };
}

export default async function SpotDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const spot = await getSpotBySlug(id);
  if (!spot) notFound();

  // Fetch presentation data in parallel. Species/photos are read-only here.
  const [photos, species, favorited] = await Promise.all([
    getSpotPhotos(spot.id),
    getSpotSpecies(spot.id),
    isSpotFavorited(spot.id),
  ]);

  const factors = spot.difficultyFactors ?? {};
  const factorEntries = Object.entries(factors).filter(
    ([, value]) => typeof value === 'string' && value.length > 0
  ) as [string, string][];

  return (
    <PageTransition className="space-y-8">
      <SpotHero spot={spot} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {spot.description ? (
            <PremiumCard className="p-6">
              <h2 className="font-display text-h3">About this spot</h2>
              <p className="mt-3 text-body-lg text-muted-foreground">
                {spot.description}
              </p>
            </PremiumCard>
          ) : null}

          {factorEntries.length > 0 ? (
            <PremiumCard className="p-6">
              <h2 className="font-display text-h3">Difficulty breakdown</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {factorEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-lg border border-border/60 px-4 py-3"
                  >
                    <dt className="text-caption uppercase text-muted-foreground">
                      {key}
                    </dt>
                    <dd className="mt-0.5 capitalize">{value}</dd>
                  </div>
                ))}
              </dl>
            </PremiumCard>
          ) : null}

          <SpotGallery photos={photos} spotName={spot.name} />

          <FishingScoreCard spotId={spot.id} />

          <MarineConditionsSection spotId={spot.id} />

          <SpeciesSection species={species} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <PremiumCard className="p-6">
            <h2 className="font-display text-h3">Spot information</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{SPOT_TYPE_LABELS[spot.spotType]}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Difficulty</dt>
                <dd>{DIFFICULTY_LABELS[spot.difficultyLevel]}</dd>
              </div>
              {spot.region ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Region</dt>
                  <dd>{spot.region}</dd>
                </div>
              ) : null}
              {spot.province ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Province</dt>
                  <dd>{spot.province}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Coordinates</dt>
                <dd className="tabular-nums">
                  {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 space-y-2">
              <FavoriteButton spotId={spot.id} initialFavorited={favorited} />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'w-full'
                )}
              >
                <Navigation className="size-4" />
                Open in Maps
              </a>
            </div>
          </PremiumCard>

          <Link
            href="/map"
            className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}
          >
            Back to map
          </Link>
        </aside>
      </div>
    </PageTransition>
  );
}
