import 'server-only';
import type {
  TideConditions,
  TideExtreme,
  TideState,
} from '@/types/marine';
import type { WorldTidesResponse } from '@/lib/tides/client';
import { at } from '@/lib/marine/http';

function toState(type: string | undefined): TideState | null {
  if (type === 'High') return 'high';
  if (type === 'Low') return 'low';
  return null;
}

/**
 * Maps a raw WorldTides payload to TideConditions: current interpolated height,
 * rising/falling trend, and upcoming high/low extremes.
 */
export function normalizeTides(raw: WorldTidesResponse): TideConditions {
  const now = Date.now();

  const extremes: TideExtreme[] = (raw.extremes ?? [])
    .map((e): TideExtreme | null => {
      const state = toState(e.type);
      if (state === null || typeof e.height !== 'number') return null;
      const time = e.date ?? (e.dt ? new Date(e.dt * 1000).toISOString() : null);
      if (!time) return null;
      return { time, state, heightM: e.height };
    })
    .filter((e): e is TideExtreme => e !== null)
    .filter((e) => new Date(e.time).getTime() >= now)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // Current height: the heights sample closest to now.
  const heights = (raw.heights ?? [])
    .map((h) => ({
      ms: h.date ? new Date(h.date).getTime() : (h.dt ?? 0) * 1000,
      height: typeof h.height === 'number' ? h.height : null,
    }))
    .filter((h) => h.height !== null && h.ms > 0)
    .sort((a, b) => a.ms - b.ms);

  let heightM: number | null = null;
  if (heights.length > 0) {
    let closest = heights[0]!;
    for (const h of heights) {
      if (Math.abs(h.ms - now) < Math.abs(closest.ms - now)) closest = h;
    }
    heightM = closest.height;
  }

  // Trend: derived from the next upcoming extreme (rising toward a high).
  const nextExtreme = at(extremes, 0);
  const trend: TideConditions['trend'] =
    nextExtreme === null
      ? null
      : nextExtreme.state === 'high'
        ? 'rising'
        : 'falling';

  return {
    observedAt: new Date(now).toISOString(),
    heightM,
    trend,
    extremes,
  };
}
