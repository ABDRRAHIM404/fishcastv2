'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Fish } from 'lucide-react';
import { fadeInUp } from '@/components/shared/motion';
import {
  summarizePreferredConditions,
  type Species,
} from '@/types/species';

/**
 * Premium catalog card for the /species page. Shows the full species metadata:
 * names, image, description, and a preferred-conditions summary.
 */
export function SpeciesCatalogCard({ species }: { species: Species }) {
  const conditions = summarizePreferredConditions(species.preferredConditions);

  return (
    <motion.article
      variants={fadeInUp}
      whileHover={{ y: -4 }}
      className="surface-glass group overflow-hidden rounded-lg shadow-premium transition-shadow hover:shadow-glow"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary/50">
        {species.imageUrl ? (
          <Image
            src={species.imageUrl}
            alt={species.commonName}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Fish className="size-10" aria-hidden />
          </div>
        )}
      </div>
      <div className="space-y-2 p-5">
        <div>
          <h3 className="font-display text-h3 tracking-tight">
            {species.commonName}
          </h3>
          {species.localName || species.scientificName ? (
            <p className="text-sm text-muted-foreground">
              {species.localName ?? ''}
              {species.localName && species.scientificName ? ' · ' : ''}
              {species.scientificName ? (
                <span className="italic">{species.scientificName}</span>
              ) : null}
            </p>
          ) : null}
        </div>
        {species.description ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {species.description}
          </p>
        ) : null}
        {conditions ? (
          <p className="text-caption uppercase text-muted-foreground">
            Prefers: <span className="normal-case">{conditions}</span>
          </p>
        ) : null}
      </div>
    </motion.article>
  );
}
