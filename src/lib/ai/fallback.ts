import type { AiContext, AiRecommendation, AiVerdict } from '@/lib/ai/types';

/**
 * Deterministic, no-network recommendation generator. Used when Gemini is
 * disabled, errors/times out, is rate-limited, or returns output that fails
 * validation. Builds text purely from the existing deterministic outputs in
 * the context, so the UI always has a coherent recommendation and Phase 9
 * degrades gracefully to Phase 6/7 results.
 */

function verdictFromGrade(grade: string, value: number): AiVerdict {
  if (grade === 'A+' || grade === 'A') return 'excellent';
  if (grade === 'B') return 'good';
  if (grade === 'C') return 'moderate';
  if (grade === 'D' || grade === 'F') return 'poor';
  // Fallback to the numeric score if the grade is unexpected.
  if (value >= 8) return 'excellent';
  if (value >= 6) return 'good';
  if (value >= 4) return 'moderate';
  return 'poor';
}

const VERDICT_PHRASE: Record<AiVerdict, string> = {
  excellent: 'Conditions look excellent',
  good: 'Conditions look good',
  moderate: 'Conditions are moderate',
  poor: 'Conditions are poor',
};

export function buildFallbackRecommendation(
  context: AiContext
): AiRecommendation {
  const verdict = verdictFromGrade(context.score.grade, context.score.value);

  const sentences: string[] = [
    `${VERDICT_PHRASE[verdict]} at ${context.spot.name} (score ${context.score.value.toFixed(
      1
    )}/10).`,
  ];

  const topFactor = context.score.topFactors[0];
  if (topFactor) {
    sentences.push(`${topFactor.label} is the strongest factor right now.`);
  }

  const bestWindow = context.bestWindows[0] ?? null;
  const windowStr = bestWindow ? `${bestWindow.start}\u2013${bestWindow.end}` : null;
  if (windowStr) {
    sentences.push(`Best window: ${windowStr}.`);
  }

  const favored = context.activeSpecies.filter((s) => s.favoredNow);
  if (favored.length > 0 && favored[0]) {
    sentences.push(`${favored[0].commonName} is favored by current conditions.`);
  }

  return {
    verdict,
    summary: sentences.join(' '),
    bestWindow: windowStr,
    confidence: 'medium',
  };
}
