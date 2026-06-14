import 'server-only';
import { getMarineConditionsForSpot, type MarineSpotInput } from '@/lib/marine/service';
import { computeScore } from '@/lib/scoring/engine';
import { readScoreCache, writeScoreCache } from '@/lib/scoring/cache';
import type { ScoreResult } from '@/lib/scoring/types';

/**
 * Cache-aware score resolver for a spot. Returns a fresh cached score when
 * available; otherwise fetches normalized marine conditions, runs the
 * deterministic engine, caches the result, and returns it.
 */
export async function getScoreForSpot(
  spot: MarineSpotInput
): Promise<ScoreResult> {
  const cached = await readScoreCache(spot.id);
  if (cached) return cached;

  const marine = await getMarineConditionsForSpot(spot);
  const result = computeScore(marine);
  await writeScoreCache(spot.id, result);
  return result;
}
