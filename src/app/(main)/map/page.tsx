import { PageTransition } from '@/components/shared/motion';
import { LazyFishingMap } from '@/components/map/lazy-fishing-map';
import { getActiveSpots } from '@/lib/spots/queries';
import type { Metadata } from 'next';
import { createTranslator } from '@/i18n/dictionaries';
import { getRequestLocale, getServerDictionary } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = createTranslator(await getRequestLocale());
  const title = t('metadata.mapTitle');
  const description = t('metadata.mapDescription');
  return { title, description, openGraph: { title, description } };
}

// Server component: fetch spots, then hand them to the client map.
export default async function MapPage() {
  const spots = await getActiveSpots();
  const { messages } = await getServerDictionary();
  if (!spots?.length) {
    console.error(
      'MapPage: getActiveSpots returned no active spots. The map may render blank.'
    );
  }

  return (
    <PageTransition className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-h1">{messages['map.title']}</h1>
          <p className="text-muted-foreground">
            {messages['map.description']}
          </p>
        </div>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {messages['map.spotCount']({ count: spots.length })}
        </span>
      </div>

      <LazyFishingMap spots={spots} />
    </PageTransition>
  );
}
