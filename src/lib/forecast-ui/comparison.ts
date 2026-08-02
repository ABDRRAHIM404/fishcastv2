import type {
  ForecastComparisonItem,
  ForecastPeriod,
} from '@/lib/forecast-ui/types';

function safetySortRank(status: ForecastPeriod['safety']['status']): number {
  if (status === 'Safe') return 0;
  if (status === 'Caution') return 1;
  if (status === 'Unknown') return 2;
  return 3;
}

/** Safer spots rank first; fishing quality and completeness break safe ties. */
export function sortComparisonItems(
  items: ForecastComparisonItem[]
): ForecastComparisonItem[] {
  return [...items].sort((first, second) => {
    const safetyDifference =
      safetySortRank(first.safety.status) - safetySortRank(second.safety.status);
    if (safetyDifference !== 0) return safetyDifference;
    if (first.fishing.score !== second.fishing.score) {
      return second.fishing.score - first.fishing.score;
    }
    return (
      second.confidence.completenessPercentage -
      first.confidence.completenessPercentage
    );
  });
}

