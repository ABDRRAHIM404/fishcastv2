'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpDown,
  CloudSun,
  Fish,
  ImageIcon,
  MapPin,
  ShieldCheck,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { difficultyLabel, spotTypeLabel } from '@/i18n/presentation';
import type { TranslationKey } from '@/i18n/types';
import { publicSpotName } from '@/lib/forecast-ui/spots';
import { HOME_CTA_ROUTES } from '@/lib/homepage/story';
import { cn } from '@/lib/utils';
import { DIFFICULTY_BADGE_VARIANT, type Spot } from '@/types/spot';
import styles from './homepage.module.css';

interface Capability {
  title: TranslationKey;
  description: TranslationKey;
  icon: LucideIcon;
}

const CAPABILITIES: readonly Capability[] = [
  {
    title: 'home.capability.wind',
    description: 'home.capability.windDescription',
    icon: Wind,
  },
  {
    title: 'home.capability.waves',
    description: 'home.capability.wavesDescription',
    icon: Waves,
  },
  {
    title: 'home.capability.tide',
    description: 'home.capability.tideDescription',
    icon: ArrowUpDown,
  },
  {
    title: 'home.capability.weather',
    description: 'home.capability.weatherDescription',
    icon: CloudSun,
  },
  {
    title: 'home.capability.fishing',
    description: 'home.capability.fishingDescription',
    icon: Fish,
  },
  {
    title: 'home.capability.safety',
    description: 'home.capability.safetyDescription',
    icon: ShieldCheck,
  },
] as const;

function FeaturedSpotCard({ spot }: { spot: Spot }) {
  const { t } = useI18n();
  const [imageFailed, setImageFailed] = useState(false);
  const displayName = publicSpotName(spot.slug, spot.name);

  return (
    <article className={styles.featuredCard}>
      <Link
        href={`/spots/${spot.slug}`}
        aria-label={t('home.featured.viewSpot', { spot: displayName })}
      >
        <div className={styles.featuredImage}>
          <ImageIcon className={styles.imageFallback} aria-hidden="true" />
          {spot.imageUrl && !imageFailed ? (
            <Image
              src={spot.imageUrl}
              alt={displayName}
              fill
              sizes="(max-width: 767px) 84vw, (max-width: 1199px) 45vw, 28vw"
              className="object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : null}
          <div className={styles.imageShade} />
          <div className={styles.featuredBadges}>
            <Badge variant="secondary">{spotTypeLabel(t, spot.spotType)}</Badge>
            <Badge variant={DIFFICULTY_BADGE_VARIANT[spot.difficultyLevel]}>
              {difficultyLabel(t, spot.difficultyLevel)}
            </Badge>
          </div>
        </div>
        <div className={styles.featuredContent}>
          <div>
            <h3>{displayName}</h3>
            <p>
              <MapPin aria-hidden="true" />
              {spot.region ?? spot.province ?? t('site.region')}
            </p>
          </div>
          <ArrowRight className={styles.inlineArrow} aria-hidden="true" />
        </div>
      </Link>
    </article>
  );
}

export function HomepageStandardContent({ spots }: { spots: readonly Spot[] }) {
  const { t } = useI18n();
  const featuredSpots = spots.slice(0, 3);

  return (
    <div className={styles.standardContent}>
      <section className={styles.contentSection} aria-labelledby="featured-spots-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>{t('home.featured.eyebrow')}</p>
          <h2 id="featured-spots-title">{t('home.featured.title')}</h2>
          <p>{t('home.featured.description')}</p>
        </div>
        {featuredSpots.length ? (
          <div className={styles.featuredGrid}>
            {featuredSpots.map((spot) => (
              <FeaturedSpotCard key={spot.id} spot={spot} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>{t('home.featured.empty')}</div>
        )}
        <Button asChild variant="outline">
          <Link href={HOME_CTA_ROUTES.spots}>{t('home.browseSpots')}</Link>
        </Button>
      </section>

      <section
        className={cn(styles.contentSection, styles.capabilitiesSection)}
        aria-labelledby="capabilities-title"
      >
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>{t('home.understands.eyebrow')}</p>
          <h2 id="capabilities-title">{t('home.understands.title')}</h2>
          <p>{t('home.understands.description')}</p>
        </div>
        <div className={styles.capabilityGrid}>
          {CAPABILITIES.map(({ title, description, icon: Icon }) => (
            <article key={title} className={styles.capabilityCard}>
              <span><Icon aria-hidden="true" /></span>
              <h3>{t(title)}</h3>
              <p>{t(description)}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className={cn(styles.contentSection, styles.safetySection)}
        aria-labelledby="safety-title"
      >
        <div className={styles.safetyIcon}>
          <ShieldCheck aria-hidden="true" />
        </div>
        <div>
          <p className={styles.eyebrow}>{t('home.safety.eyebrow')}</p>
          <h2 id="safety-title">{t('home.safety.title')}</h2>
          <p>{t('home.safety.description')}</p>
        </div>
        <div className={styles.safetySeparation} aria-hidden="true">
          <span><Fish />{t('home.safety.quality')}</span>
          <i />
          <span><ShieldCheck />{t('home.safety.risk')}</span>
        </div>
      </section>

      <section
        className={cn(styles.contentSection, styles.finalSection)}
        aria-labelledby="final-cta-title"
      >
        <p className={styles.eyebrow}>{t('home.final.eyebrow')}</p>
        <h2 id="final-cta-title">{t('home.final.title')}</h2>
        <p>{t('home.final.description')}</p>
        <div className={styles.heroActions}>
          <Button asChild size="lg">
            <Link href={HOME_CTA_ROUTES.forecast}>{t('home.final.checkForecast')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={HOME_CTA_ROUTES.map}>{t('home.exploreMap')}</Link>
          </Button>
        </div>
      </section>

      <footer className={styles.homeFooter}>
        <span><Fish aria-hidden="true" />FishCast</span>
        <p>{t('home.footer')}</p>
      </footer>
    </div>
  );
}
