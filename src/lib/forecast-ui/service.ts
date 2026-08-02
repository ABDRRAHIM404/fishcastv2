import 'server-only';
import {
  aggregateTimeline,
  summarizeTimeline,
} from '@/lib/forecast-ui/aggregate';
import { sortComparisonItems } from '@/lib/forecast-ui/comparison';
import { bestSpeciesForPeriod } from '@/lib/forecast-ui/species';
import { toForecastSpotIdentity } from '@/lib/forecast-ui/spots';
import type {
  ForecastComparisonItem,
  ForecastComparisonResponse,
  ForecastContextResponse,
  ForecastHumanInterpretation,
  ForecastInterval,
  ForecastPeriod,
} from '@/lib/forecast-ui/types';
import { getSpotSpecies, getSpeciesCatalog } from '@/lib/species/queries';
import { getActiveSpots } from '@/lib/spots/queries';
import {
  addProductDays,
  productDateTimeToEpochMs,
  todayProductDate,
} from '@/lib/time/casablanca';
import { getTimelinesForSpot } from '@/lib/timeline/service';
import type { Timeline } from '@/lib/timeline/types';
import type { Spot } from '@/types/spot';

const INTERVALS: readonly ForecastInterval[] = ['30m', '1h', '3h', '6h'];

function spotInput(spot: Spot) {
  return {
    id: spot.id,
    slug: spot.slug,
    latitude: spot.latitude,
    longitude: spot.longitude,
    spotType: spot.spotType,
    difficultyLevel: spot.difficultyLevel,
    difficultyFactors: spot.difficultyFactors,
  };
}

function maxIso(values: Array<string | null>): string | null {
  return values
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1) ?? null;
}

function minutesSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
}

function enrichSpecies(
  periods: ForecastPeriod[],
  linked: Awaited<ReturnType<typeof getSpotSpecies>>,
  catalog: Awaited<ReturnType<typeof getSpeciesCatalog>>
): ForecastPeriod[] {
  return periods.map((period) => ({
    ...period,
    bestSpecies: bestSpeciesForPeriod(period, linked, catalog),
  }));
}

function interpretationFor(
  timeline: Timeline,
  periods: ForecastPeriod[]
): ForecastHumanInterpretation {
  const recommended = timeline.recommendedWindow;
  const best = recommended
    ? periods.find(
        (period) =>
          new Date(period.start).getTime() <=
            new Date(recommended.peakTime).getTime() &&
          new Date(period.end).getTime() >
            new Date(recommended.peakTime).getTime()
      ) ?? periods[0]
    : periods.reduce<ForecastPeriod | undefined>(
        (current, period) =>
          !current || period.fishing.score > current.fishing.score
            ? period
            : current,
        undefined
      );
  const missing = best?.confidence.missingInputs ?? [];
  return {
    bestPeriod: recommended
      ? `${recommended.start} to ${recommended.end}`
      : 'No recommended fishing window for this day.',
    qualityReason: best
      ? `${best.fishing.label} fishing quality (${best.fishing.score}/100), with ${
          best.wind.speedKmh === null
            ? 'wind unavailable'
            : `${Math.round(best.wind.speedKmh)} km/h wind`
        } and ${
          best.waves.heightM === null
            ? 'waves unavailable'
            : `${best.waves.heightM.toFixed(1)} m waves`
        }.`
      : 'Fishing quality is unavailable.',
    safetyConcern:
      best?.safety.primaryWarning ??
      (best?.safety.status === 'Safe'
        ? 'No active modelled safety warning in the best period.'
        : 'Safety cannot be fully assessed.'),
    technique:
      'No technique recommendation is available because FishCast has no verified technique dataset yet.',
    missingData:
      missing.length > 0
        ? `Missing inputs: ${missing.join(', ')}.`
        : 'No forecast inputs are missing for the best period.',
    confidenceLimitation: best
      ? `${best.confidence.label} confidence (${best.confidence.completenessPercentage}% complete). Forecast confidence describes data completeness and freshness, not certainty.`
      : 'Forecast confidence is unavailable.',
    orientationLimitation:
      'Onshore, offshore and cross-shore labels use an unverified editorial shoreline orientation.',
  };
}

export async function getForecastContext(
  spot: Spot,
  selectedDate: string,
  now: Date = new Date()
): Promise<ForecastContextResponse> {
  const startDate = todayProductDate(now);
  const dates = Array.from({ length: 7 }, (_, index) =>
    addProductDays(startDate, index)
  );
  const [timelines, linkedSpecies, catalog] = await Promise.all([
    getTimelinesForSpot(spotInput(spot), dates),
    getSpotSpecies(spot.id).catch(() => []),
    getSpeciesCatalog().catch(() => []),
  ]);
  const periods = Object.fromEntries(
    INTERVALS.map((interval) => [
      interval,
      enrichSpecies(
        timelines.flatMap((timeline) =>
          aggregateTimeline(timeline, interval, now)
        ),
        linkedSpecies,
        catalog
      ),
    ])
  ) as Record<ForecastInterval, ForecastPeriod[]>;
  const days = timelines.map((timeline) => {
    const summary = summarizeTimeline(timeline);
    const dayPeriods = periods['1h'].filter(
      (period) => period.date === timeline.date
    );
    const representative = timeline.recommendedWindow
      ? dayPeriods.find(
          (period) =>
            period.start <= timeline.recommendedWindow!.peakTime &&
            period.end > timeline.recommendedWindow!.peakTime
        )
      : dayPeriods[0];
    return { ...summary, bestSpecies: representative?.bestSpecies ?? null };
  });
  const selectedTimeline =
    timelines.find((timeline) => timeline.date === selectedDate) ?? timelines[0]!;
  const selectedPeriods = periods['1h'].filter(
    (period) => period.date === selectedTimeline.date
  );
  const interpretations = Object.fromEntries(
    timelines.map((timeline) => [
      timeline.date,
      interpretationFor(
        timeline,
        periods['1h'].filter((period) => period.date === timeline.date)
      ),
    ])
  );
  const forecastFetchedAt = maxIso(
    timelines.map((timeline) => timeline.sourceTimestamps.forecastFetchedAt)
  );
  const marineFetchedAt = maxIso(
    timelines.map((timeline) => timeline.sourceTimestamps.marineFetchedAt)
  );
  const oldestTimestamp = [forecastFetchedAt, marineFetchedAt]
    .filter((value): value is string => value !== null)
    .sort()[0] ?? null;

  return {
    schemaVersion: 1,
    spot: toForecastSpotIdentity(spot),
    timeZone: 'Africa/Casablanca',
    range: { startDate, endDate: dates[6]! },
    selectedDate: selectedTimeline.date,
    generatedAt: now.toISOString(),
    sourceTimestamps: { forecastFetchedAt, marineFetchedAt },
    freshnessMinutes: minutesSince(oldestTimestamp, now),
    days,
    periods,
    interpretation: interpretationFor(selectedTimeline, selectedPeriods),
    interpretations,
    orientationVerified: false,
  };
}

function nearestPeriod(
  periods: ForecastPeriod[],
  targetMs: number
): ForecastPeriod | null {
  return periods.find(
    (period) =>
      new Date(period.start).getTime() <= targetMs &&
      new Date(period.end).getTime() > targetMs
  ) ?? null;
}

export async function getForecastComparison(
  date: string,
  time: string,
  now: Date = new Date()
): Promise<ForecastComparisonResponse> {
  const [hour, minute] = time.split(':').map(Number);
  const targetMs = productDateTimeToEpochMs(date, hour, minute);
  const spots = await getActiveSpots();
  const results = await Promise.allSettled(
    spots.map(async (spot): Promise<ForecastComparisonItem> => {
      const [timeline] = await getTimelinesForSpot(spotInput(spot), [date]);
      if (!timeline) throw new Error('Timeline unavailable');
      const period = nearestPeriod(aggregateTimeline(timeline, '1h', now), targetMs);
      if (!period) throw new Error('Selected period unavailable');
      return {
        spot: toForecastSpotIdentity(spot),
        timestamp: new Date(targetMs).toISOString(),
        fishing: period.fishing,
        safety: period.safety,
        waveHeightM: period.waves.heightM,
        wavePeriodS: period.waves.periodS,
        windSpeedKmh: period.wind.speedKmh,
        windRelationship: period.wind.relationship,
        confidence: period.confidence,
        bestWindow: timeline.recommendedWindow,
      };
    })
  );
  const items: ForecastComparisonItem[] = [];
  const failures: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') items.push(result.value);
    else failures.push(toForecastSpotIdentity(spots[index]!).displayName);
  });
  return {
    schemaVersion: 1,
    date,
    timestamp: new Date(targetMs).toISOString(),
    items: sortComparisonItems(items),
    failures,
  };
}
