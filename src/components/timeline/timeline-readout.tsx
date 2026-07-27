'use client';

import {
  AlertTriangle,
  Waves,
  Wind,
  Droplets,
  Gauge,
  ShieldAlert,
} from 'lucide-react';
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

function safetyVariant(
  status: TimelinePoint['safety']['status']
): 'good' | 'moderate' | 'poor' | 'outline' {
  if (status === 'Safe') return 'good';
  if (status === 'Caution') return 'moderate';
  if (status === 'Dangerous') return 'poor';
  return 'outline';
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
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric
          icon={<Droplets className="size-4" aria-hidden />}
          label="Modelled tide"
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
            <span className="text-caption uppercase">Fishing quality</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-display text-h3 tabular-nums">
              {point.score.toFixed(1)}
            </p>
            <Badge variant={gradeVariant(point.grade)}>{point.grade}</Badge>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldAlert className="size-4 text-primary" aria-hidden />
            <span className="text-caption uppercase">Safety</span>
          </div>
          <div className="mt-2">
            <Badge variant={safetyVariant(point.safety.status)}>
              {point.safety.status}
            </Badge>
          </div>
          <p className="mt-1 text-caption text-muted-foreground">
            {point.integrity.confidence} ·{' '}
            {point.integrity.completenessPercentage}% complete
          </p>
        </div>
      </div>
      {point.safety.criticalWarnings.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-condition-poor/30 bg-condition-poor/5 p-3 text-sm text-condition-poor">
          {point.safety.criticalWarnings.map((warning) => (
            <li key={warning.code} className="flex gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {warning.message}
            </li>
          ))}
        </ul>
      ) : null}
      {point.safety.warnings.some(
        (warning) => warning.severity === 'warning'
      ) ? (
        <ul className="space-y-1 rounded-lg border border-condition-moderate/30 bg-condition-moderate/5 p-3 text-sm text-condition-moderate">
          {point.safety.warnings
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
      {point.integrity.missingCriticalInputs.length > 0 ? (
        <p className="rounded-lg border border-condition-moderate/30 bg-condition-moderate/5 p-3 text-sm text-condition-moderate">
          Missing critical inputs:{' '}
          {point.integrity.missingCriticalInputs.join(', ')}.
        </p>
      ) : null}
    </div>
  );
}
