'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { fadeInUp } from '@/components/shared/motion';
import type { SpotPreview } from '@/types';
import { cn } from '@/lib/utils';

const typeLabels: Record<SpotPreview['type'], string> = {
  beach: 'Beach',
  rocks: 'Rocks',
  port: 'Port',
  river_mouth: 'River Mouth',
  pier: 'Pier',
};

const difficultyLabels: Record<SpotPreview['difficulty'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

/**
 * SpotCard shell — premium card with a hero image area, type and difficulty
 * badges, and a title. Accepts static placeholder data only in Phase 1.
 */
export function SpotCard({
  spot,
  className,
}: {
  spot: SpotPreview;
  className?: string;
}) {
  return (
    <motion.article
      variants={fadeInUp}
      whileHover={{ y: -4 }}
      className={cn(
        'surface-glass group overflow-hidden rounded-lg shadow-premium transition-shadow hover:shadow-glow',
        className
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <Image
          src={spot.imageUrl}
          alt={spot.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge variant="secondary">{typeLabels[spot.type]}</Badge>
          <Badge variant="outline">{difficultyLabels[spot.difficulty]}</Badge>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display text-h3 tracking-tight">{spot.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Souss-Massa, Morocco
        </p>
      </div>
    </motion.article>
  );
}
