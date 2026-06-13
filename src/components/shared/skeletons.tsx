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
