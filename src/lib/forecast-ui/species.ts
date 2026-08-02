import type { ForecastPeriod } from '@/lib/forecast-ui/types';
import type { Species, SpotSpecies } from '@/types/species';

const PREVALENCE_RANK = {
  common: 3,
  occasional: 2,
  rare: 1,
} as const;

function timeBucket(period: ForecastPeriod): string | null {
  if (period.markers.sunrise) return 'dawn';
  if (period.markers.sunset) return 'dusk';
  if (period.environment.daylightState === 'night') return 'night';
  if (period.environment.daylightState === 'daylight') return 'midday';
  return null;
}

/**
 * Chooses only from species explicitly linked to the spot and in season.
 * Preferred-condition constraints are never invented: configured constraints
 * must all be satisfied, while unconstrained species rank below a match.
 */
export function bestSpeciesForPeriod(
  period: ForecastPeriod,
  linked: SpotSpecies[],
  catalog: Species[]
): string | null {
  const month = Number(period.date.slice(5, 7));
  const catalogById = new Map(catalog.map((species) => [species.id, species]));
  const candidates = linked
    .filter(
      (species) =>
        species.seasonMonths.includes(month)
    )
    .map((species) => {
      const preferences = catalogById.get(species.id)?.preferredConditions;
      const results: boolean[] = [];
      if (preferences?.tide_state) {
        const desired = preferences.tide_state.toLowerCase();
        results.push(
          desired === period.tide.trend ||
            desired === period.tide.nextExtremeState
        );
      }
      if (typeof preferences?.wind_max_kmh === 'number') {
        results.push(
          period.wind.speedKmh !== null &&
            period.wind.speedKmh <= preferences.wind_max_kmh
        );
      }
      if (typeof preferences?.wave_max_m === 'number') {
        results.push(
          period.waves.heightM !== null &&
            period.waves.heightM <= preferences.wave_max_m
        );
      }
      if (preferences?.time_of_day?.length) {
        const bucket = timeBucket(period);
        results.push(
          bucket !== null &&
            preferences.time_of_day
              .map((value) => value.toLowerCase())
              .includes(bucket)
        );
      }
      return {
        species,
        constrained: results.length > 0,
        matches: results.length === 0 || results.every(Boolean),
      };
    })
    .filter((candidate) => candidate.matches)
    .sort((first, second) => {
      if (first.constrained !== second.constrained) {
        return first.constrained ? -1 : 1;
      }
      const firstRank = first.species.prevalence
        ? PREVALENCE_RANK[first.species.prevalence]
        : 0;
      const secondRank = second.species.prevalence
        ? PREVALENCE_RANK[second.species.prevalence]
        : 0;
      if (firstRank !== secondRank) return secondRank - firstRank;
      return first.species.commonName.localeCompare(second.species.commonName);
    });

  return candidates[0]?.species.commonName ?? null;
}
