import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { mapSpotRow, type RawSpotRow } from '@/lib/spots/mapper';
import type { Spot } from '@/types/spot';

/**
 * Server-side spot repository. Reads are public (RLS allows SELECT on spots),
 * so the anon server client is sufficient. Marine conditions and scores are
 * out of scope for Phase 3.
 */

/** Returns all active spots, ordered by name. */
export async function getActiveSpots(): Promise<Spot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load spots: ${error.message}`);
  }

  return ((data ?? []) as RawSpotRow[])
    .map(mapSpotRow)
    .filter((spot): spot is Spot => spot !== null);
}

/** Returns a single active spot by its public slug, or null if not found. */
export async function getSpotBySlug(slug: string): Promise<Spot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load spot "${slug}": ${error.message}`);
  }

  return data ? mapSpotRow(data as RawSpotRow) : null;
}
