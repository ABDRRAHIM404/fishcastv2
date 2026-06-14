'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { transitions } from '@/components/shared/motion';
import {
  SPOT_TYPE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_BADGE_VARIANT,
  type Spot,
} from '@/types/spot';

/**
 * Premium hero for the spot details page: large image with an ocean-gradient
 * scrim, type + difficulty badges, title, and region. Gracefully renders a
 * gradient surface when no image is available.
 */
export function SpotHero({ spot }: { spot: Spot }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/70 shadow-premium">
      <div className="relative aspect-[16/9] w-full bg-secondary/40 sm:aspect-[21/9]">
        {spot.imageUrl ? (
          <motion.div
            initial={{ scale: 1.06, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={transitions.smooth}
            className="absolute inset-0"
          >
            <Image
              src={spot.imageUrl}
              alt={spot.name}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transitions.smooth, delay: 0.1 }}
        className="absolute bottom-0 left-0 right-0 p-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{SPOT_TYPE_LABELS[spot.spotType]}</Badge>
          <Badge variant={DIFFICULTY_BADGE_VARIANT[spot.difficultyLevel]}>
            {DIFFICULTY_LABELS[spot.difficultyLevel]}
          </Badge>
        </div>
        <h1 className="mt-3 font-display text-display">{spot.name}</h1>
        {spot.region ? (
          <p className="mt-1 flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-4" />
            {spot.region}
            {spot.province ? ` · ${spot.province}` : ''}
          </p>
        ) : null}
      </motion.div>
    </section>
  );
}
