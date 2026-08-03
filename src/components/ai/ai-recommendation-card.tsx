'use client';

import { motion } from 'framer-motion';
import { Sparkles, Clock } from 'lucide-react';
import { PremiumCard } from '@/components/spot/premium-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fadeInUp } from '@/components/shared/motion';
import { useAiRecommendation } from '@/hooks/use-ai-recommendation';
import type { AiVerdict } from '@/lib/ai/types';
import { useI18n } from '@/i18n/provider';
import { confidenceStatus } from '@/i18n/presentation';

const VERDICT_VARIANT: Record<
  AiVerdict,
  'excellent' | 'good' | 'moderate' | 'poor'
> = {
  excellent: 'excellent',
  good: 'good',
  moderate: 'moderate',
  poor: 'poor',
};

/**
 * AI recommendation card for the spot details page. Renders the structured,
 * interpretive summary produced from deterministic platform outputs. Display
 * only; all logic and guardrails live server-side. Degrades gracefully — the
 * deterministic fallback is rendered identically, without an AI flourish.
 */
export function AiRecommendationCard({ spotId }: { spotId: string }) {
  const { locale, t } = useI18n();
  const { state } = useAiRecommendation(spotId);

  return (
    <PremiumCard className="p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-h3">{t('ai.title')}</h2>
      </div>

      {state.status === 'loading' ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : state.status === 'error' ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t('ai.unavailable')}
        </p>
      ) : (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="show"
          className="mt-4 space-y-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={VERDICT_VARIANT[state.data.recommendation.verdict]}>
              {state.data.recommendation.verdict === 'excellent'
                ? t('status.fishing.excellent')
                : state.data.recommendation.verdict === 'good'
                  ? t('status.fishing.good')
                  : state.data.recommendation.verdict === 'moderate'
                    ? t('status.fishing.moderate')
                    : t('status.fishing.poor')}
            </Badge>
            <Badge variant="outline">
              {state.data.source === 'gemini'
                ? t('ai.generated')
                : t('ai.fallback')}
            </Badge>
            <span className="text-sm capitalize text-muted-foreground">
              {confidenceStatus(t, state.data.recommendation.confidence)}
            </span>
            {state.data.recommendation.bestWindow ? (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="size-4" aria-hidden />
                {state.data.recommendation.bestWindow}
              </span>
            ) : null}
          </div>

          <p className="text-body-lg text-muted-foreground" dir="auto" lang="en">
            {state.data.recommendation.summary}
          </p>
          {locale !== 'en' ? <p className="text-xs text-muted-foreground">{t('ai.summaryUnavailable')}</p> : null}
        </motion.div>
      )}
    </PremiumCard>
  );
}
