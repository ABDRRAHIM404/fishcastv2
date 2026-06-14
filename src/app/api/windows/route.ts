import { NextResponse } from 'next/server';
import { getActiveSpots, getSpotBySlug } from '@/lib/spots/queries';
import { getTimelineForSpot, todayLocalDate } from '@/lib/timeline/service';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/windows?spotId=<id-or-slug>&date=YYYY-MM-DD
 * Returns the ranked best fishing windows for the day (derived from the same
 * cached timeline). Date defaults to today in the spot's local time.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spotId = searchParams.get('spotId');
  const dateParam = searchParams.get('date');

  if (!spotId) {
    return NextResponse.json(
      { error: 'Missing required query param: spotId' },
      { status: 400 }
    );
  }
  if (dateParam && !DATE_RE.test(dateParam)) {
    return NextResponse.json(
      { error: 'Invalid date; expected YYYY-MM-DD' },
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

  const date = dateParam ?? todayLocalDate();
  try {
    const timeline = await getTimelineForSpot(
      { id: spot.id, latitude: spot.latitude, longitude: spot.longitude },
      date
    );
    return NextResponse.json({
      spotId: timeline.spotId,
      date: timeline.date,
      windows: timeline.windows,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to compute windows' },
      { status: 502 }
    );
  }
}
