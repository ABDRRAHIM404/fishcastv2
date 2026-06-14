'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Premium, touch-friendly timeline scrubber. Controlled: the parent owns the
 * active increment index. Renders a range input (native touch/keyboard a11y)
 * styled as a premium track, with an animated current-position indicator and
 * the active time label. 5-minute steps come from the points array length.
 */
export function TimelineScrubber({
  count,
  index,
  onIndexChange,
  timeLabel,
  className,
}: {
  count: number;
  index: number;
  onIndexChange: (index: number) => void;
  timeLabel: string;
  className?: string;
}) {
  const max = Math.max(0, count - 1);
  const pct = max === 0 ? 0 : (index / max) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-caption uppercase text-muted-foreground">
          Time
        </span>
        <span className="font-display text-h3 tabular-nums">{timeLabel}</span>
      </div>

      <div className="relative">
        {/* Track */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.15, ease: 'linear' }}
          />
        </div>
        {/* Native range overlays the track for touch/keyboard control. */}
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={index}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          aria-label="Scrub timeline"
          aria-valuetext={timeLabel}
          className="absolute inset-0 h-6 w-full -translate-y-2 cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-glow [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
        />
      </div>

      <div className="flex justify-between text-caption text-muted-foreground">
        <span>00:00</span>
        <span>12:00</span>
        <span>23:55</span>
      </div>
    </div>
  );
}
