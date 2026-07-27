import type { ModelledSeaLevelPoint } from '@/types/marine';

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

export interface DailyFishingWindows {
  /** Local day, YYYY-MM-DD. */
  date: string;
  /** Best fishing windows for this specific local day. */
  windows: FishingWindow[];
}

/** The full computed timeline for a spot and local date. */
export interface Timeline {
  spotId: string;
  /** Local day, YYYY-MM-DD. */
  date: string;
  /** 5-minute increments spanning the rolling 48-hour window (576 points). */
  points: TimelinePoint[];
  /** Ranked best fishing windows across the full window. */
  windows: FishingWindow[];
  /** Ranked best fishing windows per calendar day. */
  dailyWindows: DailyFishingWindows[];
  /** ISO timestamp the timeline was computed. */
  generatedAt: string;
  /** Makes provider source points and timeline interpolation explicit. */
  tideMetadata: {
    source: 'open-meteo-modelled';
    datum: 'mean-sea-level';
    providerIntervalMinutes: 60;
    timelineIntervalMinutes: 5;
    interpolation: 'monotone-cubic';
  };
}

/** Source forecast series the engine interpolates into domain timeline data. */
export interface ForecastAnchors {
  /** Hourly anchors: ISO time + values aligned by index. */
  wind: { time: string[]; speedKmh: (number | null)[]; directionDeg: (number | null)[] };
  waves: { time: string[]; heightM: (number | null)[] };
  weather: {
    time: string[];
    precipitationMm: (number | null)[];
    cloudCoverPct: (number | null)[];
    pressureMb: (number | null)[];
  };
  tide: {
    source: 'open-meteo-hourly';
    intervalMinutes: 60;
    /** Native provider points; buildTimeline derives five-minute estimates. */
    points: ModelledSeaLevelPoint[];
  };
}
