'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Fish,
  Gauge,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';
import { AiRecommendationCard } from '@/components/ai/ai-recommendation-card';
import { ForecastExperience } from '@/components/forecast/forecast-experience';
import { PageTransition } from '@/components/shared/motion';
import { SpeciesSection, type SpeciesFlags } from '@/components/species/species-section';
import { SpotGuide } from '@/components/spot/spot-guide';
import { SpotHero } from '@/components/spot/spot-hero';
import { Button } from '@/components/ui/button';
import type { ForecastInterval, ForecastScope, ForecastView } from '@/lib/forecast-ui/types';
import { publicSpotName } from '@/lib/forecast-ui/spots';
import type { SpotPhoto } from '@/lib/spots/photos';
import {
  spotPageSectionOrDefault,
  type ForecastNavigationIntent,
  type SpotPageSection,
} from '@/lib/spot-page/state';
import type { SpotSpecies } from '@/types/species';
import type { Spot } from '@/types/spot';
import { useI18n } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/types';

const SECTION_ITEMS: Array<{
  id: SpotPageSection;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', labelKey: 'spot.overview', icon: LayoutDashboard },
  { id: 'forecast', labelKey: 'spot.forecast', icon: CalendarDays },
  { id: 'conditions', labelKey: 'spot.conditions', icon: Gauge },
  { id: 'species', labelKey: 'spot.species', icon: Fish },
  { id: 'guide', labelKey: 'spot.guide', icon: BookOpen },
];

interface Props {
  spot: Spot;
  photos: SpotPhoto[];
  species: SpotSpecies[];
  speciesFlags: Record<string, SpeciesFlags>;
  initialSection: SpotPageSection;
  initialDate: string;
  initialInterval: ForecastInterval;
  initialView: ForecastView;
  initialScope: ForecastScope;
  spots: Array<{ slug: string; displayName: string }>;
}

export function SpotPageExperience({
  spot,
  photos,
  species,
  speciesFlags,
  initialSection,
  initialDate,
  initialInterval,
  initialView,
  initialScope,
  spots,
}: Props) {
  const { direction, t } = useI18n();
  const [section, setSection] = useState(initialSection);
  const [forecastIntent, setForecastIntent] =
    useState<ForecastNavigationIntent>({ token: 0 });
  const [aiOpen, setAiOpen] = useState(false);
  const [pendingSpot, setPendingSpot] = useState<{
    slug: string;
    displayName: string;
  } | null>(null);
  const displaySpot = {
    ...spot,
    name: publicSpotName(spot.slug, spot.name),
  };

  useEffect(() => setPendingSpot(null), [spot.slug]);

  useEffect(() => {
    const syncFromUrl = () => {
      const search = new URLSearchParams(window.location.search);
      const rawSection = search.get('section');
      const normalized = spotPageSectionOrDefault(rawSection);
      setSection(normalized);
      if (rawSection && normalized === 'overview' && rawSection !== 'overview') {
        const url = new URL(window.location.href);
        url.searchParams.delete('section');
        window.history.replaceState(null, '', url);
      }
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  function navigateSection(
    next: SpotPageSection,
    options?: { view?: ForecastView; comparison?: boolean }
  ) {
    setSection(next);
    const url = new URL(window.location.href);
    if (next === 'overview') url.searchParams.delete('section');
    else url.searchParams.set('section', next);
    if (options?.view) url.searchParams.set('view', options.view);
    window.history.replaceState(null, '', url);
    if (next === 'forecast') {
      setForecastIntent((current) => ({
        token: current.token + 1,
        view: options?.view,
        comparison: options?.comparison,
      }));
    }
    window.setTimeout(() => {
      document.getElementById('spot-section-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }

  function handleTabKey(
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number
  ) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex =
        (currentIndex + (direction === 'rtl' ? -1 : 1) + SECTION_ITEMS.length) %
        SECTION_ITEMS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex =
        (currentIndex + (direction === 'rtl' ? 1 : -1) + SECTION_ITEMS.length) %
        SECTION_ITEMS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = SECTION_ITEMS.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const next = SECTION_ITEMS[nextIndex]!;
    navigateSection(next.id);
    document.getElementById(`spot-tab-${next.id}`)?.focus();
  }

  const forecastMode =
    section === 'overview' || section === 'forecast' || section === 'conditions'
      ? section
      : 'inactive';

  return (
    <PageTransition className="min-w-0 space-y-4 sm:space-y-6">
      <SpotHero spot={displaySpot} pendingSpotName={pendingSpot?.displayName} />

      <nav
        id="spot-section-navigation"
        className="sticky top-16 z-30 -mx-4 overflow-x-auto border-y border-border/70 bg-background/95 px-4 py-2 backdrop-blur-md md:top-0 md:mx-0 md:rounded-xl md:border"
        aria-label={t('spot.sections')}
      >
        <div className="flex min-w-max gap-1" role="tablist">
          {SECTION_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <Button
                key={item.id}
                id={`spot-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="spot-section-panel"
                onClick={() => navigateSection(item.id)}
                onKeyDown={(event) => handleTabKey(event, index)}
                size="sm"
                variant={active ? 'controlActive' : 'control'}
                className="shrink-0"
              >
                <Icon className="size-4" aria-hidden />
                {t(item.labelKey)}
              </Button>
            );
          })}
        </div>
      </nav>

      <section
        id="spot-section-panel"
        role="tabpanel"
        aria-label={t(SECTION_ITEMS.find((item) => item.id === section)?.labelKey ?? 'spot.overview')}
        className="min-w-0 scroll-mt-32 md:scroll-mt-20"
      >
        <ForecastExperience
          mode={forecastMode}
          spotSlug={spot.slug}
          initialDate={initialDate}
          initialInterval={initialInterval}
          initialView={initialView}
          initialScope={initialScope}
          spots={spots}
          navigationIntent={forecastIntent}
          onNavigate={(next, options) => navigateSection(next, options)}
          onSpotSwitchStart={setPendingSpot}
        />

        <div hidden={section !== 'overview'} className="mt-5">
          <div className="rounded-xl border border-border/70 bg-card/40 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="flex items-center gap-2"><Sparkles className="size-5 text-primary" aria-hidden /><h2 className="font-display text-h3">{t('ai.optionalTitle')}</h2></div><p className="mt-1 text-sm text-muted-foreground">{t('ai.optionalDescription')}</p></div>
              <Button type="button" variant={aiOpen ? 'controlActive' : 'control'} onClick={() => setAiOpen((value) => !value)} aria-expanded={aiOpen}>{aiOpen ? t('ai.hide') : t('ai.load')}</Button>
            </div>
          </div>
          {aiOpen ? <div className="mt-3"><AiRecommendationCard spotId={spot.id} /></div> : null}
        </div>

        <div hidden={section !== 'species'}>
          <SpeciesSection species={species} flags={speciesFlags} />
        </div>

        <div hidden={section !== 'guide'}>
          <SpotGuide spot={spot} photos={photos} />
        </div>
      </section>
    </PageTransition>
  );
}
