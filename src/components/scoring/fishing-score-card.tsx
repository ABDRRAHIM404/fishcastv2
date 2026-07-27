'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, Gauge, ShieldAlert } from 'lucide-react';
import { PremiumCard } from '@/components/spot/premium-card';
import { Badge } from '@/components/ui/badge';
import { ScoreRing } from '@/components/scoring/score-ring';
import { staggerContainer, fadeInUp } from '@/components/shared/motion';
import { useFishingScore } from '@/hooks/use-fishing-score';
import { Skeleton } from '@/components/ui/skeleton';
import type { FactorScore } from '@/lib/scoring/types';
import type { SafetyStatus } from '@/lib/safety/types';

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

const SAFETY_VARIANT: Record<
  SafetyStatus,
  'good' | 'moderate' | 'poor' | 'outline'
> = {
  Safe: 'good',
  Caution: 'moderate',
  Dangerous: 'poor',
  Unknown: 'outline',
};

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
        <div className="mt-4 space-y-5">
          <div className="rounded-lg border border-border/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldAlert className="size-5 text-primary" aria-hidden />
              <span className="font-medium">Safety</span>
              <Badge variant={SAFETY_VARIANT[state.data.safety.status]}>
                {state.data.safety.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {state.data.integrity.confidence} confidence ·{' '}
                {state.data.integrity.completenessPercentage}% complete
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.data.safety.explanation}
            </p>
            {state.data.safety.limitations[0] ? (
              <p className="mt-2 text-caption text-muted-foreground">
                Location-model limitation:{' '}
                {state.data.safety.limitations[0]}
              </p>
            ) : null}
            {state.data.safety.criticalWarnings.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-condition-poor">
                {state.data.safety.criticalWarnings.map((warning) => (
                  <li key={warning.code} className="flex gap-2">
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    {warning.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {state.data.safety.warnings.some(
              (warning) => warning.severity === 'warning'
            ) ? (
              <ul className="mt-3 space-y-2 text-sm text-condition-moderate">
                {state.data.safety.warnings
                  .filter((warning) => warning.severity === 'warning')
                  .map((warning) => (
                    <li key={warning.code} className="flex gap-2">
                      <AlertTriangle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      {warning.message}
                    </li>
                  ))}
              </ul>
            ) : null}
            {state.data.integrity.missingInputs.length > 0 ? (
              <p className="mt-3 text-sm text-condition-moderate">
                Missing data:{' '}
                {state.data.integrity.missingInputs.join(', ')}. Missing
                values are not treated as favourable.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-3">
              <ScoreRing
                score={state.data.fishing.overallScore}
                percentage={state.data.fishing.percentage}
              />
              <Badge variant={gradeVariant(state.data.fishing.grade)}>
                {state.data.fishing.label} · Grade{' '}
                {state.data.fishing.grade}
              </Badge>
              <span className="text-caption text-muted-foreground">
                Fishing quality, separate from safety
              </span>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="w-full space-y-4"
            >
              {state.data.fishing.factors.map((factor) => (
                <FactorRow key={factor.key} factor={factor} />
              ))}
            </motion.div>
          </div>
        </div>
      )}
    </PremiumCard>
  );
}
