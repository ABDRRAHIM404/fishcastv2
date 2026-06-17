'use client';

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import type { FishingWindow, TimelinePoint } from '@/lib/timeline/types';
import { WINDOW_FILL } from '@/components/timeline/window-colors';

interface ChartDatum {
  ms: number;
  hour: number;
  tide: number | null;
  wind: number | null;
  wave: number | null;
  score: number;
}

function toData(points: TimelinePoint[]): ChartDatum[] {
  const now = points.length > 0 ? new Date(points[0]!.time) : new Date();

  return points.map((p) => {
    const d = new Date(p.time);
    const offsetHours = (d.getTime() - now.getTime()) / 3600_000;

    return {
      ms: d.getTime(),
      hour: offsetHours,
      tide: p.tideHeightM,
      wind: p.windSpeedKmh,
      wave: p.waveHeightM,
      score: p.score,
    };
  });
}

const hourTicks = [0, 6, 12, 18, 24, 30, 36, 42, 48];
const fmtHour = (h: number) => `${String(Math.round(h)).padStart(2, '0')}h`;

/** Window highlight overlays shared by every chart. */
function WindowAreas({ windows, points }: { windows: FishingWindow[]; points: TimelinePoint[] }) {
  const now = points.length > 0 ? new Date(points[0]!.time) : new Date();

  return (
    <>
      {windows
        .filter((w) => w.label !== 'Poor')
        .map((w, i) => {
          const start = new Date(w.start);
          const end = new Date(w.end);
          const startOffset = (start.getTime() - now.getTime()) / 3600_000;
          const endOffset = (end.getTime() - now.getTime()) / 3600_000;
          return (
            <ReferenceArea
              key={`${w.start}-${i}`}
              x1={startOffset}
              x2={endOffset}
              fill={WINDOW_FILL[w.label]}
              stroke="none"
            />
          );
        })}
    </>
  );
}

function ChartFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactElement;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <h4 className="text-caption uppercase text-muted-foreground">{title}</h4>
      <div className="mt-2 h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const axisProps = {
  type: 'number' as const,
  domain: [0, 48] as [number, number],
  ticks: hourTicks,
  tickFormatter: fmtHour,
  dataKey: 'hour',
  tick: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
  stroke: 'hsl(var(--border))',
};

/**
 * Synced Recharts visualizations for the timeline: tide area, wind line, wave
 * line, and fishing-score line. Best fishing windows are highlighted on every
 * chart, and a reference line marks the scrubbed time.
 */
export function TimelineCharts({
  points,
  windows,
  activeHour,
}: {
  points: TimelinePoint[];
  windows: FishingWindow[];
  activeHour: number;
}) {
  const data = toData(points);
  const cursor = (
    <ReferenceLine x={activeHour} stroke="hsl(var(--primary))" strokeWidth={1.5} />
  );

  const separator = (
    <ReferenceLine
      x={24}
      stroke="hsl(var(--border))"
      strokeDasharray="4 4"
      opacity={0.6}
    />
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ChartFrame title="Tide (m)">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <WindowAreas windows={windows} points={points} />
          <XAxis {...axisProps} />
          {separator}
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            width={40}
          />
          <Area
            type="monotone"
            dataKey="tide"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#tideFill)"
            isAnimationActive={false}
            connectNulls
          />
          {cursor}
        </AreaChart>
      </ChartFrame>

      <ChartFrame title="Fishing score (0-10)">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <WindowAreas windows={windows} points={points} />
          <XAxis {...axisProps} />
          {separator}
          <YAxis
            domain={[0, 10]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            width={40}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--condition-good))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {cursor}
        </LineChart>
      </ChartFrame>

      <ChartFrame title="Wind (km/h)">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <WindowAreas windows={windows} points={points} />
          <XAxis {...axisProps} />
          {separator}
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            width={40}
          />
          <Line
            type="monotone"
            dataKey="wind"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          {cursor}
        </LineChart>
      </ChartFrame>

      <ChartFrame title="Wave height (m)">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <WindowAreas windows={windows} points={points} />
          <XAxis {...axisProps} />
          {separator}
          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            width={40}
          />
          <Line
            type="monotone"
            dataKey="wave"
            stroke="hsl(var(--accent, var(--primary)))"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          {cursor}
        </LineChart>
      </ChartFrame>
    </div>
  );
}