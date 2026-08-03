import { PageTransition, StaggerGroup, StaggerItem } from '@/components/shared/motion';
import { SpotListCard } from '@/components/spot/spot-list-card';
import { getActiveSpots } from '@/lib/spots/queries';
import type { Metadata } from 'next';
import { createTranslator } from '@/i18n/dictionaries';
import { getRequestLocale, getServerDictionary } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = createTranslator(await getRequestLocale());
  const title = t('metadata.spotsTitle');
  const description = t('metadata.spotsDescription');
  return { title, description, openGraph: { title, description } };
}

export default async function SpotsPage() {
  const spots = await getActiveSpots();
  const { messages } = await getServerDictionary();

  return (
    <PageTransition className="space-y-5">
      <div>
        <h1 className="font-display text-h1">{messages['spots.title']}</h1>
        <p className="text-muted-foreground">
          {messages['spots.description']}
        </p>
      </div>

      {spots.length === 0 ? (
        <p className="text-muted-foreground">{messages['spots.empty']}</p>
      ) : (
        <StaggerGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {spots.map((spot) => (
            <StaggerItem key={spot.id}>
              <SpotListCard spot={spot} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </PageTransition>
  );
}
