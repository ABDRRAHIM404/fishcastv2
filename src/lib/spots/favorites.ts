import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Returns whether the current user has favorited a spot. Returns false for
 * logged-out users. Read-only helper; mutations live in lib/supabase/actions.ts
 * (addFavorite / removeFavorite) and are not duplicated here.
 */
export async function isSpotFavorited(spotId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('favorites')
    .select('spot_id')
    .eq('user_id', user.id)
    .eq('spot_id', spotId)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}
