'use client';

import { FishingMap } from '@/components/map/fishing-map';
import type { Spot } from '@/types/spot';
import { cn } from '@/lib/utils';

export function LazyFishingMap({
  spots,
  className,
}: {
  spots: Spot[];
  className?: string;
}) {
  return <FishingMap spots={spots} className={cn(className)} />;
}