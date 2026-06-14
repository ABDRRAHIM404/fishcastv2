'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fadeInUp } from '@/components/shared/motion';
import {
  SPOT_TYPE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_BADGE_VARIANT,
  type Spot,
} from '@/types/spot';
import { cn } from '@/lib/utils';

/**
 * Premium spot card backed by the real `Spot` domain model. Links to the
 * spot details page. Reuses the Phase 1 surface + motion language.
 */
export function SpotListCard({
  spot,
  className,
}: {
  spot: Spot;
  className?: string;
}) {
  return (
    <motion.div variants={fadeInUp} whileHover={{ y: -4 }}>
      <Link
        href={`/spots/${spot.slug}`}
        className={cn(
          'surface-glass group block overflow-hidden rounded-lg shadow-premium transition-shadow hover:shadow-glow',
          className
        )}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary/40">
          {spot.imageUrl ? (
            <Image
              src={spot.imageUrl}
              alt={spot.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant="secondary">{SPOT_TYPE_LABELS[spot.spotType]}</Badge>
            <Badge variant={DIFFICULTY_BADGE_VARIANT[spot.difficultyLevel]}>
              {DIFFICULTY_LABELS[spot.difficultyLevel]}
            </Badge>
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-display text-h3 tracking-tight">{spot.name}</h3>
          {spot.region ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {spot.region}
              {spot.province ? ` · ${spot.province}` : ''}
            </p>
          ) : null}
          {spot.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {spot.description}
            </p>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}
