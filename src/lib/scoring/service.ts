import 'server-only';
import { getMarineConditionsForSpot } from '@/lib/marine/service';
import {
  evaluateForecast,
  type CurrentForecastResult,
  type ForecastEvaluationSpot,
} from '@/lib/forecast/evaluate';
import { readScoreCache, writeScoreCache } from '@/lib/scoring/cache';

/**
 * Cache-aware score resolver for a spot. Returns a fresh cached score when
 * available; otherwise fetches normalized marine conditions, runs the
 * deterministic engine, caches the result, and returns it.
 */
export async function getScoreForSpot(
  spot: ForecastEvaluationSpot
): Promise<CurrentForecastResult> {
  const cached = await readScoreCache(spot.id);
  if (cached) return cached;

  const marine = await getMarineConditionsForSpot(spot);
  const result = evaluateForecast(marine, spot);
  await writeScoreCache(spot.id, result);
  return result;
}
