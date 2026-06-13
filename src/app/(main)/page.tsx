import { PageTransition, StaggerGroup, StaggerItem } from '@/components/shared/motion';
import { SpotCard } from '@/components/spot/spot-card';
import { PremiumCard } from '@/components/spot/premium-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/config/site';
import type { SpotPreview } from '@/types';

// Phase 1: static placeholder data to demonstrate the design system only.
const sampleSpots: SpotPreview[] = [
  {
    id: '1',
    name: "Sidi R'bat",
    type: 'beach',
    difficulty: 'beginner',
    imageUrl:
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&q=70',
  },
  {
    id: '2',
    name: 'Tifnit',
    type: 'rocks',
    difficulty: 'advanced',
    imageUrl:
      'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=1200&q=70',
  },
  {
    id: '3',
    name: 'Aglou',
    type: 'beach',
    difficulty: 'intermediate',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=70',
  },
];

export default function HomePage() {
  return (
    <PageTransition className="space-y-12">
      <section className="bg-ocean-radial -mx-5 rounded-2xl px-5 py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="good" className="mb-4">
            {siteConfig.region}
          </Badge>
          <h1 className="text-balance font-display text-display sm:text-display-lg">
            {siteConfig.tagline}
          </h1>
          <p className="mt-4 text-balance text-body-lg text-muted-foreground">
            {siteConfig.description}
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg">Explore the map</Button>
            <Button size="lg" variant="outline">
              Browse spots
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-h1">Featured spots</h2>
          <span className="text-sm text-muted-foreground">Preview · placeholder data</span>
        </div>
        <StaggerGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sampleSpots.map((spot) => (
            <StaggerItem key={spot.id}>
              <SpotCard spot={spot} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-h1">Design system</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <PremiumCard className="p-6">
            <h3 className="font-display text-h3">Typography</h3>
            <div className="mt-4 space-y-2">
              <p className="font-display text-display">Display</p>
              <p className="text-h2">Heading 2</p>
              <p className="text-body-lg">Body large for readable prose.</p>
              <p className="text-caption text-muted-foreground">CAPTION / META</p>
            </div>
          </PremiumCard>
          <PremiumCard className="p-6">
            <h3 className="font-display text-h3">Condition tokens</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="excellent">Excellent</Badge>
              <Badge variant="good">Good</Badge>
              <Badge variant="moderate">Moderate</Badge>
              <Badge variant="poor">Poor</Badge>
            </div>
          </PremiumCard>
        </div>
      </section>
    </PageTransition>
  );
}
