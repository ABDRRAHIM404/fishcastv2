'use client';

import { Badge } from '@/components/ui/badge';
import { WINDOW_BADGE } from '@/components/timeline/window-colors';
import type { FishingWindow } from '@/lib/timeline/types';

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Ranked list of the day's best fishing windows (Poor windows omitted). Answers
 * "when should I fish today?" Display only.
 */
export function BestWindows({ windows }: { windows: FishingWindow[] }) {
  const ranked = windows.filter((w) => w.label !== 'Poor');

  if (ranked.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
        No favorable fishing windows for this day.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {ranked.map((w, i) => (
        <li
          key={`${w.start}-${i}`}
          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Badge variant={WINDOW_BADGE[w.label]}>{w.label}</Badge>
            <span className="tabular-nums">
              {time(w.start)} {'–'} {time(w.end)}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            Peak {w.peakScore.toFixed(1)} at {time(w.peakTime)}
          </span>
        </li>
      ))}
    </ul>
  );
}
