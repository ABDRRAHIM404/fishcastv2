import 'server-only';
import { buildUrl, fetchJson } from '@/lib/marine/http';
import { WORLDTIDES_URL } from '@/lib/marine/constants';

/** Raw WorldTides v3 payload (subset). Internal only. */
export interface WorldTidesResponse {
  status?: number;
  error?: string;
  heights?: { dt?: number; date?: string; height?: number }[];
  extremes?: { dt?: number; date?: string; height?: number; type?: string }[];
}

/** Thrown when the WorldTides API key is not configured. */
export class MissingTideKeyError extends Error {
  constructor() {
    super('WORLDTIDES_API_KEY is not configured');
    this.name = 'MissingTideKeyError';
  }
}

/**
 * Fetches tide heights + extremes from WorldTides. Reads the key server-side
 * from WORLDTIDES_API_KEY; throws MissingTideKeyError when absent so the tide
 * section degrades gracefully without affecting other providers.
 */
export async function fetchWorldTides(
  lat: number,
  lng: number
): Promise<WorldTidesResponse> {
  const key = process.env.WORLDTIDES_API_KEY;
  if (!key) throw new MissingTideKeyError();

  const url = buildUrl(WORLDTIDES_URL, {
    heights: '',
    extremes: '',
    lat,
    lon: lng,
    key,
  });
  const data = await fetchJson<WorldTidesResponse>(url);
  if (data.error) {
    throw new Error(`WorldTides error: ${data.error}`);
  }
  return data;
}
