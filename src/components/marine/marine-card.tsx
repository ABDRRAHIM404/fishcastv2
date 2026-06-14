'use client';

import { motion } from 'framer-motion';
import { fadeInUp } from '@/components/shared/motion';
import { cn } from '@/lib/utils';

/** A single metric row inside a marine card. */
export function MarineMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * Presentational marine condition card shell. Data display only — no scoring or
 * good/bad logic. Renders an error state when a provider/section is unavailable.
 */
export function MarineCard({
  title,
  icon,
  error,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  error?: string | null;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      className={cn(
        'surface-glass rounded-lg border border-border/60 p-4 shadow-premium',
        className
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <h3 className="text-caption font-medium uppercase tracking-wide">
          {title}
        </h3>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Data unavailable right now.
        </p>
      ) : (
        <dl className="mt-3 space-y-2">{children}</dl>
      )}
    </motion.div>
  );
}
