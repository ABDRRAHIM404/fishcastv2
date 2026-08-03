import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { SpeciesFlags } from '@/components/species/species-section';
import { SpotPageExperience } from '@/components/spot/spot-page-experience';
import { getActiveSpots, getSpotBySlug } from '@/lib/spots/queries';
import { getSpotPhotos } from '@/lib/spots/photos';
import { getSpotSpecies, getSpeciesCatalog } from '@/lib/species/queries';
import { getMarineConditionsForSpot } from '@/lib/marine/service';
import { evaluateSuitability } from '@/lib/species/suitability';
import { isInSeason } from '@/types/species';
import { summarizePreferredConditions } from '@/types/species';
import { productMonth, todayProductDate } from '@/lib/time/casablanca';
import {
  FORECAST_UI_DEFAULTS,
  dateInForecastRange,
  isForecastInterval,
  isForecastScope,
  isForecastView,
} from '@/lib/forecast-ui/query';
import { publicSpotName } from '@/lib/forecast-ui/spots';
import { spotPageSectionOrDefault } from '@/lib/spot-page/state';

// The dynamic segment is the spot slug (route folder name kept as [id]).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const spot = await getSpotBySlug(id);
  if (!spot) return { title: 'Spot' };
  const displayName = publicSpotName(spot.slug, spot.name);

  const regionLine = [spot.region, spot.province]
    .filter(Boolean)
    .join(' · ');
  const description =
    spot.description ??
    `Live marine conditions, fishing score, best windows and target species for ${displayName}${
      regionLine ? ` (${regionLine})` : ''
    }.`;

  return {
    title: displayName,
    description,
    openGraph: {
      title: displayName,
      description,
      type: 'article',
      images: spot.imageUrl ? [{ url: spot.imageUrl }] : undefined,
    },
  };
}

export default async function SpotDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const spot = await getSpotBySlug(id);
  if (!spot) notFound();
  const today = todayProductDate();
  const queryDate = typeof query.date === 'string' ? query.date : null;
  const queryInterval =
    typeof query.interval === 'string' ? query.interval : null;
  const queryView = typeof query.view === 'string' ? query.view : null;
  const queryScope = typeof query.scope === 'string' ? query.scope : null;
  const initialSection = spotPageSectionOrDefault(
    typeof query.section === 'string' ? query.section : null
  );
  const initialDate =
    queryDate && dateInForecastRange(queryDate, today) ? queryDate : today;
  const initialInterval = isForecastInterval(queryInterval)
    ? queryInterval
    : FORECAST_UI_DEFAULTS.interval;
  const initialView = isForecastView(queryView)
    ? queryView
    : FORECAST_UI_DEFAULTS.view;
  const initialScope = isForecastScope(queryScope)
    ? queryScope
    : FORECAST_UI_DEFAULTS.scope;

  // Fetch presentation data in parallel. Species/photos are read-only here.
  const [photos, species, catalog, marine, allSpots] = await Promise.all([
    getSpotPhotos(spot.id),
    getSpotSpecies(spot.id),
    getSpeciesCatalog(),
    // Resilient: if marine data fails, flags simply default to not-favored.
    getMarineConditionsForSpot({
      id: spot.id,
      latitude: spot.latitude,
      longitude: spot.longitude,
    }).catch(() => null),
    getActiveSpots(),
  ]);

  // Per-species presentation flags: "in season" (current month) and
  // "favored now" (pure suitability engine against current conditions).
  const currentMonth = productMonth();
  const preferredById = new Map(
    catalog.map((c) => [c.id, c.preferredConditions])
  );
  const speciesFlags: Record<string, SpeciesFlags> = {};
  for (const s of species) {
    const inSeason = isInSeason(s.seasonMonths, currentMonth);
    let favored = false;
    let favoredReason: string | null = null;
    if (marine) {
      const pc = preferredById.get(s.id) ?? null;
      const result = evaluateSuitability(pc, marine);
      favored = result.favored;
      favoredReason = result.reason;
    }
    speciesFlags[s.id] = {
      inSeason,
      favored,
      favoredReason,
      preferredSummary: summarizePreferredConditions(
        preferredById.get(s.id) ?? null
      ),
    };
  }

  return (
    <SpotPageExperience
      spot={spot}
      photos={photos}
      species={species}
      speciesFlags={speciesFlags}
      initialSection={initialSection}
      initialDate={initialDate}
      initialInterval={initialInterval}
      initialView={initialView}
      initialScope={initialScope}
      spots={allSpots.map((item) => ({
        slug: item.slug,
        displayName: publicSpotName(item.slug, item.name),
      }))}
    />
  );
}
