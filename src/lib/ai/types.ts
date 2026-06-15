/**
 * AI (Gemini) domain types for Phase 9. The recommendation layer is
 * interpretive only: it never invents data. The model receives ONLY the
 * deterministic outputs already produced by the platform (marine conditions,
 * fishing score, best windows, species suitability) and returns a small,
 * structured, validated object.
 *
 * No free-text database content (descriptions, species notes, community
 * reports, user-generated content) is ever included in the context.
 */

export type AiVerdict = 'excellent' | 'good' | 'moderate' | 'poor';
export type AiConfidence = 'high' | 'medium' | 'low';

/** The validated recommendation shape returned to the client and cached. */
export interface AiRecommendation {
  verdict: AiVerdict;
  summary: string;
  /** Human-readable best-window string, e.g. "15:00\u201317:00", or null. */
  bestWindow: string | null;
  confidence: AiConfidence;
}

/** Where the served recommendation came from. */
export type AiSource = 'gemini' | 'fallback';

/** API/service response envelope. */
export interface AiRecommendationResponse {
  recommendation: AiRecommendation;
  source: AiSource;
  /** ISO timestamp the recommendation was generated/cached. */
  generatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Deterministic input contract passed to Gemini (no free-text DB content).   */
/* -------------------------------------------------------------------------- */

export interface AiContextSpot {
  /** Spot name (region-locked seed data; not user-generated). */
  name: string;
  /** Label, e.g. "Beach". */
  spotType: string;
  /** Label, e.g. "Intermediate". */
  difficultyLevel: string;
}

export interface AiContextConditions {
  tideState: string | null;
  tideHeightM: number | null;
  windSpeedKmh: number | null;
  windDirection: string | null;
  waveHeightM: number | null;
  temperatureC: number | null;
  cloudCoverPct: number | null;
  precipitationMm: number | null;
}

export interface AiContextFactor {
  label: string;
  /** Normalized 0-100 contribution, or null when unavailable. */
  score: number | null;
}

export interface AiContextScore {
  /** Overall score on a 0-10 scale. */
  value: number;
  /** Letter grade from the deterministic engine. */
  grade: string;
  /** Up to a few of the most relevant factors. */
  topFactors: AiContextFactor[];
}

export interface AiContextWindow {
  start: string;
  end: string;
  label: string;
  peakScore: number;
}

export interface AiContextSpecies {
  commonName: string;
  favoredNow: boolean;
  inSeason: boolean;
}

/**
 * The complete, typed payload serialized to Gemini. Every value is derived
 * from existing deterministic outputs; missing data is explicit null.
 */
export interface AiContext {
  spot: AiContextSpot;
  conditions: AiContextConditions;
  score: AiContextScore;
  bestWindows: AiContextWindow[];
  activeSpecies: AiContextSpecies[];
  meta: {
    generatedAt: string;
    promptVersion: string;
    localDate: string;
  };
}
