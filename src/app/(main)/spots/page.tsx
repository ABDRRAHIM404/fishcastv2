import { PageTransition, StaggerGroup, StaggerItem } from '@/components/shared/motion';
import { SpotListCard } from '@/components/spot/spot-list-card';
import { getActiveSpots } from '@/lib/spots/queries';

export const metadata = { title: 'Spots' };

export default async function SpotsPage() {
  const spots = await getActiveSpots();

  return (
    <PageTransition className="space-y-5">
      <div>
        <h1 className="font-display text-h1">Fishing spots</h1>
        <p className="text-muted-foreground">
          Local spots across Chtouka Aït Baha and Souss-Massa.
        </p>
      </div>

      {spots.length === 0 ? (
        <p className="text-muted-foreground">No spots available yet.</p>
      ) : (
        <StaggerGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map((spot) => (
            <StaggerItem key={spot.id}>
              <SpotListCard spot={spot} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </PageTransition>
  );
}
