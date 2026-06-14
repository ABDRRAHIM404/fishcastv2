'use client';

import { Waves, Wind, Droplets, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { degreesToCompass } from '@/types/marine';
import type { TimelinePoint } from '@/lib/timeline/types';

function fmt(value: number | null, unit: string, digits = 0): string {
  if (value === null) return '\u2014';
  return `${value.toFixed(digits)}${unit}`;
}

function gradeVariant(
  grade: string
): 'excellent' | 'good' | 'moderate' | 'poor' {
  if (grade === 'A+' || grade === 'A') return 'excellent';
  if (grade === 'B') return 'good';
  if (grade === 'C') return 'moderate';
  return 'poor';
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="text-caption uppercase">{label}</span>
      </div>
      <p className="mt-1 font-display text-h3 tabular-nums">{value}</p>
    </div>
  );
}

/**
 * Live readout of the conditions at the scrubbed increment. Updates in real
 * time as the user moves the scrubber. Data display only.
 */
export function TimelineReadout({ point }: { point: TimelinePoint }) {
  const dir = degreesToCompass(point.windDirectionDeg);
  const windValue =
    point.windSpeedKmh === null
      ? '\u2014'
      : `${point.windSpeedKmh.toFixed(0)} km/h${dir ? ` ${dir}` : ''}`;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Metric
        icon={<Droplets className="size-4" aria-hidden />}
        label="Tide"
        value={fmt(point.tideHeightM, ' m', 2)}
      />
      <Metric
        icon={<Wind className="size-4" aria-hidden />}
        label="Wind"
        value={windValue}
      />
      <Metric
        icon={<Waves className="size-4" aria-hidden />}
        label="Waves"
        value={fmt(point.waveHeightM, ' m', 1)}
      />
      <div className="rounded-lg border border-border/60 p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="text-primary">
            <Gauge className="size-4" aria-hidden />
          </span>
          <span className="text-caption uppercase">Score</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="font-display text-h3 tabular-nums">
            {point.score.toFixed(1)}
          </p>
          <Badge variant={gradeVariant(point.grade)}>{point.grade}</Badge>
        </div>
      </div>
    </div>
  );
}
