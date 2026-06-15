import 'server-only';

/**
 * Phase 9 AI configuration. Centralized so the model and limits can change
 * without touching call sites. Flash-tier model prioritized for low latency /
 * low cost (the card only produces short summaries).
 */

/**
 * Bump when the prompt or context contract changes; included in the cache key
 * so stale recommendations are invalidated cleanly.
 */
export const PROMPT_VERSION = 'v1';

/** Prefer Gemini 2.5 Flash; falls back to the latest stable Flash model. */
export const GEMINI_MODEL = 'gemini-2.5-flash';
export const GEMINI_FALLBACK_MODEL = 'gemini-flash-latest';

export const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models';

/** Generation config — low temperature + small token cap for determinism/cost. */
export const GENERATION_CONFIG = {
  temperature: 0.2,
  maxOutputTokens: 256,
  candidateCount: 1,
} as const;

/** Network timeout for a single Gemini call (ms). */
export const GEMINI_TIMEOUT_MS = 8000;

/** Recommendation cache TTL (ms). Aligned with marine freshness (30 min). */
export const AI_TTL_MS = 30 * 60 * 1000;

/** Output validation caps (no-invention guardrails). */
export const MAX_SUMMARY_LENGTH = 280;

/** Whether AI is enabled. Kill switch via AI_ENABLED="false". */
export function isAiEnabled(): boolean {
  return process.env.AI_ENABLED !== 'false' && Boolean(process.env.GEMINI_API_KEY);
}
