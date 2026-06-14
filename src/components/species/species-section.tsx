'use client';

import { motion } from 'framer-motion';
import { Fish } from 'lucide-react';
import { PremiumCard } from '@/components/spot/premium-card';
import { SpeciesCard } from '@/components/species/species-card';
import { staggerContainer } from '@/components/shared/motion';
import type { SpotSpecies } from '@/types/species';

/** Per-species presentation flags computed server-side. */
export interface SpeciesFlags {
  inSeason: boolean;
  favored: boolean;
  favoredReason: string | null;
}

/**
 * Species display for the spot details page. Always rendered so the page stays
 * visually complete; shows a styled empty state when no species are recorded.
 * "In season" / "Favored now" flags are passed in per species id.
 */
export function SpeciesSection({
  species,
  flags = {},
}: {
  species: SpotSpecies[];
  flags?: Record<string, SpeciesFlags>;
}) {
  return (
    <PremiumCard className="p-6">
      <div className="flex items-center gap-2">
        <Fish className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-h3">Species</h2>
      </div>

      {species.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border/60 px-6 py-10 text-center">
          <Fish
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-3 font-medium">No species data recorded yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Species tracking arrives in Phase 8.
          </p>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          {species.map((s) => {
            const f = flags[s.id];
            return (
              <SpeciesCard
                key={s.id}
                species={s}
                inSeason={f?.inSeason ?? false}
                favored={f?.favored ?? false}
                favoredReason={f?.favoredReason ?? null}
              />
            );
          })}
        </motion.div>
      )}
    </PremiumCard>
  );
}
