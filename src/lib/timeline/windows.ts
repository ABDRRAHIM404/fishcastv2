/**
 * Pure best-fishing-window detection over an interpolated timeline. Groups
 * contiguous increments into the same quality band and emits ranked windows.
 */
import type {
  DailyFishingWindows,
  FishingWindow,
  TimelinePoint,
  WindowLabel,
} from '@/lib/timeline/types';

/** Maps a 0-10 score to a quality band label. */
export function labelForScore(score: number): WindowLabel {
  if (score >= 8) return 'Excellent';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Moderate';
  return 'Poor';
}

const RANK: Record<WindowLabel, number> = {
  Excellent: 0,
  Good: 1,
  Moderate: 2,
  Poor: 3,
};

const MAX_WINDOW_STEPS = 24; // 2 hours / 5 minutes

function buildWindowSegment(
  points: TimelinePoint[],
  from: number,
  to: number,
  label: WindowLabel
): FishingWindow[] {
  const windows: FishingWindow[] = [];

  if (label === 'Poor') {
    let peakIdx = from;
    for (let i = from; i <= to; i++) {
      if (points[i]!.score > points[peakIdx]!.score) peakIdx = i;
    }
    windows.push({
      start: points[from]!.time,
      end: points[to]!.time,
      peakTime: points[peakIdx]!.time,
      peakScore: points[peakIdx]!.score,
      label,
    });
    return windows;
  }

  let segmentStart = from;
  while (segmentStart <= to) {
    const segmentEnd = Math.min(to, segmentStart + MAX_WINDOW_STEPS - 1);
    let peakIdx = segmentStart;
    for (let i = segmentStart; i <= segmentEnd; i++) {
      if (points[i]!.score > points[peakIdx]!.score) peakIdx = i;
    }
    windows.push({
      start: points[segmentStart]!.time,
      end: points[segmentEnd]!.time,
      peakTime: points[peakIdx]!.time,
      peakScore: points[peakIdx]!.score,
      label,
    });
    segmentStart = segmentEnd + 1;
  }

  return windows;
}

/**
 * Detects contiguous windows of equal label across the timeline points and
 * returns them ranked best-first (then earliest). Each window carries its
 * start/end plus the peak score time within it. Windows are capped at 2 hours.
 */
export function detectWindows(points: TimelinePoint[]): FishingWindow[] {
  if (points.length === 0) return [];

  const windows: FishingWindow[] = [];
  let startIdx = 0;
  let currentLabel = labelForScore(points[0]!.score);

  for (let i = 1; i < points.length; i++) {
    const label = labelForScore(points[i]!.score);
    if (label !== currentLabel) {
      windows.push(...buildWindowSegment(points, startIdx, i - 1, currentLabel));
      startIdx = i;
      currentLabel = label;
    }
  }
  windows.push(...buildWindowSegment(points, startIdx, points.length - 1, currentLabel));

  return windows.sort((a, b) => {
    if (RANK[a.label] !== RANK[b.label]) return RANK[a.label] - RANK[b.label];
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
}

function localDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function detectDailyWindows(points: TimelinePoint[]): DailyFishingWindows[] {
  if (points.length === 0) return [];

  const groups = new Map<string, TimelinePoint[]>();
  for (const point of points) {
    const key = localDayKey(point.time);
    const group = groups.get(key);
    if (group) {
      group.push(point);
    } else {
      groups.set(key, [point]);
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dailyPoints]) => ({
      date,
      windows: detectWindows(dailyPoints),
    }));
}
