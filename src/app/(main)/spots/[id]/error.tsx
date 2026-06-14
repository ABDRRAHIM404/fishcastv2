'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { PremiumCard } from '@/components/spot/premium-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SpotError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for observability; details are intentionally not shown to users.
    console.error(error);
  }, [error]);

  return (
    <PremiumCard className="mx-auto max-w-md p-8 text-center">
      <AlertTriangle
        className="mx-auto size-10 text-condition-poor"
        aria-hidden
      />
      <h1 className="mt-4 font-display text-h2">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        We couldn&apos;t load this spot. Please try again.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link href="/map" className={cn(buttonVariants({ variant: 'outline' }))}>
          Back to map
        </Link>
      </div>
    </PremiumCard>
  );
}
