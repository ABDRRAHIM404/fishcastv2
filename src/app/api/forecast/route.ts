import { NextResponse } from 'next/server';
import { dateInForecastRange } from '@/lib/forecast-ui/query';
import { getCachedForecastContext } from '@/lib/forecast-ui/service';
import { getActiveSpots, getSpotBySlug } from '@/lib/spots/queries';
import { todayProductDate } from '@/lib/time/casablanca';

export const dynamic = 'force-dynamic';

/** Compact normalized seven-day context; raw provider payloads never leave the server. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spotValue = searchParams.get('spot');
  const today = todayProductDate();
  const date = searchParams.get('date') ?? today;
  if (!spotValue) {
    return NextResponse.json(
      { error: 'Missing required query param: spot' },
      { status: 400 }
    );
  }
  if (!dateInForecastRange(date, today)) {
    return NextResponse.json(
      { error: 'Date must be within the current seven-day forecast.' },
      { status: 400 }
    );
  }

  const startedAt = performance.now();
  try {
    let spot = await getSpotBySlug(spotValue);
    if (!spot) {
      spot =
        (await getActiveSpots()).find((item) => item.id === spotValue) ?? null;
    }
    if (!spot) {
      return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
    }
    const result = await getCachedForecastContext(spot, date);
    return NextResponse.json(result.data, {
      headers: {
        'X-FishCast-Cache': result.cacheStatus,
        'Server-Timing': `forecast;dur=${(performance.now() - startedAt).toFixed(1)}`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Forecast is temporarily unavailable.' },
      { status: 502 }
    );
  }
}
