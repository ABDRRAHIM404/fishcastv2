import { PageTransition } from '@/components/shared/motion';

export const metadata = { title: 'Map' };

// Placeholder route. Mapbox integration arrives in Phase 3.
export default function MapPage() {
  return (
    <PageTransition className="space-y-3">
      <h1 className="font-display text-h1">Map</h1>
      <p className="text-muted-foreground">
        Interactive Mapbox view will be implemented in Phase 3.
      </p>
    </PageTransition>
  );
}
