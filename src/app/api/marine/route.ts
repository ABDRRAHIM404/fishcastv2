import { NextResponse } from 'next/server';
import { getSpotBySlug } from '@/lib/spots/queries';
import { getActiveSpots } from '@/lib/spots/queries';
import { getMarineConditionsForSpot } from '@/lib/marine/service';

// Always run on the server, never statically cached (our cache layer handles
// freshness via marine_cache + TTLs).
export const dynamic = 'force-dynamic';

/**
 * GET /api/marine?spotId=<id-or-slug>
 * Returns the stable normalized MarineConditions domain model for a spot.
 * Never returns raw provider payloads.
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

  // Resolve by slug first (public identifier used in URLs), then by id.
  let spot = await getSpotBySlug(spotId);
  if (!spot) {
    const all = await getActiveSpots();
    spot = all.find((s) => s.id === spotId) ?? null;
  }
  if (!spot) {
    return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
  }

  try {
    const conditions = await getMarineConditionsForSpot({
      id: spot.id,
      latitude: spot.latitude,
      longitude: spot.longitude,
    });
    return NextResponse.json(conditions);
  } catch {
    return NextResponse.json(
      { error: 'Failed to load marine conditions' },
      { status: 502 }
    );
  }
}
