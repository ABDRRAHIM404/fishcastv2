import { PageTransition } from '@/components/shared/motion';
import { SpeciesCatalog } from '@/components/species/species-catalog';
import { getSpeciesCatalog } from '@/lib/species/queries';

const speciesDescription =
  'Browse the coastal fish species of the Souss-Massa region, with seasonality and the conditions that favor each.';

export const metadata = {
  title: 'Species',
  description: speciesDescription,
  openGraph: { title: 'Species', description: speciesDescription },
};

// Regional species catalog for Souss-Massa.
export default async function SpeciesPage() {
  const species = await getSpeciesCatalog();

  return (
    <PageTransition className="space-y-5">
      <div>
        <h1 className="font-display text-h1">Species</h1>
        <p className="text-muted-foreground">
          Coastal species found across the Souss-Massa region.
        </p>
      </div>

      {species.length === 0 ? (
        <p className="text-muted-foreground">
          The species catalog is not available yet.
        </p>
      ) : (
        <SpeciesCatalog species={species} />
      )}
    </PageTransition>
  );
}
