import 'server-only';

/**
 * Small per-process same-URL request coalescer. It prevents sibling normalized
 * consumers and concurrent page requests from duplicating an upstream call;
 * durable freshness remains the responsibility of the private Supabase cache.
 */
export function createRequestReuse<T>(reuseMs = 60_000) {
  const inFlight = new Map<string, Promise<T>>();
  const recent = new Map<string, { data: T; expiresAt: number }>();

  return async function reuseRequest(
    key: string,
    load: () => Promise<T>
  ): Promise<T> {
    const cached = recent.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    if (cached) recent.delete(key);

    const existing = inFlight.get(key);
    if (existing) return existing;

    const request = load();
    inFlight.set(key, request);
    try {
      const data = await request;
      recent.set(key, { data, expiresAt: Date.now() + reuseMs });
      return data;
    } finally {
      if (inFlight.get(key) === request) inFlight.delete(key);
    }
  };
}
