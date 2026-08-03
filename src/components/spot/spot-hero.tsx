'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ImageIcon, Loader2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { transitions } from '@/components/shared/motion';
import { DIFFICULTY_BADGE_VARIANT, type Spot } from '@/types/spot';
import { useI18n } from '@/i18n/provider';
import { difficultyLabel, spotTypeLabel } from '@/i18n/presentation';

/**
 * Premium hero for the spot details page: large image with an ocean-gradient
 * scrim, type + difficulty badges, title, and region. Gracefully renders a
 * gradient surface when no image is available.
 */
export function SpotHero({
  spot,
  pendingSpotName,
}: {
  spot: Spot;
  pendingSpotName?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const { t } = useI18n();
  const updating = Boolean(pendingSpotName);
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/70 shadow-premium" aria-busy={updating}>
      <div className="relative h-60 w-full bg-gradient-to-br from-secondary/70 via-card to-background sm:h-80 lg:h-[clamp(22rem,30vw,30rem)]">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50" aria-hidden>
          <ImageIcon className="size-12" />
        </div>
        {spot.imageUrl && !imageFailed && !updating ? (
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
              sizes="100vw"
              className="object-cover"
              onError={() => setImageFailed(true)}
            />
          </motion.div>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transitions.smooth, delay: 0.1 }}
        className="absolute inset-x-0 bottom-0 p-4 sm:p-6"
      >
        {!updating ? <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{spotTypeLabel(t, spot.spotType)}</Badge>
          <Badge variant={DIFFICULTY_BADGE_VARIANT[spot.difficultyLevel]}>
            {difficultyLabel(t, spot.difficultyLevel)}
          </Badge>
        </div> : null}
        <h1 className="mt-3 font-display text-h1 sm:text-display">{pendingSpotName ?? spot.name}</h1>
        {updating ? (
          <p className="mt-2 flex items-center gap-2 text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin text-primary" aria-hidden />{t('spot.updating')}</p>
        ) : spot.region ? (
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
