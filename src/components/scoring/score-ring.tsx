'use client';

import { motion } from 'framer-motion';

/**
 * Circular score ring (0-10). Pure presentation: renders an SVG progress arc
 * with the numeric score in the centre. Color comes from the condition tokens
 * via a CSS variable class on the stroke.
 */
export function ScoreRing({
  score,
  percentage,
  className,
}: {
  /** 0-10 score shown in the centre. */
  score: number;
  /** 0-100 used to fill the arc. */
  percentage: number;
  className?: string;
}) {
  const size = 132;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clamped / 100) * circumference;

  const colorClass =
    clamped >= 80
      ? 'text-condition-excellent'
      : clamped >= 65
        ? 'text-condition-good'
        : clamped >= 45
          ? 'text-condition-moderate'
          : 'text-condition-poor';

  return (
    <div className={className}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border/50"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={`stroke-current ${colorClass}`}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="-mt-[88px] flex flex-col items-center">
        <span className="font-display text-h1 leading-none tabular-nums">
          {score.toFixed(1)}
        </span>
        <span className="text-caption text-muted-foreground">/ 10</span>
      </div>
      <div className="mt-9" />
    </div>
  );
}
