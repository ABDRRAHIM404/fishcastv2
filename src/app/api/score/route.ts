import { NextResponse } from 'next/server';
import { getActiveSpots, getSpotBySlug } from '@/lib/spots/queries';
import { getScoreForSpot } from '@/lib/scoring/service';

// Always run on the server; freshness handled by score_cache + TTL.
export const dynamic = 'force-dynamic';

/**
 * GET /api/score?spotId=<id-or-slug>
 * Returns the deterministic ScoreResult for a spot, derived from the Phase 5
 * normalized marine model. Never returns raw provider payloads.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spotId = searchParams.get('spotId');

  if (!spotId) {
    return NextResponse.json(
      { error: 'Missing required query param: spotId' },
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
    const result = await getScoreForSpot({
      id: spot.id,
      latitude: spot.latitude,
      longitude: spot.longitude,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Failed to compute fishing score' },
      { status: 502 }
    );
  }
}
