import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SpotSpecies, Prevalence, Species } from '@/types/species';
import { mapSpeciesRow, type RawSpeciesRow } from '@/lib/species/mapper';

interface RawSpotSpeciesRow {
  season_months?: number[] | null;
  prevalence?: string | null;
  notes?: string | null;
  species: RawSpeciesRow | RawSpeciesRow[] | null;
}

const PREVALENCE_VALUES: readonly Prevalence[] = [
  'common',
  'occasional',
  'rare',
] as const;

function toPrevalence(value: unknown): Prevalence | null {
  return typeof value === 'string' &&
    PREVALENCE_VALUES.includes(value as Prevalence)
    ? (value as Prevalence)
    : null;
}

/** Returns the species recorded at a spot, ordered by prevalence then name. */
export async function getSpotSpecies(spotId: string): Promise<SpotSpecies[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('spot_species')
    .select(
      'season_months, prevalence, notes, species(id, common_name, local_name, scientific_name, image_url, description)'
    )
    .eq('spot_id', spotId);

  if (error) {
    throw new Error(`Failed to load spot species: ${error.message}`);
  }

  const rows = (data ?? []) as RawSpotSpeciesRow[];

  const mapped = rows
    .map((row): SpotSpecies | null => {
      const species = Array.isArray(row.species) ? row.species[0] : row.species;
      if (!species || !species.id || !species.common_name) return null;

      const seasonMonths = Array.isArray(row.season_months)
        ? row.season_months.filter(
            (m): m is number => typeof m === 'number'
          )
        : [];

      return {
        id: species.id,
        commonName: species.common_name,
        localName: species.local_name ?? null,
        scientificName: species.scientific_name ?? null,
        imageUrl: species.image_url ?? null,
        description: species.description ?? null,
        seasonMonths,
        prevalence: toPrevalence(row.prevalence),
        notes: row.notes ?? null,
      };
    })
    .filter((s): s is SpotSpecies => s !== null);

  const prevalenceRank: Record<Prevalence, number> = {
    common: 0,
    occasional: 1,
    rare: 2,
  };

  return mapped.sort((a, b) => {
    const ra = a.prevalence ? prevalenceRank[a.prevalence] : 3;
    const rb = b.prevalence ? prevalenceRank[b.prevalence] : 3;
    if (ra !== rb) return ra - rb;
    return a.commonName.localeCompare(b.commonName);
  });
}

/** Returns the full regional species catalog, ordered by common name. */
export async function getSpeciesCatalog(): Promise<Species[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('species')
    .select(
      'id, common_name, local_name, scientific_name, image_url, description, preferred_conditions'
    )
    .order('common_name', { ascending: true });

  if (error) {
    throw new Error(`Failed to load species catalog: ${error.message}`);
  }

  return ((data ?? []) as RawSpeciesRow[])
    .map(mapSpeciesRow)
    .filter((s): s is Species => s !== null);
}

/** Returns a single species by id, or null when not found. */
export async function getSpeciesById(id: string): Promise<Species | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('species')
    .select(
      'id, common_name, local_name, scientific_name, image_url, description, preferred_conditions'
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapSpeciesRow(data as RawSpeciesRow);
}