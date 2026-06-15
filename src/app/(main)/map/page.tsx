import { PageTransition } from '@/components/shared/motion';
import { LazyFishingMap } from '@/components/map/lazy-fishing-map';
import { getActiveSpots } from '@/lib/spots/queries';

const mapDescription =
  'Explore fishing spots across Chtouka Aït Baha and the Souss-Massa coast on an interactive map.';

export const metadata = {
  title: 'Map',
  description: mapDescription,
  openGraph: { title: 'Map', description: mapDescription },
};

// Server component: fetch spots, then hand them to the client map.
export default async function MapPage() {
  const spots = await getActiveSpots();
  if (!spots?.length) {
    console.error(
      'MapPage: getActiveSpots returned no active spots. The map may render blank.'
    );
  }

  return (
    <PageTransition className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-h1">Map</h1>
          <p className="text-muted-foreground">
            Fishing spots across Chtouka Aït Baha and Souss-Massa.
          </p>
        </div>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {spots.length} spot{spots.length === 1 ? '' : 's'}
        </span>
      </div>

      <LazyFishingMap spots={spots} />
    </PageTransition>
  );
  console.log('MapPage spots:', JSON.stringify(spots.map(s => ({ name: s.name, lat: s.latitude, lng: s.longitude, active: s.active }))));
}
