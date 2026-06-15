import 'server-only';
import {
  GEMINI_API_BASE,
  GEMINI_MODEL,
  GEMINI_FALLBACK_MODEL,
  GENERATION_CONFIG,
  GEMINI_TIMEOUT_MS,
} from '@/lib/ai/constants';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/ai/prompt';
import { parseRecommendation } from '@/lib/ai/schema';
import type { AiContext, AiRecommendation } from '@/lib/ai/types';

/**
 * Minimal server-side Gemini client. Calls the Generative Language API with
 * the versioned system prompt + serialized deterministic context and parses a
 * structured JSON recommendation. Returns null on any failure (network,
 * timeout, non-2xx, unparseable, or schema-invalid) so the service can fall
 * back deterministically. The API key is read server-side only.
 */

interface GeminiCandidatePart {
  text?: string;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiCandidatePart[] } }[];
}

/** Extracts the first JSON object from a model text response. */
function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callModel(
  model: string,
  apiKey: string,
  context: AiContext
): Promise<AiRecommendation | null> {
  const url = `${GEMINI_API_BASE}/${model}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          { role: 'user', parts: [{ text: buildUserPrompt(context) }] },
        ],
        generationConfig: {
          temperature: GENERATION_CONFIG.temperature,
          maxOutputTokens: GENERATION_CONFIG.maxOutputTokens,
          candidateCount: GENERATION_CONFIG.candidateCount,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const json = (await res.json()) as GeminiResponse;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string' || text.length === 0) return null;

    return parseRecommendation(extractJson(text));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Requests a structured recommendation from Gemini. Tries the preferred Flash
 * model, then the latest-stable Flash fallback. Returns null on failure.
 */
export async function requestGeminiRecommendation(
  context: AiContext
): Promise<AiRecommendation | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const primary = await callModel(GEMINI_MODEL, apiKey, context);
  if (primary) return primary;

  return callModel(GEMINI_FALLBACK_MODEL, apiKey, context);
}
