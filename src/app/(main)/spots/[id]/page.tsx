import { PageTransition } from '@/components/shared/motion';
import { SpotGridSkeleton } from '@/components/shared/skeletons';

export const metadata = { title: 'Spot' };

// Placeholder route. Full spot details arrive in Phase 4.
export default async function SpotDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageTransition className="space-y-6">
      <h1 className="font-display text-h1">Spot {id}</h1>
      <p className="text-muted-foreground">
        Spot details page will be implemented in Phase 4. Skeleton preview below.
      </p>
      <SpotGridSkeleton count={3} />
    </PageTransition>
  );
}
