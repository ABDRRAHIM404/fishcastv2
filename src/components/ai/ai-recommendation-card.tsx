'use client';

import { motion } from 'framer-motion';
import { Sparkles, Clock } from 'lucide-react';
import { PremiumCard } from '@/components/spot/premium-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { fadeInUp } from '@/components/shared/motion';
import { useAiRecommendation } from '@/hooks/use-ai-recommendation';
import type { AiVerdict } from '@/lib/ai/types';

const VERDICT_VARIANT: Record<
  AiVerdict,
  'excellent' | 'good' | 'moderate' | 'poor'
> = {
  excellent: 'excellent',
  good: 'good',
  moderate: 'moderate',
  poor: 'poor',
};

const VERDICT_LABEL: Record<AiVerdict, string> = {
  excellent: 'Excellent',
  good: 'Good',
  moderate: 'Moderate',
  poor: 'Poor',
};

/**
 * AI recommendation card for the spot details page. Renders the structured,
 * interpretive summary produced from deterministic platform outputs. Display
 * only; all logic and guardrails live server-side. Degrades gracefully — the
 * deterministic fallback is rendered identically, without an AI flourish.
 */
export function AiRecommendationCard({ spotId }: { spotId: string }) {
  const { state } = useAiRecommendation(spotId);

  return (
    <PremiumCard className="p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-h3">AI recommendation</h2>
      </div>

      {state.status === 'loading' ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ) : state.status === 'error' ? (
        <p className="mt-4 text-sm text-muted-foreground">
          The recommendation is unavailable right now.
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
              {VERDICT_LABEL[state.data.recommendation.verdict]}
            </Badge>
            {state.data.recommendation.bestWindow ? (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="size-4" aria-hidden />
                {state.data.recommendation.bestWindow}
              </span>
            ) : null}
          </div>

          <p className="text-body-lg text-muted-foreground">
            {state.data.recommendation.summary}
          </p>
        </motion.div>
      )}
    </PremiumCard>
  );
}
