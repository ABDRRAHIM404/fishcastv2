import { PageTransition } from '@/components/shared/motion';

export const metadata = { title: 'Species' };

// Placeholder route. Species tracking arrives in Phase 8.
export default function SpeciesPage() {
  return (
    <PageTransition className="space-y-3">
      <h1 className="font-display text-h1">Species</h1>
      <p className="text-muted-foreground">
        Species catalog and seasonality will be implemented in Phase 8.
      </p>
    </PageTransition>
  );
}
