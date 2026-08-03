'use client';

import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fish } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fadeInUp } from '@/components/shared/motion';
import {
  PREVALENCE_BADGE_VARIANT,
  type SpotSpecies,
} from '@/types/species';
import { useI18n } from '@/i18n/provider';
import { formatSeasonMonths } from '@/i18n/formatting';
import { prevalenceLabel } from '@/i18n/presentation';

/**
 * Species card for the spot details page. Shows the species image, names,
 * prevalence, and seasonality, plus optional "In season" and "Favored now"
 * flags computed server-side (Phase 8).
 */
export function SpeciesCard({
  species,
  inSeason = false,
  favored = false,
  preferredSummary = null,
}: {
  species: SpotSpecies;
  inSeason?: boolean;
  favored?: boolean;
  favoredReason?: string | null;
  preferredSummary?: string | null;
}) {
  const { locale, t } = useI18n();
  const season = formatSeasonMonths(locale, species.seasonMonths, t('species.allYear'));
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <motion.article
      variants={fadeInUp}
      className="surface-glass group flex gap-4 overflow-hidden rounded-lg border border-border/60 p-3"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-secondary/50">
        {species.imageUrl && !imageFailed ? (
          <Image
            src={species.imageUrl}
            alt={species.commonName}
            fill
            sizes="80px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageFailed(true)}
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
              {prevalenceLabel(t, species.prevalence)}
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
            {t('species.season')}: <span className="normal-case">{season}</span>
          </p>
        ) : null}
        {preferredSummary ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {t('species.prefers')}: {preferredSummary}
          </p>
        ) : null}
        {inSeason || favored ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {favored ? (
              <Badge
                variant="excellent"
                title={t('species.favouredReason')}
              >
                {t('species.favouredNow')}
              </Badge>
            ) : null}
            {inSeason ? <Badge variant="good">{t('species.inSeason')}</Badge> : null}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
