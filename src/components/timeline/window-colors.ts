import type { WindowLabel } from '@/lib/timeline/types';

/**
 * Shared color mapping for fishing-window bands. Uses the condition design
 * tokens (resolved to rgb so Recharts SVG fills work) for visual consistency
 * with the score card and badges.
 */
export const WINDOW_FILL: Record<WindowLabel, string> = {
  Excellent: 'rgba(34, 197, 94, 0.14)',
  Good: 'rgba(132, 204, 22, 0.12)',
  Moderate: 'rgba(234, 179, 8, 0.12)',
  Poor: 'rgba(239, 68, 68, 0.08)',
};

export const WINDOW_BADGE: Record<
  WindowLabel,
  'excellent' | 'good' | 'moderate' | 'poor'
> = {
  Excellent: 'excellent',
  Good: 'good',
  Moderate: 'moderate',
  Poor: 'poor',
};
