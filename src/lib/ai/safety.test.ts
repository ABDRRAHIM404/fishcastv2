import { describe, expect, it } from 'vitest';
import { buildFallbackRecommendation } from '@/lib/ai/fallback';
import { isRecommendationGrounded } from '@/lib/ai/guard';
import type { AiContext, AiRecommendation } from '@/lib/ai/types';

function context(
  status: AiContext['safety']['status'] = 'Safe',
  confidence: AiContext['integrity']['confidence'] = 'high'
): AiContext {
  return {
    spot: {
      name: "Sidi R'bat",
      spotType: 'Beach',
      difficultyLevel: 'Beginner',
    },
    conditions: {
      tideState: 'rising',
      tideHeightM: 1.2,
      tideSource: 'modelled',
      windSpeedKmh: 8,
      windDirection: 'W',
      waveHeightM: 0.4,
      temperatureC: 22,
      cloudCoverPct: 60,
      precipitationMm: 0,
    },
    score: {
      value: 8.7,
      grade: 'A',
      topFactors: [{ label: 'Wind', score: 100 }],
    },
    safety: {
      status,
      warnings: status === 'Safe' ? [] : ['Conditions require review.'],
      criticalWarnings:
        status === 'Dangerous' ? ['Dangerous gusts.'] : [],
    },
    integrity: {
      completenessPercentage: confidence === 'high' ? 100 : 60,
      confidence,
      missingInputs: confidence === 'low' ? ['waveHeight'] : [],
      missingCriticalInputs: confidence === 'low' ? ['waveHeight'] : [],
      forecastAgeMinutes: 0,
    },
    bestWindows: [
      {
        start: '08:00',
        end: '10:00',
        label: 'Excellent',
        peakScore: 8.8,
      },
    ],
    activeSpecies: [
      {
        commonName: 'European seabass',
        favoredNow: true,
        inSeason: true,
      },
    ],
    meta: {
      generatedAt: '2026-06-14T07:00:00.000Z',
      promptVersion: 'v2-safety',
      localDate: '2026-06-14',
    },
  };
}

describe('AI safety enforcement', () => {
  it('forces deterministic fallback to reject fishing during Dangerous safety', () => {
    const result = buildFallbackRecommendation(context('Dangerous'));
    expect(result.verdict).toBe('poor');
    expect(result.bestWindow).toBeNull();
    expect(result.summary).toContain('Do not fish');
    expect(result.summary).not.toContain('favored');
  });

  it('does not promote Unknown safety as a go-fishing recommendation', () => {
    const result = buildFallbackRecommendation(context('Unknown', 'low'));
    expect(result.verdict).toBe('poor');
    expect(result.bestWindow).toBeNull();
    expect(result.confidence).toBe('low');
    expect(result.summary).toContain('Safety is Unknown');
  });

  it('rejects a model response that recommends fishing in Dangerous conditions', () => {
    const recommendation: AiRecommendation = {
      verdict: 'excellent',
      summary: 'Go fishing now.',
      bestWindow: '08:00–10:00',
      confidence: 'high',
    };
    expect(
      isRecommendationGrounded(recommendation, context('Dangerous'))
    ).toBe(false);
  });

  it('accepts only a window supplied by the deterministic ranking', () => {
    const valid: AiRecommendation = {
      verdict: 'excellent',
      summary: 'Conditions look excellent.',
      bestWindow: '08:00-10:00',
      confidence: 'high',
    };
    expect(isRecommendationGrounded(valid, context())).toBe(true);
    expect(
      isRecommendationGrounded(
        { ...valid, bestWindow: '12:00–14:00' },
        context()
      )
    ).toBe(false);
  });

  it('does not allow model confidence above deterministic confidence', () => {
    const recommendation: AiRecommendation = {
      verdict: 'moderate',
      summary: 'Conditions are moderate.',
      bestWindow: null,
      confidence: 'high',
    };
    expect(
      isRecommendationGrounded(recommendation, context('Caution', 'low'))
    ).toBe(false);
  });
});
