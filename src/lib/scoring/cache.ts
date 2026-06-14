import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { SCORE_TTL_MS } from '@/lib/scoring/constants';
import type { ScoreResult } from '@/lib/scoring/types';
import type { Json } from '@/lib/supabase/types';

type ScoreCacheRow = {
  score: number;
  factors: Json;
  computed_at: string;
};

/** Returns a fresh cached ScoreResult for a spot, or null when missing/expired. */
export async function readScoreCache(
  spotId: string
): Promise<ScoreResult | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('score_cache')
    .select('score, factors, computed_at')
    .eq('spot_id', spotId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: ScoreCacheRow | null; error: unknown };

  if (error || !data) return null;
  if (Date.now() - new Date(data.computed_at).getTime() > SCORE_TTL_MS) {
    return null;
  }

  const cached = data.factors as unknown as ScoreResult | null;
  if (!cached || typeof cached.percentage !== 'number') return null;
  return cached;
}

/**
 * Persists a ScoreResult: delete-then-insert so only the current score is kept
 * (no history). No-op when the service role key is not configured.
 */
export async function writeScoreCache(
  spotId: string,
  result: ScoreResult
): Promise<void> {
  const service = createServiceClient();
  if (!service) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any).from('score_cache').delete().eq('spot_id', spotId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (service as any).from('score_cache').insert({
    spot_id: spotId,
    score: result.overallScore,
    factors: result as unknown as Json,
    computed_at: result.computedAt,
  });
}