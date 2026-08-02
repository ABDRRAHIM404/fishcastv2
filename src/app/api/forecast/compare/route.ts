import { NextResponse } from 'next/server';
import {
  dateInForecastRange,
  validClockTime,
} from '@/lib/forecast-ui/query';
import { getForecastComparison } from '@/lib/forecast-ui/service';
import { todayProductDate } from '@/lib/time/casablanca';

export const dynamic = 'force-dynamic';

/** Lazy comparison endpoint. It is not requested during the initial spot load. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const today = todayProductDate();
  if (!date || !dateInForecastRange(date, today)) {
    return NextResponse.json(
      { error: 'Date must be within the current seven-day forecast.' },
      { status: 400 }
    );
  }
  if (!validClockTime(time)) {
    return NextResponse.json(
      { error: 'Time must use the HH:mm format.' },
      { status: 400 }
    );
  }
  try {
    return NextResponse.json(await getForecastComparison(date, time));
  } catch {
    return NextResponse.json(
      { error: 'Spot comparison is temporarily unavailable.' },
      { status: 502 }
    );
  }
}

