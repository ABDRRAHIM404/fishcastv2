/**
 * Pure best-fishing-window detection over an interpolated timeline. Groups
 * contiguous increments into the same quality band and emits ranked windows.
 */
import type { FishingWindow, TimelinePoint, WindowLabel } from '@/lib/timeline/types';

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

/**
 * Detects contiguous windows of equal label across the timeline points and
 * returns them ranked best-first (then earliest). Each window carries its
 * start/end plus the peak score time within it.
 */
export function detectWindows(points: TimelinePoint[]): FishingWindow[] {
  if (points.length === 0) return [];

  const windows: FishingWindow[] = [];
  let startIdx = 0;
  let currentLabel = labelForScore(points[0]!.score);

  const flush = (from: number, to: number, label: WindowLabel) => {
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
  };

  for (let i = 1; i < points.length; i++) {
    const label = labelForScore(points[i]!.score);
    if (label !== currentLabel) {
      flush(startIdx, i - 1, currentLabel);
      startIdx = i;
      currentLabel = label;
    }
  }
  flush(startIdx, points.length - 1, currentLabel);

  return windows.sort((a, b) => {
    if (RANK[a.label] !== RANK[b.label]) return RANK[a.label] - RANK[b.label];
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
}
