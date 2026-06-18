'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Spot } from '@/types/spot';

/**
 * Lazy wrapper for the interactive Leaflet map. Leaflet depends on the DOM/window,
 * so we defer loading the map component until the /map page renders on the client.
 * ssr:false avoids server-side rendering issues.
 *
 * The placeholder matches the map container box (h-[60vh] / min-h-[420px],
 * rounded-2xl) so there is no layout shift when the map mounts.
 */
const FishingMap = dynamic(
  () => import('@/components/map/fishing-map').then((m) => m.FishingMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="relative flex h-[60vh] min-h-[420px] w-full items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-background/60 shadow-premium"
        role="status"
        aria-label="Loading map"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading map…</p>
        </div>
      </div>
    ),
  }
);

export function LazyFishingMap({
  spots,
  className,
}: {
  spots: Spot[];
  className?: string;
}) {
  return <FishingMap spots={spots} className={cn(className)} />;
}
