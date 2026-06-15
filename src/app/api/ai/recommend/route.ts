import { NextResponse } from 'next/server';
import { getActiveSpots, getSpotBySlug } from '@/lib/spots/queries';
import { getAiRecommendationForSpot } from '@/lib/ai/service';

// Always run on the server; freshness handled by ai_recommendations + TTL.
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/recommend  { spotId: string }
 * Returns the structured, validated AI recommendation for a spot. The server
 * resolves the spot and builds the deterministic context itself — the client
 * never sends conditions/score, and the Gemini key never leaves the server.
 *
 * Model failures never surface as errors: the response is always 200 with
 * `source: 'gemini' | 'fallback'`.
 */
export async function POST(request: Request) {
  let spotId: string | null = null;
  try {
    const body = (await request.json()) as { spotId?: unknown };
    spotId = typeof body.spotId === 'string' ? body.spotId : null;
  } catch {
    spotId = null;
  }

  if (!spotId) {
    return NextResponse.json(
      { error: 'Missing required field: spotId' },
      { status: 400 }
    );
  }

  let spot = await getSpotBySlug(spotId);
  if (!spot) {
    const all = await getActiveSpots();
    spot = all.find((s) => s.id === spotId) ?? null;
  }
  if (!spot) {
    return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
  }

  try {
    const result = await getAiRecommendationForSpot({
      id: spot.id,
      name: spot.name,
      latitude: spot.latitude,
      longitude: spot.longitude,
      spotType: spot.spotType,
      difficultyLevel: spot.difficultyLevel,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate AI recommendation' },
      { status: 502 }
    );
  }
}
