'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Spot } from '@/types/spot';

/**
 * Lazy wrapper for the interactive Mapbox map. mapbox-gl is large (~480kB),
 * so we defer loading the map component (and the library) until the /map page
 * renders on the client, keeping it out of the initial bundle. ssr:false is
 * required because Mapbox needs the DOM/window.
 *
 * The placeholder matches the map container box (h-[60vh] / min-h-[420px],
 * rounded-2xl) so there is no layout shift when the map mounts. The map's
 * own implementation — including the v2 callback API and global CSS — is not
 * modified here.
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
