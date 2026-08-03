import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** Premium spot-card skeleton mirroring <SpotCard> layout. */
export function SpotCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </Card>
  );
}

/** Grid of spot-card skeletons for list/loading states. */
export function SpotGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SpotCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for the marine conditions card grid (Wind/Waves/Weather/Tide). */
export function MarineConditionsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border/60 p-4"
        >
          <Skeleton className="h-4 w-20" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Premium skeleton mirroring the spot details page layout. */
export function SpotDetailsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-60 w-full rounded-2xl sm:h-80 lg:h-[28rem]" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
