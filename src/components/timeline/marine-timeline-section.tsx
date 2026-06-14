'use client';

import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { PremiumCard } from '@/components/spot/premium-card';
import { Skeleton } from '@/components/ui/skeleton';
import { TimelineScrubber } from '@/components/timeline/timeline-scrubber';
import { TimelineReadout } from '@/components/timeline/timeline-readout';
import { TimelineCharts } from '@/components/timeline/timeline-charts';
import { BestWindows } from '@/components/timeline/best-windows';
import { useTimeline } from '@/hooks/use-timeline';

function nearestNowIndex(times: string[]): number {
  const now = Date.now();
  let best = 0;
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (t === undefined) continue;
    if (
      Math.abs(new Date(t).getTime() - now) <
      Math.abs(new Date(times[best]!).getTime() - now)
    ) {
      best = i;
    }
  }
  return best;
}

/**
 * Flagship Marine Timeline for the spot details page: a touch-friendly scrubber
 * driving a live readout (tide/wind/wave/score), synced Recharts charts, and the
 * day's ranked best fishing windows. Answers "when should I fish today?".
 */
export function MarineTimelineSection({ spotId }: { spotId: string }) {
  const { state } = useTimeline(spotId);
  const [index, setIndex] = useState<number | null>(null);

  const points = state.status === 'ready' ? state.data.points : [];
  const defaultIndex = useMemo(
    () => (points.length ? nearestNowIndex(points.map((p) => p.time)) : 0),
    [points]
  );
  const activeIndex = index ?? defaultIndex;
  const activePoint = points[activeIndex] ?? points[0] ?? null;

  return (
    <PremiumCard className="p-6">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-5 text-primary" aria-hidden />
        <h2 className="font-display text-h3">Marine timeline</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Scrub through the day to see when conditions are best.
      </p>

      {state.status === 'loading' ? (
        <div className="mt-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        </div>
      ) : state.status === 'error' || !activePoint ? (
        <p className="mt-4 text-sm text-muted-foreground">
          The marine timeline is unavailable right now.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          <TimelineScrubber
            count={points.length}
            index={activeIndex}
            onIndexChange={setIndex}
            timeLabel={new Date(activePoint.time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          />

          <TimelineReadout point={activePoint} />

          <TimelineCharts
            points={points}
            windows={state.data.windows}
            activeHour={
              new Date(activePoint.time).getHours() +
              new Date(activePoint.time).getMinutes() / 60
            }
          />

          <div>
            <h3 className="font-display text-h3">Best fishing windows</h3>
            <div className="mt-3">
              <BestWindows windows={state.data.windows} />
            </div>
          </div>
        </div>
      )}
    </PremiumCard>
  );
}
