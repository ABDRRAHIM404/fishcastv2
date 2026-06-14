import type { Enums } from '@/lib/supabase/types';

/** Prevalence enum derived from the generated Supabase schema (source of truth). */
export type Prevalence = Enums<'prevalence'>;

export interface SpotSpecies {
  id: string;
  commonName: string;
  localName: string | null;
  scientificName: string | null;
  imageUrl: string | null;
  description: string | null;
  seasonMonths: number[];
  prevalence: Prevalence | null;
  notes: string | null;
}

export const PREVALENCE_LABELS: Record<Prevalence, string> = {
  common: 'Common',
  occasional: 'Occasional',
  rare: 'Rare',
};

export const PREVALENCE_BADGE_VARIANT: Record<
  Prevalence,
  'good' | 'moderate' | 'poor'
> = {
  common: 'good',
  occasional: 'moderate',
  rare: 'poor',
};

const MONTH_ABBR = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
] as const;

export function formatSeasonMonths(months: number[]): string | null {
  const valid = Array.from(
    new Set(months.filter((m) => Number.isInteger(m) && m >= 1 && m <= 12))
  ).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  if (valid.length === 12) return 'All year';

  const ranges: string[] = [];
  let start: number = valid[0]!;
  let prev: number = valid[0]!;

  for (let i = 1; i <= valid.length; i++) {
    const current: number | undefined = valid[i];
    if (current !== prev + 1) {
      ranges.push(
        start === prev
          ? MONTH_ABBR[start - 1]!
          : `${MONTH_ABBR[start - 1]!}-${MONTH_ABBR[prev - 1]!}`
      );
      if (current !== undefined) start = current;
    }
    if (current !== undefined) prev = current;
  }

  return ranges.join(', ');
}