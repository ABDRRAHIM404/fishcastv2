'use client';

import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ImageIcon, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fadeInUp } from '@/components/shared/motion';
import { DIFFICULTY_BADGE_VARIANT, type Spot } from '@/types/spot';
import { cn } from '@/lib/utils';
import { publicSpotName } from '@/lib/forecast-ui/spots';
import { useI18n } from '@/i18n/provider';
import { difficultyLabel, spotTypeLabel } from '@/i18n/presentation';

/**
 * Premium spot card backed by the real `Spot` domain model. Links to the
 * spot details page. Reuses the Phase 1 surface + motion language.
 */
export function SpotListCard({
  spot,
  className,
  href = `/spots/${spot.slug}`,
}: {
  spot: Spot;
  className?: string;
  href?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const { t } = useI18n();
  const displayName = publicSpotName(spot.slug, spot.name);
  return (
    <motion.div variants={fadeInUp} whileHover={{ y: -4 }}>
      <Link
        href={href}
        className={cn(
          'surface-glass group block overflow-hidden rounded-lg shadow-premium transition-shadow hover:shadow-glow',
          className
        )}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary/40">
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50" aria-hidden><ImageIcon className="size-8" /></div>
          {spot.imageUrl && !imageFailed ? (
            <Image
              src={spot.imageUrl}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageFailed(true)}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
          <div className="absolute top-3 flex gap-2 [inset-inline-start:0.75rem]">
            <Badge variant="secondary">{spotTypeLabel(t, spot.spotType)}</Badge>
            <Badge variant={DIFFICULTY_BADGE_VARIANT[spot.difficultyLevel]}>
              {difficultyLabel(t, spot.difficultyLevel)}
            </Badge>
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-display text-h3 tracking-tight">{displayName}</h3>
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
