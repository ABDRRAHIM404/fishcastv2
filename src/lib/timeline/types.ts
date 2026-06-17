/**
 * Timeline domain types. The interpolation + window engine is pure: it maps
 * forecast anchor series to a deterministic 5-minute timeline and ranked best
 * fishing windows. No UI, no I/O.
 */

/** One interpolated 5-minute increment. */
export interface TimelinePoint {
  /** ISO timestamp of this increment. */
  time: string;
  tideHeightM: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  waveHeightM: number | null;
  /** Fishing score 0-10 derived from interpolated conditions at this point. */
  score: number;
  /** Letter grade for `score` (consistent with the Phase 6 engine). */
  grade: string;
}

export type WindowLabel = 'Excellent' | 'Good' | 'Moderate' | 'Poor';

/** A contiguous run of increments at the same quality band. */
export interface FishingWindow {
  start: string;
  end: string;
  /** Time of the peak score within the window. */
  peakTime: string;
  /** Peak score (0-10) within the window. */
  peakScore: number;
  label: WindowLabel;
}

/** The full computed timeline for a spot and local date. */
export interface Timeline {
  spotId: string;
  /** Local day, YYYY-MM-DD. */
  date: string;
  /** 5-minute increments spanning the rolling 48-hour window (576 points). */
  points: TimelinePoint[];
  /** Ranked best fishing windows. */
  windows: FishingWindow[];
  /** ISO timestamp the timeline was computed. */
  generatedAt: string;
}

/** Anchor forecast series the engine interpolates from (provider-agnostic). */
export interface ForecastAnchors {
  /** Hourly anchors: ISO time + values aligned by index. */
  wind: { time: string[]; speedKmh: (number | null)[]; directionDeg: (number | null)[] };
  waves: { time: string[]; heightM: (number | null)[] };
  weather: {
    time: string[];
    precipitationMm: (number | null)[];
    cloudCoverPct: (number | null)[];
  };
  /** Sub-hourly tide height anchors. */
  tide: { time: string; heightM: number }[];
}
