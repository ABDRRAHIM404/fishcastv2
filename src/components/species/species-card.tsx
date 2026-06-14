'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Fish } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fadeInUp } from '@/components/shared/motion';
import {
  PREVALENCE_LABELS,
  PREVALENCE_BADGE_VARIANT,
  formatSeasonMonths,
  type SpotSpecies,
} from '@/types/species';

/**
 * Read-only species card for the spot details page. Shows the species image,
 * names, prevalence, and seasonality. No suitability / "favored now" logic
 * (Phase 8).
 */
export function SpeciesCard({ species }: { species: SpotSpecies }) {
  const season = formatSeasonMonths(species.seasonMonths);

  return (
    <motion.article
      variants={fadeInUp}
      className="surface-glass group flex gap-4 overflow-hidden rounded-lg border border-border/60 p-3"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-secondary/50">
        {species.imageUrl ? (
          <Image
            src={species.imageUrl}
            alt={species.commonName}
            fill
            sizes="80px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Fish className="size-6" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-medium">{species.commonName}</h3>
          {species.prevalence ? (
            <Badge variant={PREVALENCE_BADGE_VARIANT[species.prevalence]}>
              {PREVALENCE_LABELS[species.prevalence]}
            </Badge>
          ) : null}
        </div>
        {species.localName || species.scientificName ? (
          <p className="truncate text-sm text-muted-foreground">
            {species.localName ?? ''}
            {species.localName && species.scientificName ? ' · ' : ''}
            {species.scientificName ? (
              <span className="italic">{species.scientificName}</span>
            ) : null}
          </p>
        ) : null}
        {season ? (
          <p className="mt-1 text-caption uppercase text-muted-foreground">
            Season: <span className="normal-case">{season}</span>
          </p>
        ) : null}
      </div>
    </motion.article>
  );
}
