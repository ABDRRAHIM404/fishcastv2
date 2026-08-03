import { PageTransition } from '@/components/shared/motion';
import { SpeciesCatalog } from '@/components/species/species-catalog';
import { getSpeciesCatalog } from '@/lib/species/queries';
import type { Metadata } from 'next';
import { createTranslator } from '@/i18n/dictionaries';
import { getRequestLocale, getServerDictionary } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = createTranslator(await getRequestLocale());
  const title = t('metadata.speciesTitle');
  const description = t('metadata.speciesDescription');
  return { title, description, openGraph: { title, description } };
}

// Regional species catalog for Souss-Massa.
export default async function SpeciesPage() {
  const species = await getSpeciesCatalog();
  const { messages } = await getServerDictionary();

  return (
    <PageTransition className="space-y-5">
      <div>
        <h1 className="font-display text-h1">{messages['species.title']}</h1>
        <p className="text-muted-foreground">
          {messages['species.pageDescription']}
        </p>
      </div>

      {species.length === 0 ? (
        <p className="text-muted-foreground">
          {messages['species.catalogUnavailable']}
        </p>
      ) : (
        <SpeciesCatalog species={species} />
      )}
    </PageTransition>
  );
}
