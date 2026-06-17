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

const MERGE_GAP_STEPS = 6; // 30 minutes / 5-minute increments

type LabelSegment = {
  startIdx: number;
  endIdx: number;
  label: WindowLabel;
};

function buildWindow(pointSegment: LabelSegment, points: TimelinePoint[]): FishingWindow {
  let peakIdx = pointSegment.startIdx;
  for (let i = pointSegment.startIdx; i <= pointSegment.endIdx; i++) {
    if (points[i]!.score > points[peakIdx]!.score) peakIdx = i;
  }

  return {
    start: points[pointSegment.startIdx]!.time,
    end: points[pointSegment.endIdx]!.time,
    peakTime: points[peakIdx]!.time,
    peakScore: points[peakIdx]!.score,
    label: pointSegment.label,
  };
}

function mergeSmallGaps(segments: LabelSegment[]): LabelSegment[] {
  if (segments.length < 3) return segments;

  const merged: LabelSegment[] = [];
  let i = 0;

  while (i < segments.length) {
    const current = segments[i]!;

    if (
      i > 0 &&
      i < segments.length - 1 &&
      current.label === 'Poor' &&
      current.endIdx - current.startIdx + 1 <= MERGE_GAP_STEPS
    ) {
      const previous = merged[merged.length - 1]!;
      const next = segments[i + 1]!;
      if (previous.label !== 'Poor' && next.label !== 'Poor') {
        const mergedLabel = previous.label === next.label
          ? previous.label
          : previous.label === 'Excellent' || next.label === 'Excellent'
          ? 'Excellent'
          : 'Good';

        previous.endIdx = next.endIdx;
        previous.label = mergedLabel;
        i += 2;
        continue;
      }
    }

    merged.push(current);
    i += 1;
  }

  return merged;
}

/**
 * Detects contiguous windows of equal label across the timeline points and
 * returns them in chronological order. Each window carries its start/end plus
 * the peak score time within that window.
 */
export function detectWindows(points: TimelinePoint[]): FishingWindow[] {
  if (points.length === 0) return [];

  const segments: LabelSegment[] = [];
  let startIdx = 0;
  let currentLabel = labelForScore(points[0]!.score);

  for (let i = 1; i < points.length; i++) {
    const label = labelForScore(points[i]!.score);
    if (label !== currentLabel) {
      segments.push({ startIdx, endIdx: i - 1, label: currentLabel });
      startIdx = i;
      currentLabel = label;
    }
  }
  segments.push({ startIdx, endIdx: points.length - 1, label: currentLabel });

  const normalized = mergeSmallGaps(segments);
  return normalized.map((segment) => buildWindow(segment, points));
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
