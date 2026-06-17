'use client';

import { Badge } from '@/components/ui/badge';
import { WINDOW_BADGE } from '@/components/timeline/window-colors';
import type { DailyFishingWindows, FishingWindow } from '@/lib/timeline/types';
import { formatDaySectionLabel, formatWindowLabel } from '@/lib/timeline/format';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderWindow(window: FishingWindow, index: number) {
  return (
    <li
      key={`${window.start}-${index}`}
      className="flex flex-col gap-3 rounded-lg border border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <Badge variant={WINDOW_BADGE[window.label]}>{window.label}</Badge>
        <span className="tabular-nums font-medium">
          {formatWindowLabel(window.start, window.end)}
        </span>
      </div>
      <span className="text-sm text-muted-foreground">
        Peak {window.peakScore.toFixed(1)} at {formatTime(window.peakTime)}
      </span>
    </li>
  );
}

export function DailyWindows({ dailyWindows }: { dailyWindows: DailyFishingWindows[] }) {
  if (dailyWindows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
        No favorable fishing windows available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dailyWindows.map((day) => {
        const ranked = day.windows.filter((w) => w.label !== 'Poor');
        return (
          <div key={day.date} className="rounded-3xl border border-border/60 bg-background/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Best windows for
                </p>
                <p className="text-base font-semibold">{formatDaySectionLabel(day.date)}</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/70">
                {day.date}
              </span>
            </div>
            {ranked.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                No favorable fishing windows for this day.
              </div>
            ) : (
              <ul className="space-y-2">{ranked.map(renderWindow)}</ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
