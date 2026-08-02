import type { ForecastSpotIdentity } from '@/lib/forecast-ui/types';
import type { Spot } from '@/types/spot';

/** Repository rows call this spot Massa; the public product name is Am9erss. */
export function publicSpotName(slug: string, name: string): string {
  return slug === 'massa' || slug === 'am9erss' ? 'Am9erss' : name;
}

export function toForecastSpotIdentity(spot: Spot): ForecastSpotIdentity {
  return {
    id: spot.id,
    slug: spot.slug,
    name: spot.name,
    displayName: publicSpotName(spot.slug, spot.name),
  };
}

