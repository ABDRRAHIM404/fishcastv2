import type { AiContext, AiRecommendation } from '@/lib/ai/types';

/**
 * Output guardrails (no-invention defense in depth, after Zod). Rejects a
 * model recommendation when it appears to introduce data not present in the
 * deterministic context:
 *  - numbers in the summary that do not appear among the allowed input values,
 *  - location-like tokens other than the provided spot name.
 * On rejection the caller uses the deterministic fallback instead.
 */

function collectAllowedNumbers(context: AiContext): Set<string> {
  const allowed = new Set<string>();
  const add = (n: number | null | undefined) => {
    if (typeof n !== 'number' || Number.isNaN(n)) return;
    allowed.add(String(n));
    allowed.add(String(Math.round(n)));
    allowed.add(n.toFixed(1));
  };

  const c = context.conditions;
  add(c.tideHeightM);
  add(c.windSpeedKmh);
  add(c.waveHeightM);
  add(c.temperatureC);
  add(c.cloudCoverPct);
  add(c.precipitationMm);
  add(context.score.value);
  add(context.integrity.completenessPercentage);
  add(context.integrity.forecastAgeMinutes);
  context.score.topFactors.forEach((f) => add(f.score));
  context.bestWindows.forEach((w) => {
    add(w.peakScore);
    // Window times like "15:00" — allow their digit groups.
    [w.start, w.end].forEach((t) => {
      t.split(/[:\u2013-]/).forEach((part) => allowed.add(part));
    });
  });
  return allowed;
}

function normalizeWindow(value: string): string {
  return value.replace(/\s/g, '').replace(/-/g, '\u2013');
}

function windowIsGrounded(
  recommendation: AiRecommendation,
  context: AiContext
): boolean {
  if (recommendation.bestWindow === null) return true;
  const supplied = context.bestWindows.map((window) =>
    normalizeWindow(`${window.start}\u2013${window.end}`)
  );
  return supplied.includes(normalizeWindow(recommendation.bestWindow));
}

function safetyIsGrounded(
  recommendation: AiRecommendation,
  context: AiContext
): boolean {
  if (context.safety.status === 'Dangerous') {
    const lower = recommendation.summary.toLowerCase();
    const positiveRecommendation =
      /go fishing|fish now|safe to fish|recommended to fish|conditions (?:look )?(?:excellent|good)/.test(
        lower
      );
    return (
      recommendation.verdict === 'poor' &&
      recommendation.bestWindow === null &&
      !positiveRecommendation
    );
  }
  if (context.safety.status === 'Unknown') {
    const lower = recommendation.summary.toLowerCase();
    return (
      recommendation.verdict !== 'excellent' &&
      recommendation.bestWindow === null &&
      !/go fishing|fish now|safe to fish|recommended to fish/.test(lower)
    );
  }
  return true;
}

function confidenceIsGrounded(
  recommendation: AiRecommendation,
  context: AiContext
): boolean {
  const rank = { low: 1, medium: 2, high: 3 } as const;
  return (
    rank[recommendation.confidence] <= rank[context.integrity.confidence]
  );
}

/** Returns true when the summary only uses numbers present in the context. */
function numbersAreGrounded(summary: string, context: AiContext): boolean {
  const allowed = collectAllowedNumbers(context);
  const found = summary.match(/\d+(?:\.\d+)?/g) ?? [];
  return found.every(
    (token) => allowed.has(token) || allowed.has(String(Number(token)))
  );
}

/** Returns true when the summary references no out-of-region location. */
function locationsAreGrounded(summary: string): boolean {
  const lower = summary.toLowerCase();
  // Disallow common out-of-region location cues; the spot name is always fine.
  const banned = [
    'portugal',
    'spain',
    'usa',
    'united states',
    'australia',
    'florida',
    'california',
    'mediterranean',
  ];
  return !banned.some((b) => lower.includes(b));
}

export function isRecommendationGrounded(
  rec: AiRecommendation,
  context: AiContext
): boolean {
  return (
    numbersAreGrounded(rec.summary, context) &&
    locationsAreGrounded(rec.summary) &&
    windowIsGrounded(rec, context) &&
    safetyIsGrounded(rec, context) &&
    confidenceIsGrounded(rec, context)
  );
}
