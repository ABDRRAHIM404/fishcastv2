import { PageTransition } from '@/components/shared/motion';
import { PremiumCard } from '@/components/spot/premium-card';
import { siteConfig } from '@/config/site';

export const metadata = { title: 'Sign in' };

// Placeholder route. Authentication arrives in Phase 2.
export default function LoginPage() {
  return (
    <PageTransition className="flex min-h-dvh items-center justify-center p-5">
      <PremiumCard className="w-full max-w-sm p-8 text-center">
        <h1 className="font-display text-h1">{siteConfig.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Authentication will be implemented in Phase 2.
        </p>
      </PremiumCard>
    </PageTransition>
  );
}
