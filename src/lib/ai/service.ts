import 'server-only';
import { getMarineConditionsForSpot } from '@/lib/marine/service';
import { getScoreForSpot } from '@/lib/scoring/service';
import { getTimelineForSpot, todayLocalDate } from '@/lib/timeline/service';
import { getSpotSpecies, getSpeciesCatalog } from '@/lib/species/queries';
import { SPOT_TYPE_LABELS, DIFFICULTY_LABELS } from '@/types/spot';
import type { SpotType, DifficultyLevel } from '@/types/spot';
import type { Timeline } from '@/lib/timeline/types';
import { buildAiContext, hashAiContext } from '@/lib/ai/context';
import { buildFallbackRecommendation } from '@/lib/ai/fallback';
import { requestGeminiRecommendation } from '@/lib/ai/client';
import { isRecommendationGrounded } from '@/lib/ai/guard';
import { readAiCache, writeAiCache } from '@/lib/ai/cache';
import { isAiEnabled } from '@/lib/ai/constants';
import type { AiRecommendationResponse } from '@/lib/ai/types';

/** Spot fields the AI service needs (no free-text content). */
export interface AiServiceSpotInput {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  spotType: SpotType;
  difficultyLevel: DifficultyLevel;
}

/**
 * Orchestrates the AI recommendation for a spot:
 *  1. Assemble deterministic context from existing services.
 *  2. Cache lookup keyed by (spot, date, prompt version, payload hash).
 *  3. On miss, call Gemini; validate (Zod in client + grounding guard);
 *     fall back deterministically on any failure.
 *  4. Persist and return. Never throws for model failures.
 */
export async function getAiRecommendationForSpot(
  spot: AiServiceSpotInput
): Promise<AiRecommendationResponse> {
  const localDate = todayLocalDate();

  // Gather deterministic inputs. Timeline is resilient to failure (-> null).
  const [marine, score, timelineResult, species, catalog] =
    await Promise.all([
      getMarineConditionsForSpot({
        id: spot.id,
        latitude: spot.latitude,
        longitude: spot.longitude,
      }),
      getScoreForSpot({
        id: spot.id,
        latitude: spot.latitude,
        longitude: spot.longitude,
      }),
      getTimelineForSpot(
        { id: spot.id, latitude: spot.latitude, longitude: spot.longitude },
        localDate
      ).then(
        (t): Timeline | null => t,
        () => null
      ),
      getSpotSpecies(spot.id),
      getSpeciesCatalog(),
    ]);

  const preferredById = new Map(
    catalog.map((c) => [c.id, c.preferredConditions])
  );

  const context = buildAiContext({
    spot: {
      name: spot.name,
      spotTypeLabel: SPOT_TYPE_LABELS[spot.spotType],
      difficultyLabel: DIFFICULTY_LABELS[spot.difficultyLevel],
    },
    marine,
    score,
    timeline: timelineResult,
    species,
    preferredById,
    localDate,
  });

  const payloadHash = hashAiContext(context);

  // Cache hit short-circuits any model call.
  const cached = await readAiCache(spot.id, localDate, payloadHash);
  if (cached) return cached;

  // Try Gemini when enabled; validate grounding; otherwise fall back.
  if (isAiEnabled()) {
    const fromModel = await requestGeminiRecommendation(context);
    if (fromModel && isRecommendationGrounded(fromModel, context)) {
      const generatedAt = await writeAiCache(
        spot.id,
        localDate,
        payloadHash,
        fromModel,
        'gemini'
      );
      return { recommendation: fromModel, source: 'gemini', generatedAt };
    }
  }

  const fallback = buildFallbackRecommendation(context);
  const generatedAt = await writeAiCache(
    spot.id,
    localDate,
    payloadHash,
    fallback,
    'fallback'
  );
  return { recommendation: fallback, source: 'fallback', generatedAt };
}
