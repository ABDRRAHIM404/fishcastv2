import { NextResponse } from 'next/server';
import { dateInForecastRange } from '@/lib/forecast-ui/query';
import { getProgressiveForecastContext } from '@/lib/forecast-ui/service';
import type { ForecastStreamEvent } from '@/lib/forecast-ui/types';
import { getActiveSpots, getSpotBySlug } from '@/lib/spots/queries';
import { todayProductDate } from '@/lib/time/casablanca';

export const dynamic = 'force-dynamic';

/**
 * Streams a compact normalized today-first context followed by the completed
 * seven-day context. Raw provider payloads never leave the server.
 */
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

  let spot: Awaited<ReturnType<typeof getSpotBySlug>>;
  try {
    spot = await getSpotBySlug(spotValue);
    if (!spot) {
      spot =
        (await getActiveSpots()).find((item) => item.id === spotValue) ?? null;
    }
  } catch {
    return NextResponse.json(
      { error: 'Forecast is temporarily unavailable.' },
      { status: 502 }
    );
  }
  if (!spot) {
    return NextResponse.json({ error: 'Spot not found' }, { status: 404 });
  }

  const startedAt = performance.now();
  const encoder = new TextEncoder();
  let emittedToday = false;
  let streamClosed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ForecastStreamEvent) => {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          streamClosed = true;
        }
      };

      try {
        const result = await getProgressiveForecastContext(
          spot,
          date,
          async (todayData) => {
            emittedToday = true;
            emit({
              type: 'today',
              data: todayData,
              elapsedMs: Math.round(performance.now() - startedAt),
            });
            // Give the runtime an opportunity to flush today's record before
            // synchronous evaluation of the remaining five-minute timelines.
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
          }
        );
        emit({
          type: 'week',
          data: result.data,
          elapsedMs: Math.round(performance.now() - startedAt),
          cacheStatus: result.cacheStatus,
        });
      } catch {
        emit({
          type: 'error',
          stage: emittedToday ? 'week' : 'today',
          code: 'forecast_unavailable',
        });
      } finally {
        if (!streamClosed) {
          try {
            controller.close();
          } catch {
            // The browser may have cancelled while the week was completing.
          }
          streamClosed = true;
        }
      }
    },
    cancel() {
      // Forecast computation may finish and populate the shared cache, but no
      // further chunks should be written to a cancelled response stream.
      streamClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-store, no-transform',
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
