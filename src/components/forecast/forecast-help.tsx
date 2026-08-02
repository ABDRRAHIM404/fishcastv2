import { CircleHelp } from 'lucide-react';
import { FORECAST_HELP } from '@/lib/forecast-ui/labels';

export function ForecastHelp({ helpKey }: { helpKey: string }) {
  const text = FORECAST_HELP[helpKey];
  if (!text) return null;
  return (
    <span
      tabIndex={0}
      role="note"
      aria-label={text}
      title={text}
      className="inline-flex cursor-help text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CircleHelp className="size-3.5" aria-hidden />
    </span>
  );
}

