import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { TTL_MS } from '@/lib/marine/constants';
import type { MarineKind } from '@/types/marine';

/** A normalized cache entry plus the time it was written. */
export interface CacheEntry<T> {
  data: T;
  cachedAt: string;
}

type MarineCacheRow = {
  normalized: unknown;
  fetched_at: string;
  expires_at: string;
};

/**
 * Reads a fresh cache entry for (spotId, kind) using the public anon client
 * (RLS allows SELECT). Returns null when missing or expired.
 */
export async function readCache<T>(
  spotId: string,
  kind: MarineKind
): Promise<CacheEntry<T> | null> {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('marine_cache')
    .select('normalized, fetched_at, expires_at')
    .eq('spot_id', spotId)
    .eq('kind', kind)
    .maybeSingle() as { data: MarineCacheRow | null; error: unknown };

  if (error || !data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;

  return { data: data.normalized as T, cachedAt: data.fetched_at };
}

/**
 * Upserts a normalized entry into marine_cache via the service-role client
 * (bypasses RLS). No-op when the service key is not configured, so data is
 * still served fresh without a server crash.
 */
export async function writeCache<T>(
  spotId: string,
  kind: MarineKind,
  provider: string,
  normalized: T,
  raw?: unknown
): Promise<string> {
  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt.getTime() + TTL_MS[kind]);

  const service = createServiceClient();
  if (service) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (service as any).from('marine_cache').upsert(
      {
        spot_id: spotId,
        kind,
        provider,
        normalized: normalized as never,
        raw: (raw ?? null) as never,
        fetched_at: fetchedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'spot_id,kind' }
    );
  }

  return fetchedAt.toISOString();
}

/**
 * Cache-aware resolver: returns a fresh cached value when present, otherwise
 * fetches via `load`, caches it, and returns it.
 */
export async function withCache<T>(
  spotId: string,
  kind: MarineKind,
  provider: string,
  load: () => Promise<{ normalized: T; raw?: unknown }>
): Promise<CacheEntry<T>> {
  const cached = await readCache<T>(spotId, kind);
  if (cached) return cached;

  const { normalized, raw } = await load();
  const cachedAt = await writeCache(spotId, kind, provider, normalized, raw);
  return { data: normalized, cachedAt };
}