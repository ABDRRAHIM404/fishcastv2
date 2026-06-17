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
const MAX_WINDOW_STEPS = 48; // 4 hours hard cap
const MIN_WINDOW_STEPS = 8; // 40 minutes - avoid tiny fallback windows
const MAX_DAILY_WINDOWS = 4;
const MIN_PEAK_SEPARATION_STEPS = 12; // 1 hour

type LabelSegment = {
  startIdx: number;
  endIdx: number;
  label: WindowLabel;
};

function clampIndex(index: number, min: number, max: number): number {
  return Math.min(Math.max(index, min), max);
}

function buildWindow(pointSegment: LabelSegment, points: TimelinePoint[]): FishingWindow {
  const start = pointSegment.startIdx;
  const end = pointSegment.endIdx;
  let peakIdx = start;
  for (let i = start; i <= end; i++) {
    if (points[i]!.score > points[peakIdx]!.score) peakIdx = i;
  }

  peakIdx = clampIndex(peakIdx, start, end);

  return {
    start: points[start]!.time,
    end: points[end]!.time,
    peakTime: points[peakIdx]!.time,
    peakScore: points[peakIdx]!.score,
    label: pointSegment.label,
  };
}

function compressPlateauPeaks(peaks: number[], points: TimelinePoint[]): number[] {
  const result: number[] = [];
  let clusterStart = peaks[0]!;
  let clusterEnd = peaks[0]!;

  for (let i = 1; i < peaks.length; i++) {
    const current = peaks[i]!;
    const previous = peaks[i - 1]!;
    if (
      current === previous + 1 &&
      points[current]!.score === points[previous]!.score
    ) {
      clusterEnd = current;
      continue;
    }

    result.push(Math.floor((clusterStart + clusterEnd) / 2));
    clusterStart = current;
    clusterEnd = current;
  }

  result.push(Math.floor((clusterStart + clusterEnd) / 2));
  return result;
}

function findLocalPeaks(segment: LabelSegment, points: TimelinePoint[]): number[] {
  const peaks: number[] = [];
  for (let i = segment.startIdx; i <= segment.endIdx; i++) {
    const score = points[i]!.score;
    const left = i === segment.startIdx ? -Infinity : points[i - 1]!.score;
    const right = i === segment.endIdx ? -Infinity : points[i + 1]!.score;
    if (score >= left && score >= right) peaks.push(i);
  }
  return peaks.length > 0 ? compressPlateauPeaks(peaks, points) : peaks;
}

function selectDistinctPeaks(
  peaks: number[],
  points: TimelinePoint[],
  maxPeaks: number
): number[] {
  if (peaks.length <= maxPeaks) return peaks;

  const sortedByStrength = [...peaks].sort((a, b) => {
    const delta = points[b]!.score - points[a]!.score;
    return delta !== 0 ? delta : a - b;
  });

  const selected: number[] = [];
  for (const peak of sortedByStrength) {
    if (
      selected.some(
        (selectedPeak) =>
          Math.abs(selectedPeak - peak) < MIN_PEAK_SEPARATION_STEPS
      )
    ) {
      continue;
    }
    selected.push(peak);
    if (selected.length === maxPeaks) break;
  }

  if (selected.length < maxPeaks) {
    for (const peak of sortedByStrength) {
      if (!selected.includes(peak)) {
        selected.push(peak);
        if (selected.length === maxPeaks) break;
      }
    }
  }

  return selected.sort((a, b) => a - b);
}

function findValleyBetween(
  startIdx: number,
  endIdx: number,
  points: TimelinePoint[]
): number {
  let valleyIdx = startIdx + 1;
  let minScore = points[valleyIdx]!.score;

  for (let i = startIdx + 1; i < endIdx; i++) {
    const score = points[i]!.score;
    if (score < minScore) {
      minScore = score;
      valleyIdx = i;
    }
  }

  return valleyIdx;
}

function evenlySpacedAnchors(segment: LabelSegment, count: number): number[] {
  const length = segment.endIdx - segment.startIdx + 1;
  const spacing = length / count;
  const anchors: number[] = [];

  for (let i = 0; i < count; i++) {
    anchors.push(
      clampIndex(
        Math.round(segment.startIdx + spacing * (i + 0.5)) - 1,
        segment.startIdx,
        segment.endIdx
      )
    );
  }

  return anchors.sort((a, b) => a - b);
}

function splitLongSegment(segment: LabelSegment, points: TimelinePoint[]): LabelSegment[] {
  const length = segment.endIdx - segment.startIdx + 1;
  if (segment.label === 'Poor' || length <= MAX_WINDOW_STEPS) return [segment];

  let peaks = selectDistinctPeaks(
    findLocalPeaks(segment, points),
    points,
    MAX_DAILY_WINDOWS
  );

  if (peaks.length === 0) {
    peaks = evenlySpacedAnchors(
      segment,
      Math.min(MAX_DAILY_WINDOWS, Math.ceil(length / MAX_WINDOW_STEPS))
    );
  }

  if (peaks.length === 1 && length > MAX_WINDOW_STEPS * MAX_DAILY_WINDOWS) {
    peaks = evenlySpacedAnchors(segment, MAX_DAILY_WINDOWS);
  }

  const boundaries: number[] = [];
  for (let i = 0; i < peaks.length - 1; i++) {
    boundaries.push(findValleyBetween(peaks[i]!, peaks[i + 1]!, points));
  }

  const windows: LabelSegment[] = [];
  let start = segment.startIdx;

  for (let i = 0; i < peaks.length; i++) {
    const peakIdx = peaks[i]!;
    let end = i < boundaries.length ? boundaries[i]! : segment.endIdx;
    end = clampIndex(end, start, segment.endIdx);

    if (end - start + 1 > MAX_WINDOW_STEPS) {
      const halfWidth = Math.floor(MAX_WINDOW_STEPS / 2);
      start = clampIndex(peakIdx - halfWidth, segment.startIdx, end);
      end = clampIndex(start + MAX_WINDOW_STEPS - 1, segment.startIdx, segment.endIdx);
    }

    if (peakIdx < start) start = clampIndex(peakIdx, segment.startIdx, segment.endIdx);
    if (peakIdx > end) end = clampIndex(peakIdx, start, segment.endIdx);

    if (windows.length > 0) {
      const previous = windows[windows.length - 1]!;
      if (start <= previous.endIdx) {
        start = previous.endIdx + 1;
        if (start > segment.endIdx) break;
        end = clampIndex(start + MAX_WINDOW_STEPS - 1, segment.startIdx, segment.endIdx);
      }
    }

    if (end - start + 1 >= MIN_WINDOW_STEPS) {
      windows.push({ startIdx: start, endIdx: end, label: segment.label });
    }

    start = end + 1;
    if (start > segment.endIdx) break;
  }

  return windows.length > 0 ? windows : [segment];
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
      current.endIdx - current.startIdx + 1 <= MERGE_GAP_STEPS
    ) {
      const previous = merged[merged.length - 1]!;
      const next = segments[i + 1]!;
      if (previous.label === next.label) {
        previous.endIdx = next.endIdx;
        i += 2;
        continue;
      }

      if (
        previous.label === 'Excellent' &&
        next.label === 'Excellent' &&
        current.label !== 'Poor'
      ) {
        previous.endIdx = next.endIdx;
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
  const split = normalized.flatMap((segment) => splitLongSegment(segment, points));
  return split.map((segment) => buildWindow(segment, points));
}

function limitWindowsPerDay(windows: FishingWindow[]): FishingWindow[] {
  const selected = [...windows]
    .sort((a, b) => {
      const scoreDelta = b.peakScore - a.peakScore;
      if (scoreDelta !== 0) return scoreDelta;
      const durationA = new Date(a.end).getTime() - new Date(a.start).getTime();
      const durationB = new Date(b.end).getTime() - new Date(b.start).getTime();
      if (durationB !== durationA) return durationB - durationA;
      return a.start.localeCompare(b.start);
    })
    .slice(0, MAX_DAILY_WINDOWS)
    .sort((a, b) => a.start.localeCompare(b.start));

  return selected;
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
      windows: limitWindowsPerDay(detectWindows(dailyPoints)),
    }));
}
