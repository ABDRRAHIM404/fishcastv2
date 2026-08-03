import { CalendarDays } from 'lucide-react';
import { PageTransition, StaggerGroup, StaggerItem } from '@/components/shared/motion';
import { SpotListCard } from '@/components/spot/spot-list-card';
import { getActiveSpots } from '@/lib/spots/queries';
import type { Metadata } from 'next';
import { createTranslator } from '@/i18n/dictionaries';
import { getRequestLocale, getServerDictionary } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = createTranslator(await getRequestLocale());
  return { title: t('metadata.forecastTitle'), description: t('metadata.forecastDescription') };
}

export default async function ForecastPage() {
  const spots = await getActiveSpots();
  const { messages } = await getServerDictionary();
  return (
    <PageTransition className="space-y-6">
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-primary">
          <CalendarDays className="size-5" aria-hidden />
          <span className="text-sm font-medium uppercase tracking-[0.18em]">{messages['forecastChooser.eyebrow']}</span>
        </div>
        <h1 className="mt-2 font-display text-h1">{messages['forecastChooser.title']}</h1>
        <p className="mt-2 text-base text-muted-foreground">
          {messages['forecastChooser.description']}
        </p>
      </div>
      {spots.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-muted-foreground">{messages['forecastChooser.empty']}</p>
      ) : (
        <StaggerGroup className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {spots.map((spot) => (
            <StaggerItem key={spot.id}>
              <SpotListCard spot={spot} href={`/spots/${spot.slug}?section=forecast`} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}
    </PageTransition>
  );
}
