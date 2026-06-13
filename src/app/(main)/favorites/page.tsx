import { PageTransition } from '@/components/shared/motion';

export const metadata = { title: 'Favorites' };

// Placeholder route. Favorites depend on auth (Phase 2).
export default function FavoritesPage() {
  return (
    <PageTransition className="space-y-3">
      <h1 className="font-display text-h1">Favorites</h1>
      <p className="text-muted-foreground">
        Saved spots will be available once authentication lands in Phase 2.
      </p>
    </PageTransition>
  );
}
