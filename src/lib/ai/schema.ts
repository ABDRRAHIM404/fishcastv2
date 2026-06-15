import { z } from 'zod';
import { MAX_SUMMARY_LENGTH } from '@/lib/ai/constants';
import type { AiRecommendation } from '@/lib/ai/types';

/**
 * Zod schema for the structured Gemini response. Every recommendation
 * (whether parsed from Gemini or built by the fallback generator) must pass
 * this before it is rendered or stored. Invalid responses trigger the
 * deterministic fallback.
 */
export const aiRecommendationSchema = z.object({
  verdict: z.enum(['excellent', 'good', 'moderate', 'poor']),
  summary: z.string().trim().min(1).max(MAX_SUMMARY_LENGTH),
  bestWindow: z.string().trim().min(1).nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
});

/**
 * Safely parses an unknown value (e.g. JSON parsed from a model response) into
 * a validated AiRecommendation. Returns null on any validation failure so the
 * caller can fall back deterministically.
 */
export function parseRecommendation(value: unknown): AiRecommendation | null {
  const result = aiRecommendationSchema.safeParse(value);
  return result.success ? result.data : null;
}
