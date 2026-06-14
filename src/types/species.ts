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

/**
 * Species preferred-conditions schema (stored as jsonb in species.preferred_conditions).
 * Every field is optional; the suitability engine only evaluates what is present
 * and never invents data.
 */
export interface PreferredConditions {
  tide_state?: string; // "rising" | "falling" | "high" | "low"
  wind_max_kmh?: number;
  wave_max_m?: number;
  time_of_day?: string[]; // e.g. ["dawn", "dusk"]
}

/**
 * Catalog domain model for a species (regional catalog, not spot-scoped).
 * Normalized from a `species` table row.
 */
export interface Species {
  id: string;
  commonName: string;
  localName: string | null;
  scientificName: string | null;
  imageUrl: string | null;
  description: string | null;
  preferredConditions: PreferredConditions | null;
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

/**
 * Returns whether a species is in season for the given month (1-12). Empty or
 * missing season data is treated as "not specified" -> false.
 */
export function isInSeason(
  months: number[],
  month: number = new Date().getMonth() + 1
): boolean {
  return months.some((m) => m === month);
}

/** Builds a short human summary of preferred conditions, or null when empty. */
export function summarizePreferredConditions(
  pc: PreferredConditions | null
): string | null {
  if (!pc) return null;
  const parts: string[] = [];
  if (typeof pc.tide_state === 'string' && pc.tide_state.length > 0) {
    parts.push(`${pc.tide_state} tide`);
  }
  if (typeof pc.wind_max_kmh === 'number') {
    parts.push(`wind ≤ ${pc.wind_max_kmh} km/h`);
  }
  if (typeof pc.wave_max_m === 'number') {
    parts.push(`waves ≤ ${pc.wave_max_m} m`);
  }
  if (Array.isArray(pc.time_of_day) && pc.time_of_day.length > 0) {
    parts.push(pc.time_of_day.join('/'));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}