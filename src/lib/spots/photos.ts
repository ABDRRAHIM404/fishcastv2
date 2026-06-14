import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Read-only photo model for a spot, normalized from a `spot_photos` row.
 */
export interface SpotPhoto {
  id: string;
  url: string;
  position: number;
}

interface RawSpotPhotoRow {
  id: string;
  url?: string | null;
  position?: number | null;
}

/**
 * Returns a spot's photos ordered by position. Public read (RLS allows SELECT
 * on spot_photos). Rows missing a url are skipped so a malformed row never
 * breaks the gallery.
 */
export async function getSpotPhotos(spotId: string): Promise<SpotPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('spot_photos')
    .select('id, url, position')
    .eq('spot_id', spotId)
    .order('position', { ascending: true });

  if (error) {
    throw new Error(`Failed to load spot photos: ${error.message}`);
  }

  return ((data ?? []) as RawSpotPhotoRow[])
    .filter((row): row is RawSpotPhotoRow & { url: string } =>
      typeof row.url === 'string' && row.url.length > 0
    )
    .map((row) => ({
      id: row.id,
      url: row.url,
      position: row.position ?? 0,
    }));
}
