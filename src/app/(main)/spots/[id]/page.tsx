import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapPin, Navigation } from 'lucide-react';
import { PageTransition } from '@/components/shared/motion';
import { PremiumCard } from '@/components/spot/premium-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSpotBySlug } from '@/lib/spots/queries';
import {
  SPOT_TYPE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_BADGE_VARIANT,
} from '@/types/spot';

// The dynamic segment is the spot slug.
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

  const factors = spot.difficultyFactors ?? {};
  const factorEntries = Object.entries(factors).filter(
    ([, value]) => typeof value === 'string' && value.length > 0
  ) as [string, string][];

  return (
    <PageTransition className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/70 shadow-premium">
        <div className="relative aspect-[16/9] w-full bg-secondary/40 sm:aspect-[21/9]">
          {spot.imageUrl ? (
            <Image
              src={spot.imageUrl}
              alt={spot.name}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{SPOT_TYPE_LABELS[spot.spotType]}</Badge>
            <Badge variant={DIFFICULTY_BADGE_VARIANT[spot.difficultyLevel]}>
              {DIFFICULTY_LABELS[spot.difficultyLevel]}
            </Badge>
          </div>
          <h1 className="mt-3 font-display text-display">{spot.name}</h1>
          {spot.region ? (
            <p className="mt-1 flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-4" />
              {spot.region}
              {spot.province ? ` · ${spot.province}` : ''}
            </p>
          ) : null}
        </div>
      </section>

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

          {/* Placeholders for future marine data (Phase 5+). */}
          <PremiumCard className="p-6">
            <h2 className="font-display text-h3">Marine conditions</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Weather, tide, wind, waves, fishing score, and the marine timeline
              arrive in later phases.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {['Weather', 'Tide', 'Wind', 'Waves'].map((label) => (
                <div
                  key={label}
                  className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  {label}
                </div>
              ))}
            </div>
          </PremiumCard>
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
            <Button asChild variant="outline" className="mt-5 w-full">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation className="size-4" />
                Open in Maps
              </a>
            </Button>
          </PremiumCard>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/map">Back to map</Link>
          </Button>
        </aside>
      </div>
    </PageTransition>
  );
}
