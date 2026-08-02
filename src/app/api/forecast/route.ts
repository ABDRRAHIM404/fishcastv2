import { NextResponse } from 'next/server';
import { dateInForecastRange } from '@/lib/forecast-ui/query';
import { getForecastContext } from '@/lib/forecast-ui/service';
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

  let spot = await getSpotBySlug(spotValue);
  if (!spot) {
    spot = (await getActiveSpots()).find((item) => item.id === spotValue) ?? null;
  }
  if (!spot) {
    return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
  }

  try {
    return NextResponse.json(await getForecastContext(spot, date));
  } catch {
    return NextResponse.json(
      { error: 'Forecast is temporarily unavailable.' },
      { status: 502 }
    );
  }
}

