import { describe, it, expect } from 'vitest';
import { detectWindows, labelForScore } from '@/lib/timeline/windows';
import type { TimelinePoint } from '@/lib/timeline/types';

function pt(time: string, score: number): TimelinePoint {
  return {
    time,
    tideHeightM: null,
    windSpeedKmh: null,
    windDirectionDeg: null,
    waveHeightM: null,
    score,
    grade: 'D',
  };
}

describe('labelForScore', () => {
  it('maps scores to bands at the documented thresholds', () => {
    expect(labelForScore(9)).toBe('Excellent');
    expect(labelForScore(8)).toBe('Excellent');
    expect(labelForScore(7)).toBe('Good');
    expect(labelForScore(6)).toBe('Good');
    expect(labelForScore(5)).toBe('Moderate');
    expect(labelForScore(4)).toBe('Moderate');
    expect(labelForScore(3.9)).toBe('Poor');
  });
});

describe('detectWindows', () => {
  it('returns empty for no points', () => {
    expect(detectWindows([])).toEqual([]);
  });

  it('produces a single window for flat conditions', () => {
    const pts = [
      pt('2026-06-14T00:00:00.000Z', 5),
      pt('2026-06-14T00:05:00.000Z', 5),
      pt('2026-06-14T00:10:00.000Z', 5),
    ];
    const w = detectWindows(pts);
    expect(w).toHaveLength(1);
    expect(w[0]!.label).toBe('Moderate');
    expect(w[0]!.start).toBe(pts[0]!.time);
    expect(w[0]!.end).toBe(pts[2]!.time);
  });

  it('splits contiguous bands and preserves chronological order', () => {
    const pts = [
      pt('2026-06-14T00:00:00.000Z', 3), // Poor
      pt('2026-06-14T00:05:00.000Z', 7), // Good
      pt('2026-06-14T00:10:00.000Z', 9), // Excellent
      pt('2026-06-14T00:15:00.000Z', 9), // Excellent
    ];
    const w = detectWindows(pts);
    expect(w.map((x) => x.label)).toEqual(['Poor', 'Good', 'Excellent']);
    const top = w[2]!;
    expect(top.peakScore).toBe(9);
    expect(top.start).toBe('2026-06-14T00:10:00.000Z');
    expect(top.end).toBe('2026-06-14T00:15:00.000Z');
  });

  it('records the peak time within a window', () => {
    const pts = [
      pt('2026-06-14T00:00:00.000Z', 6),
      pt('2026-06-14T00:05:00.000Z', 7.5),
      pt('2026-06-14T00:10:00.000Z', 6.2),
    ];
    const w = detectWindows(pts);
    expect(w[0]!.peakTime).toBe('2026-06-14T00:05:00.000Z');
    expect(w[0]!.peakScore).toBe(7.5);
  });

  it('limits long uniform high-score segments to four windows', () => {
    const points: TimelinePoint[] = Array.from({ length: 288 }, (_, index) => {
      const totalMinutes = index * 5;
      const hour = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const minute = String(totalMinutes % 60).padStart(2, '0');
      return pt(`2026-06-14T${hour}:${minute}:00.000Z`, 9);
    });

    const windows = detectWindows(points);
    expect(windows).toHaveLength(4);
    for (let i = 0; i < windows.length; i++) {
      expect(windows[i]!.peakTime >= windows[i]!.start).toBe(true);
      expect(windows[i]!.peakTime <= windows[i]!.end).toBe(true);
      if (i > 0) {
        expect(windows[i]!.start > windows[i - 1]!.end).toBe(true);
      }
    }
  });

  it('caps daily windows to four even when every point is excellent', () => {
    const points: TimelinePoint[] = Array.from({ length: 288 }, (_, index) => {
      const totalMinutes = index * 5;
      const hour = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const minute = String(totalMinutes % 60).padStart(2, '0');
      return pt(`2026-06-14T${hour}:${minute}:00.000Z`, 9);
    });

    const dayPoints = points;
    const windows = detectWindows(dayPoints);
    expect(windows).toHaveLength(4);
  });
});
