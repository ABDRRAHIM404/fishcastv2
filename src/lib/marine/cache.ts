import 'server-only';
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
  provider: string;
  fetched_at: string;
  expires_at: string;
};

/**
 * Reads a fresh cache entry for (spotId, kind) using the trusted server-only
 * service client. Returns null when unavailable, missing, or expired.
 */
export async function readCache<T>(
  spotId: string,
  kind: MarineKind,
  expectedProvider?: string
): Promise<CacheEntry<T> | null> {
  const service = createServiceClient();
  if (!service) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service as any)
    .from('marine_cache')
    .select('normalized, provider, fetched_at, expires_at')
    .eq('spot_id', spotId)
    .eq('kind', kind)
    .maybeSingle() as { data: MarineCacheRow | null; error: unknown };

  if (error || !data) return null;
  if (expectedProvider && data.provider !== expectedProvider) return null;
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
  normalized: T
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
  load: () => Promise<{ normalized: T }>
): Promise<CacheEntry<T>> {
  const cached = await readCache<T>(spotId, kind, provider);
  if (cached) return cached;

  const { normalized } = await load();
  const cachedAt = await writeCache(spotId, kind, provider, normalized);
  return { data: normalized, cachedAt };
}
