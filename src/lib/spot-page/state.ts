import type { ForecastView } from '@/lib/forecast-ui/types';

export type SpotPageSection =
  | 'overview'
  | 'forecast'
  | 'conditions'
  | 'species'
  | 'guide';

export const SPOT_PAGE_SECTIONS: readonly SpotPageSection[] = [
  'overview',
  'forecast',
  'conditions',
  'species',
  'guide',
] as const;

export function isSpotPageSection(
  value: string | null | undefined
): value is SpotPageSection {
  return (
    typeof value === 'string' &&
    SPOT_PAGE_SECTIONS.includes(value as SpotPageSection)
  );
}

export function spotPageSectionOrDefault(
  value: string | null | undefined
): SpotPageSection {
  return isSpotPageSection(value) ? value : 'overview';
}

export interface ForecastNavigationIntent {
  token: number;
  view?: ForecastView;
  comparison?: boolean;
}

