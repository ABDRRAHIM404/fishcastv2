import 'server-only';
import type { MarineConditions } from '@/types/marine';
import type { ScoreResult } from '@/lib/scoring/types';
import type { Timeline } from '@/lib/timeline/types';
import type { SpotSpecies, PreferredConditions } from '@/types/species';
import { evaluateSuitability } from '@/lib/species/suitability';
import { isInSeason } from '@/types/species';
import { PROMPT_VERSION } from '@/lib/ai/constants';
import type {
  AiContext,
  AiContextConditions,
  AiContextFactor,
  AiContextWindow,
  AiContextSpecies,
} from '@/lib/ai/types';

/** Minimal spot fields needed for the AI context (no free-text content). */
export interface AiContextSpotInput {
  name: string;
  spotTypeLabel: string;
  difficultyLabel: string;
}

export interface BuildAiContextInput {
  spot: AiContextSpotInput;
  marine: MarineConditions;
  score: ScoreResult;
  timeline: Timeline | null;
  species: SpotSpecies[];
  /** Map of species id -> preferred conditions (from the catalog). */
  preferredById: Map<string, PreferredConditions | null>;
  localDate: string;
  now?: Date;
}

function conditionsFrom(marine: MarineConditions): AiContextConditions {
  const tide = marine.tide.status === 'ok' ? marine.tide.data : null;
  const wind = marine.wind.status === 'ok' ? marine.wind.data : null;
  const waves = marine.waves.status === 'ok' ? marine.waves.data : null;
  const weather = marine.weather.status === 'ok' ? marine.weather.data : null;

  return {
    tideState: tide?.trend ?? null,
    tideHeightM: tide?.heightM ?? null,
    windSpeedKmh: wind?.speedKmh ?? null,
    windDirection: wind?.directionCompass ?? null,
    waveHeightM: waves?.waveHeightM ?? null,
    temperatureC: weather?.temperatureC ?? null,
    cloudCoverPct: weather?.cloudCoverPct ?? null,
    precipitationMm: weather?.precipitationMm ?? null,
  };
}

function topFactorsFrom(score: ScoreResult): AiContextFactor[] {
  return score.factors
    .filter((f) => !f.unavailable && f.score !== null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 4)
    .map((f) => ({
      label: f.label,
      score: f.score === null ? null : Math.round(f.score * 100),
    }));
}

function windowsFrom(timeline: Timeline | null): AiContextWindow[] {
  if (!timeline) return [];
  return timeline.windows
    .filter((w) => w.label !== 'Poor')
    .slice(0, 3)
    .map((w) => ({
      // Use HH:MM only (the payload is region/day-scoped already).
      start: w.start.slice(11, 16),
      end: w.end.slice(11, 16),
      label: w.label,
      peakScore: w.peakScore,
    }));
}

/**
 * Assembles the deterministic AI context from existing platform outputs.
 * Pure aside from the injectable `now`. Emits ONLY structured, derived values
 * — no descriptions, species notes, community reports, or user content.
 */
export function buildAiContext(input: BuildAiContextInput): AiContext {
  const { spot, marine, score, timeline, species, preferredById } = input;
  const now = input.now ?? new Date();
  const month = now.getMonth() + 1;

  const activeSpecies: AiContextSpecies[] = species.map((s) => {
    const pc = preferredById.get(s.id) ?? null;
    const favored = evaluateSuitability(pc, marine, now).favored;
    return {
      commonName: s.commonName,
      favoredNow: favored,
      inSeason: isInSeason(s.seasonMonths, month),
    };
  });

  return {
    spot: {
      name: spot.name,
      spotType: spot.spotTypeLabel,
      difficultyLevel: spot.difficultyLabel,
    },
    conditions: conditionsFrom(marine),
    score: {
      value: score.overallScore,
      grade: score.grade,
      topFactors: topFactorsFrom(score),
    },
    bestWindows: windowsFrom(timeline),
    activeSpecies,
    meta: {
      generatedAt: now.toISOString(),
      promptVersion: PROMPT_VERSION,
      localDate: input.localDate,
    },
  };
}

/**
 * Stable, order-independent hash of the deterministic context (excluding the
 * volatile generatedAt timestamp). Used as part of the cache key so a cached
 * recommendation is reused only while inputs are unchanged.
 */
export function hashAiContext(context: AiContext): string {
  const stable = {
    spot: context.spot,
    conditions: context.conditions,
    score: context.score,
    bestWindows: context.bestWindows,
    activeSpecies: context.activeSpecies,
    promptVersion: context.meta.promptVersion,
    localDate: context.meta.localDate,
  };
  const json = JSON.stringify(stable);
  // djb2 — small, dependency-free, sufficient for a cache discriminator.
  let hash = 5381;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) + hash + json.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
