import type {
  DailyFishingWindows,
  FishingWindow,
  TimelinePoint,
  WindowLabel,
} from '@/lib/timeline/types';
import type { ConfidenceLabel } from '@/types/forecast';
import { productDateKey } from '@/lib/time/casablanca';

const STEP_MINUTES = 5;
const MIN_WINDOW_MINUTES = 40;
const MAX_WINDOW_POINTS = 48;
const MAX_DAILY_WINDOWS = 4;

export function labelForScore(score: number): WindowLabel {
  if (score >= 8) return 'Excellent';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Moderate';
  return 'Poor';
}

function confidenceRank(confidence: ConfidenceLabel): number {
  if (confidence === 'high') return 3;
  if (confidence === 'medium') return 2;
  return 1;
}

function weakestConfidence(points: TimelinePoint[]): ConfidenceLabel {
  return points.reduce<ConfidenceLabel>(
    (weakest, point) =>
      confidenceRank(point.integrity.confidence) <
      confidenceRank(weakest)
        ? point.integrity.confidence
        : weakest,
    'high'
  );
}

function isEligible(point: TimelinePoint): boolean {
  return (
    labelForScore(point.score) !== 'Poor' &&
    point.integrity.confidence !== 'low' &&
    (point.safety.status === 'Safe' ||
      point.safety.status === 'Caution')
  );
}

function sameBand(first: TimelinePoint, second: TimelinePoint): boolean {
  return (
    labelForScore(first.score) === labelForScore(second.score) &&
    first.safety.status === second.safety.status
  );
}

function buildWindow(points: TimelinePoint[]): FishingWindow {
  let peak = points[0]!;
  for (const point of points) {
    if (point.score > peak.score) peak = point;
  }
  const averageScore =
    points.reduce((sum, point) => sum + point.score, 0) / points.length;
  const completenessPercentage = Math.round(
    points.reduce(
      (sum, point) => sum + point.integrity.completenessPercentage,
      0
    ) / points.length
  );
  const confidence = weakestConfidence(points);
  const safetyStatus = points.some(
    (point) => point.safety.status === 'Caution'
  )
    ? 'Caution'
    : 'Safe';
  const endMs =
    new Date(points[points.length - 1]!.time).getTime() +
    STEP_MINUTES * 60_000;
  const durationMinutes = Math.max(
    STEP_MINUTES,
    (endMs - new Date(points[0]!.time).getTime()) / 60_000
  );
  const safetyBonus = safetyStatus === 'Safe' ? 12 : 0;
  const confidenceBonus =
    confidence === 'high' ? 8 : confidence === 'medium' ? 4 : 0;
  const durationBonus = Math.min(5, durationMinutes / 48);
  const rankScore = Math.round(
    (averageScore * 10 +
      safetyBonus +
      confidenceBonus +
      durationBonus) *
      10
  ) / 10;

  return {
    start: points[0]!.time,
    end: new Date(endMs).toISOString(),
    peakTime: peak.time,
    peakScore: peak.score,
    label: labelForScore(peak.score) as FishingWindow['label'],
    safetyStatus,
    confidence,
    completenessPercentage,
    durationMinutes,
    rankScore,
  };
}

function candidates(points: TimelinePoint[]): FishingWindow[] {
  const groups: TimelinePoint[][] = [];
  let current: TimelinePoint[] = [];

  const flush = () => {
    if (current.length > 0) groups.push(current);
    current = [];
  };

  for (const point of points) {
    if (!isEligible(point)) {
      flush();
      continue;
    }
    const previous = current[current.length - 1];
    if (
      previous &&
      (!sameBand(previous, point) ||
        new Date(point.time).getTime() -
          new Date(previous.time).getTime() >
          STEP_MINUTES * 60_000)
    ) {
      flush();
    }
    current.push(point);
    if (current.length === MAX_WINDOW_POINTS) flush();
  }
  flush();

  return groups
    .map(buildWindow)
    .filter((window) => window.durationMinutes >= MIN_WINDOW_MINUTES);
}

function rankWindows(windows: FishingWindow[]): FishingWindow[] {
  return [...windows]
    .sort((first, second) => {
      if (second.rankScore !== first.rankScore) {
        return second.rankScore - first.rankScore;
      }
      if (second.peakScore !== first.peakScore) {
        return second.peakScore - first.peakScore;
      }
      if (second.durationMinutes !== first.durationMinutes) {
        return second.durationMinutes - first.durationMinutes;
      }
      return first.start.localeCompare(second.start);
    })
    .slice(0, MAX_DAILY_WINDOWS);
}

/**
 * Ranked best-first. Poor, Dangerous, Unknown, and low-confidence periods
 * never qualify as recommendations.
 */
export function detectWindows(points: TimelinePoint[]): FishingWindow[] {
  return rankWindows(candidates(points));
}

export function detectDailyWindows(
  points: TimelinePoint[]
): DailyFishingWindows[] {
  const groups = new Map<string, TimelinePoint[]>();
  for (const point of points) {
    const date = productDateKey(point.time);
    const existing = groups.get(date);
    if (existing) existing.push(point);
    else groups.set(date, [point]);
  }

  return [...groups.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, dailyPoints]) => {
      const windows = detectWindows(dailyPoints);
      return {
        date,
        windows,
        recommendedWindow: windows[0] ?? null,
      };
    });
}
