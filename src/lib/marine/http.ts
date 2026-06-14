import 'server-only';

/**
 * Minimal server-side JSON fetch helper with a timeout. Throws on non-2xx so
 * callers can surface a graceful per-section error. Marine endpoints are read
 * fresh by our own cache layer, so we disable Next's fetch cache here.
 */
export async function fetchJson<T>(
  url: string,
  timeoutMs = 10_000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}) for ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Builds a URL with encoded query params, skipping null/undefined values. */
export function buildUrl(
  base: string,
  params: Record<string, string | number | undefined | null>
): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** Reads the value at a numeric index from an array-or-undefined safely. */
export function at<T>(arr: T[] | undefined | null, index: number): T | null {
  if (!arr || index < 0 || index >= arr.length) return null;
  return arr[index] ?? null;
}
