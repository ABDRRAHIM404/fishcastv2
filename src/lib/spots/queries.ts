import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { mapSpotRow, type RawSpotRow } from '@/lib/spots/mapper';
import type { Spot } from '@/types/spot';

/**
 * Server-side spot repository. Reads are public (RLS allows SELECT on spots),
 * so the anon server client is sufficient. Marine conditions and scores are
 * out of scope for Phase 3.
 *
 * Filters use string column names that may not exist in the generated types
 * until they are regenerated after the Phase 3 migration. Rows are validated
 * and normalized by `mapSpotRow`, so we read them as `RawSpotRow`.
 */

/** Returns all active spots, ordered by name. */
export async function getActiveSpots(): Promise<Spot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load spots: ${error.message}`);
  }

  return ((data ?? []) as RawSpotRow[])
    .map(mapSpotRow)
    .filter((spot): spot is Spot => spot !== null)
    .filter((spot) => spot.active);
}

/** Returns a single active spot by its public slug, or null if not found. */
export async function getSpotBySlug(slug: string): Promise<Spot | null> {
  const spots = await getActiveSpots();
  return spots.find((spot) => spot.slug === slug) ?? null;
}
