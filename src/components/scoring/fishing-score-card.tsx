'use client';

import { motion } from 'framer-motion';
import { Gauge } from 'lucide-react';
import { PremiumCard } from '@/components/spot/premium-card';
import { Badge } from '@/components/ui/badge';
import { ScoreRing } from '@/components/scoring/score-ring';
import { staggerContainer, fadeInUp } from '@/components/shared/motion';
import { useFishingScore } from '@/hooks/use-fishing-score';
import { Skeleton } from '@/components/ui/skeleton';
import type { FactorScore } from '@/lib/scoring/types';

function gradeVariant(
  grade: string
): 'excellent' | 'good' | 'moderate' | 'poor' {
  if (grade === 'A+' || grade === 'A') return 'excellent';
  if (grade === 'B') return 'good';
  if (grade === 'C') return 'moderate';
  return 'poor';
}

function FactorRow({ factor }: { factor: FactorScore }) {
  const pct = factor.score === null ? 0 : Math.round(factor.score * 100);
  return (
    <motion.div variants={fadeInUp} className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{factor.label}</span>
        <span className="text-muted-foreground">
          {factor.unavailable ? '—' : `${pct}%`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="text-caption text-muted-foreground">{factor.explanation}</p>
    </motion.div>
  );
}

/**
 * Fishing Score Card for the spot details page. Fetches the deterministic
 * score via /api/score and renders the score ring, grade badge, and per-factor
 * breakdown. Display only — the engine, not this component, owns all logic.
 */
export function FishingScoreCard({ spotId }: { spotId: string }) {
  const { state } = useFishingScore(spotId);

  return (
    <PremiumCard className="p-6">
      <div className="flex items-center gap-2">
        <Gauge className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-h3">Fishing score</h2>
      </div>

      {state.status === 'loading' ? (
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <Skeleton className="size-[132px] shrink-0 rounded-full" />
          <div className="w-full space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      ) : state.status === 'error' ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Fishing score is unavailable right now.
        </p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-3">
            <ScoreRing
              score={state.data.overallScore}
              percentage={state.data.percentage}
            />
            <Badge variant={gradeVariant(state.data.grade)}>
              Grade {state.data.grade}
            </Badge>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="w-full space-y-4"
          >
            {state.data.factors.map((factor) => (
              <FactorRow key={factor.key} factor={factor} />
            ))}
          </motion.div>
        </div>
      )}
    </PremiumCard>
  );
}
