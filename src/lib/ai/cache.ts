import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { AI_TTL_MS, PROMPT_VERSION } from '@/lib/ai/constants';
import { parseRecommendation } from '@/lib/ai/schema';
import type { Json } from '@/lib/supabase/types';
import type {
  AiRecommendation,
  AiRecommendationResponse,
  AiSource,
} from '@/lib/ai/types';

/**
 * ai_recommendations cache. Mirrors the marine_cache / marine_timeline_cache
 * pattern: anon client reads (RLS public read), service-role client writes
 * (bypasses RLS). The `never[]` inference workaround + eslint-disable casts
 * are intentional and consistent with those modules (table added after the
 * generated types were last produced).
 */

interface AiRecommendationRow {
  recommendation: Json;
  source: string;
  payload_hash: string;
  generated_at: string;
  expires_at: string;
}

export async function readAiCache(
  spotId: string,
  date: string,
  payloadHash: string
): Promise<AiRecommendationResponse | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('ai_recommendations')
    .select('recommendation, source, payload_hash, generated_at, expires_at')
    .eq('spot_id', spotId)
    .eq('date', date)
    .eq('prompt_version', PROMPT_VERSION)
    .maybeSingle();

  const row = data as AiRecommendationRow | null;
  if (error || !row) return null;
  if (row.payload_hash !== payloadHash) return null; // inputs changed
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;

  const recommendation = parseRecommendation(row.recommendation);
  if (!recommendation) return null;

  return {
    recommendation,
    source: row.source === 'gemini' ? 'gemini' : 'fallback',
    generatedAt: row.generated_at,
  };
}

export async function writeAiCache(
  spotId: string,
  date: string,
  payloadHash: string,
  recommendation: AiRecommendation,
  source: AiSource
): Promise<string> {
  const generatedAt = new Date();
  const expiresAt = new Date(generatedAt.getTime() + AI_TTL_MS);

  const service = createServiceClient();
  if (service) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any).from('ai_recommendations').upsert(
      {
        spot_id: spotId,
        date,
        prompt_version: PROMPT_VERSION,
        payload_hash: payloadHash,
        recommendation: recommendation as unknown as Json,
        source,
        generated_at: generatedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'spot_id,date,prompt_version' }
    );
  }

  return generatedAt.toISOString();
}
