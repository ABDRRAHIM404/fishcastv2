'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { SpeciesCatalogCard } from '@/components/species/species-catalog-card';
import { staggerContainer } from '@/components/shared/motion';
import { cn } from '@/lib/utils';
import type { Species } from '@/types/species';

/**
 * Premium species catalog with name search. Client component so search is
 * instant. Receives the catalog from the server page.
 */
export function SpeciesCatalog({ species }: { species: Species[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return species.filter((s) => {
      if (!q) return true;
      return (
        s.commonName.toLowerCase().includes(q) ||
        (s.localName?.toLowerCase().includes(q) ?? false) ||
        (s.scientificName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [species, query]);

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search species by name…"
          aria-label="Search species"
          className={cn(
            'w-full rounded-lg border border-border bg-secondary/40 py-2.5 pl-9 pr-3 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No species match your search.</p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((s) => (
            <SpeciesCatalogCard key={s.id} species={s} />
          ))}
        </motion.div>
      )}
    </div>
  );
}