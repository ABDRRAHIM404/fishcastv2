import { CalendarDays } from 'lucide-react';
import { PageTransition, StaggerGroup, StaggerItem } from '@/components/shared/motion';
import { SpotListCard } from '@/components/spot/spot-list-card';
import { getActiveSpots } from '@/lib/spots/queries';

export const metadata = {
  title: 'Forecast',
  description: 'Choose a FishCast spot to open its detailed seven-day fishing forecast.',
};

export default async function ForecastPage() {
  const spots = await getActiveSpots();
  return (
    <PageTransition className="space-y-6">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-primary">
          <CalendarDays className="size-5" aria-hidden />
          <span className="text-sm font-medium uppercase tracking-[0.18em]">Seven-day forecast</span>
        </div>
        <h1 className="mt-2 font-display text-h1">Choose a fishing spot</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Open fishing quality, safety, best windows, marine conditions, graphs and timeline for one of the six FishCast locations.
        </p>
      </div>
      {spots.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-muted-foreground">No active forecast spots are available.</p>
      ) : (
        <StaggerGroup className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {spots.map((spot) => (
            <StaggerItem key={spot.id}>
              <SpotListCard spot={spot} href={`/spots/${spot.slug}?section=forecast`} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </PageTransition>
  );
}
