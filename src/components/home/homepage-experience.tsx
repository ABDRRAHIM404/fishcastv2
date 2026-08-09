'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpDown,
  CloudSun,
  Fish,
  ImageIcon,
  MapPin,
  ShieldCheck,
  Sparkles,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Homepage3DEnhancement } from '@/components/home/three/homepage-3d-loader';
import { useI18n } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/types';
import { difficultyLabel, spotTypeLabel } from '@/i18n/presentation';
import { publicSpotName } from '@/lib/forecast-ui/spots';
import {
  HOME_CTA_ROUTES,
  HOME_MOTION_PREFERENCE_KEY,
  normalizeSpotPositions,
  parseHomeMotionPreference,
  shouldUseStaticStory,
  type HomeMotionMode,
} from '@/lib/homepage/story';
import { homeSceneOpacity } from '@/lib/homepage/journey';
import { cn } from '@/lib/utils';
import {
  DIFFICULTY_BADGE_VARIANT,
  type Spot,
} from '@/types/spot';
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

const CONDITION_ICONS: readonly Pick<Capability, 'title' | 'icon'>[] = [
  { title: 'home.capability.wind', icon: Wind },
  { title: 'home.capability.waves', icon: Waves },
  { title: 'conditions.primarySwell', icon: Activity },
  { title: 'home.capability.tide', icon: ArrowUpDown },
  { title: 'home.capability.weather', icon: CloudSun },
] as const;

function OceanLayers({ pointerX, pointerY }: {
  pointerX: ReturnType<typeof useMotionValue<number>>;
  pointerY: ReturnType<typeof useMotionValue<number>>;
}) {
  const farX = useTransform(pointerX, (value) => value * 0.3);
  const farY = useTransform(pointerY, (value) => value * 0.2);
  const nearX = useTransform(pointerX, (value) => value * 0.75);
  const nearY = useTransform(pointerY, (value) => value * 0.45);

  return (
    <div className={styles.oceanWorld} aria-hidden="true">
      <motion.div className={styles.horizonGlow} style={{ x: farX, y: farY }} />
      <motion.div className={styles.oceanFar} style={{ x: farX, y: farY }} />
      <motion.svg
        className={styles.waveContours}
        style={{ x: nearX, y: nearY }}
        viewBox="0 0 1200 520"
        preserveAspectRatio="none"
      >
        <path d="M-70 120 C130 50 270 190 475 112 S815 65 1270 135" />
        <path d="M-90 205 C115 130 320 270 525 192 S930 140 1290 212" />
        <path d="M-110 305 C90 220 345 372 575 282 S975 230 1310 315" />
        <path d="M-130 420 C120 315 370 480 640 385 S1000 350 1330 430" />
      </motion.svg>
      <motion.div className={styles.oceanNear} style={{ x: nearX, y: nearY }} />
      <div className={styles.mist} />
      <i className={styles.particle} />
      <i className={styles.particle} />
      <i className={styles.particle} />
      <i className={styles.particle} />
    </div>
  );
}

function StoryCopy({
  eyebrow,
  title,
  description,
  heading = 'h2',
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  heading?: 'h1' | 'h2';
  children?: React.ReactNode;
}) {
  const Heading = heading;
  return (
    <div className={styles.storyCopy}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <Heading className={cn(styles.storyTitle, heading === 'h1' && styles.heroTitle)}>
        {title}
      </Heading>
      <p className={styles.storyDescription}>{description}</p>
      {children}
    </div>
  );
}

function Coastline({ spots, selectedSpot }: { spots: readonly Spot[]; selectedSpot?: Spot }) {
  const { t } = useI18n();
  const positions = useMemo(
    () => normalizeSpotPositions(spots.map(({ id, latitude, longitude }) => ({ id, latitude, longitude }))),
    [spots]
  );

  return (
    <div className={styles.coastScene} dir="ltr" aria-hidden="true">
      <svg className={styles.bathymetry} viewBox="0 0 800 700" preserveAspectRatio="none">
        <path d="M-60 85 C190 40 250 215 455 185 S665 205 860 90" />
        <path d="M-70 165 C175 120 260 290 470 252 S670 274 870 160" />
        <path d="M-80 250 C160 205 270 360 488 326 S695 350 880 245" />
        <path d="M-90 345 C145 300 280 435 505 405 S710 445 890 350" />
        <path d="M-100 445 C130 400 285 520 520 495 S725 540 900 460" />
      </svg>
      <div className={styles.coastMass} />
      <div className={styles.mapGrid} />
      {positions.map((position) => {
        const spot = spots.find((candidate) => candidate.id === position.id);
        if (!spot) return null;
        const isSelected = spot.id === selectedSpot?.id;
        return (
          <div
            key={spot.id}
            className={cn(styles.spotMarker, isSelected && styles.selectedMarker)}
            style={{ left: `${position.xPercent}%`, top: `${position.yPercent}%` }}
          >
            <span className={styles.markerPulse} />
            <span className={styles.markerDot} />
            <span className={styles.markerName}>{publicSpotName(spot.slug, spot.name)}</span>
            {isSelected ? <span className={styles.markerSelection}>{t('home.story.spot.selected')}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function SelectedSpotCard({ spot }: { spot?: Spot }) {
  const { t } = useI18n();
  if (!spot) return null;
  const name = publicSpotName(spot.slug, spot.name);
  return (
    <Link href={`/spots/${spot.slug}`} className={styles.selectedSpotCard}>
      <span className={styles.selectedSpotIcon}><MapPin aria-hidden="true" /></span>
      <span>
        <span className={styles.cardMeta}>{t('home.story.spot.selected')}</span>
        <strong>{name}</strong>
        <small>{spot.region ?? t('site.region')}</small>
      </span>
      <ArrowRight className={styles.inlineArrow} aria-hidden="true" />
    </Link>
  );
}

function IntelligenceVisual() {
  const { t } = useI18n();
  return (
    <div className={styles.intelligence} aria-hidden="true">
      <div className={styles.conditionOrbit}>
        {CONDITION_ICONS.map(({ title, icon: Icon }, index) => (
          <div className={styles.conditionChip} data-position={index} key={title}>
            <Icon aria-hidden="true" />
            <span>{t(title)}</span>
          </div>
        ))}
        <div className={styles.analysisCore}>
          <Sparkles aria-hidden="true" />
          <strong>{t('home.story.conditions.analysis')}</strong>
          <span>{t('home.story.decision.scoreRange')}</span>
        </div>
        <i className={styles.analysisRing} />
        <i className={styles.analysisRing} />
      </div>
    </div>
  );
}

function DecisionPanel() {
  const { t } = useI18n();
  return (
    <div className={styles.decisionPanel}>
      <div className={styles.demoLabel}>
        <Sparkles aria-hidden="true" />
        {t('home.story.decision.demo')}
      </div>
      <div className={styles.decisionGrid}>
        <div className={styles.scoreCapability}>
          <div className={styles.capabilityRing} aria-hidden="true"><span>0–100</span></div>
          <div>
            <strong>{t('table.group.fishing')}</strong>
            <span>{t('home.story.decision.scoreRange')}</span>
          </div>
        </div>
        <div className={styles.safetyCapability}>
          <ShieldCheck aria-hidden="true" />
          <div>
            <strong>{t('table.group.safety')}</strong>
            <span>{t('home.story.decision.safetyFirst')}</span>
          </div>
        </div>
        <div className={styles.decisionFact}>
          <CloudSun aria-hidden="true" />
          <span><strong>{t('overview.bestWindow')}</strong>{t('home.story.decision.timing')}</span>
        </div>
        <div className={styles.decisionFact}>
          <Activity aria-hidden="true" />
          <span><strong>{t('table.row.confidence')}</strong>{t('home.story.decision.confidence')}</span>
        </div>
      </div>
      <p className={styles.demoDisclaimer}>{t('home.story.decision.disclaimer')}</p>
    </div>
  );
}

function CinematicStory({ spots }: { spots: readonly Spot[] }) {
  const { t } = useI18n();
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerBounds = useRef<DOMRect | null>(null);
  const pointerFrame = useRef<number | null>(null);
  const pendingPointer = useRef({ x: 0, y: 0 });
  const systemReducedMotion = Boolean(useReducedMotion());
  const [motionMode, setMotionMode] = useState<HomeMotionMode>('auto');
  const [animationsPaused, setAnimationsPaused] = useState(false);
  const [webglReady, setWebglReady] = useState(false);
  const staticStory = shouldUseStaticStory(systemReducedMotion, motionMode);
  const selectedSpot = spots.find((spot) => spot.slug === 'tifnit') ?? spots[0];
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ['start start', 'end end'],
  });
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const pointerXSoft = useSpring(pointerX, { stiffness: 110, damping: 24 });
  const pointerYSoft = useSpring(pointerY, { stiffness: 110, damping: 24 });

  // Primary storytelling follows raw scroll progress exactly. There is no
  // temporal spring, so fast and reverse scrolling never has to catch up.
  const oceanOpacity = useTransform(scrollYProgress, (value) => homeSceneOpacity('ocean', value));
  const oceanY = useTransform(oceanOpacity, [0, 1], ['2.5%', '0%']);
  const spotOpacity = useTransform(scrollYProgress, (value) => homeSceneOpacity('spot', value));
  const spotY = useTransform(spotOpacity, [0, 1], ['2.5%', '0%']);
  const coastOpacity = useTransform(scrollYProgress, [0.2, 0.29, 0.43, 0.48], [0, 1, 1, 0]);
  const coastScale = useTransform(scrollYProgress, [0.2, 0.47], [1.08, 0.96]);
  const conditionsOpacity = useTransform(scrollYProgress, (value) => homeSceneOpacity('conditions', value));
  const conditionsY = useTransform(conditionsOpacity, [0, 1], ['2.5%', '0%']);
  const intelligenceScale = useTransform(scrollYProgress, [0.46, 0.6, 0.74], [0.86, 1, 1.06]);
  const decisionOpacity = useTransform(scrollYProgress, (value) => homeSceneOpacity('decision', value));
  const decisionY = useTransform(decisionOpacity, [0, 1], ['2.5%', '0%']);

  const webglSpots = useMemo(
    () => spots.map((spot) => ({
      id: spot.id,
      slug: spot.slug,
      name: publicSpotName(spot.slug, spot.name),
      latitude: spot.latitude,
      longitude: spot.longitude,
    })),
    [spots]
  );
  const webglLabels = useMemo(() => ({
    wind: t('home.capability.wind'),
    waves: t('home.capability.waves'),
    swell: t('conditions.primarySwell'),
    tide: t('home.capability.tide'),
    weather: t('home.capability.weather'),
  }), [t]);

  useEffect(() => {
    let stored: HomeMotionMode = 'auto';
    try {
      stored = parseHomeMotionPreference(localStorage.getItem(HOME_MOTION_PREFERENCE_KEY));
    } catch {
      // Storage restrictions keep the safe automatic preference.
    }
    if (stored !== 'auto') {
      setMotionMode(stored);
      return;
    }
    if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4) {
      setMotionMode('lite');
    }
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let visible = true;
    const updatePaused = () => setAnimationsPaused(!visible || document.hidden);
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
          visible = Boolean(entry?.isIntersecting);
          updatePaused();
        });
    updatePaused();
    observer?.observe(stage);
    document.addEventListener('visibilitychange', updatePaused);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updatePaused);
    };
  }, []);

  useEffect(() => {
    if (staticStory) setWebglReady(false);
  }, [staticStory]);

  useEffect(() => () => {
    if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current);
  }, []);

  const handlePointerEnter = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointerBounds.current = event.currentTarget.getBoundingClientRect();
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (staticStory || motionMode === 'lite' || event.pointerType !== 'mouse') return;
    const bounds = pointerBounds.current;
    if (!bounds) return;
    pendingPointer.current = {
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 16,
      y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 10,
    };
    if (pointerFrame.current !== null) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerX.set(pendingPointer.current.x);
      pointerY.set(pendingPointer.current.y);
      pointerFrame.current = null;
    });
  }, [motionMode, pointerX, pointerY, staticStory]);

  const resetPointer = useCallback(() => {
    pointerBounds.current = null;
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  const handleWebglReady = useCallback(() => setWebglReady(true), []);
  const handleWebglFailure = useCallback(() => setWebglReady(false), []);

  return (
    <>
      <noscript>
        <style>{`.${styles.story}{height:auto!important;min-height:0!important}.${styles.stage}{position:relative!important;top:0!important;height:min(100svh,48rem)!important;}`}</style>
      </noscript>
      <section
        ref={storyRef}
        className={styles.story}
        aria-label={t('home.story.eyebrow')}
        data-motion-mode={staticStory ? 'reduced' : motionMode}
        data-animations-paused={animationsPaused ? 'true' : 'false'}
        data-webgl-ready={webglReady ? 'true' : 'false'}
      >
        <div
          ref={stageRef}
          className={styles.stage}
          onPointerEnter={handlePointerEnter}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
        >
          <OceanLayers pointerX={pointerXSoft} pointerY={pointerYSoft} />
          <Homepage3DEnhancement
            active={!animationsPaused}
            className={styles.webglLayer}
            progress={scrollYProgress}
            pointerX={pointerXSoft}
            pointerY={pointerYSoft}
            reducedMotion={staticStory}
            spots={webglSpots}
            labels={webglLabels}
            onReady={handleWebglReady}
            onFailure={handleWebglFailure}
          />

          <motion.div
            className={cn(styles.scene, styles.oceanScene)}
            style={{ opacity: oceanOpacity, y: oceanY }}
          >
            <StoryCopy
              eyebrow={t('home.story.eyebrow')}
              title={t('home.story.ocean.title')}
              description={t('home.story.ocean.description')}
              heading="h1"
            >
              <div className={styles.heroActions}>
                <Button asChild size="lg"><Link href={HOME_CTA_ROUTES.forecast}>{t('home.final.checkForecast')}</Link></Button>
                <Button asChild size="lg" variant="outline"><Link href={HOME_CTA_ROUTES.map}>{t('home.exploreMap')}</Link></Button>
              </div>
            </StoryCopy>
            <div className={styles.scrollCue} aria-hidden="true">
              <span>{t('home.story.scroll')}</span><ArrowDown />
            </div>
          </motion.div>

          <motion.div
            className={cn(styles.visualPlane, styles.coastPlane)}
            style={{ opacity: coastOpacity, scale: coastScale, x: pointerXSoft, y: pointerYSoft }}
          >
            <Coastline spots={spots} selectedSpot={selectedSpot} />
          </motion.div>
          <motion.div className={cn(styles.scene, styles.spotScene)} style={{ opacity: spotOpacity, y: spotY }}>
            <StoryCopy title={t('home.story.spot.title')} description={t('home.story.spot.description')}>
              <Button asChild variant="outline"><Link href={HOME_CTA_ROUTES.map}>{t('home.exploreMap')}</Link></Button>
            </StoryCopy>
            <SelectedSpotCard spot={selectedSpot} />
          </motion.div>

          <motion.div
            className={cn(styles.visualPlane, styles.intelligencePlane)}
            style={{ opacity: conditionsOpacity, scale: intelligenceScale }}
          >
            <IntelligenceVisual />
          </motion.div>
          <motion.div className={cn(styles.scene, styles.conditionsScene)} style={{ opacity: conditionsOpacity, y: conditionsY }}>
            <StoryCopy title={t('home.story.conditions.title')} description={t('home.story.conditions.description')} />
          </motion.div>

          <motion.div className={cn(styles.scene, styles.decisionScene)} style={{ opacity: decisionOpacity, y: decisionY }}>
            <StoryCopy title={t('home.story.decision.title')} description={t('home.story.decision.description')}>
              <div className={styles.heroActions}>
                <Button asChild size="lg"><Link href={HOME_CTA_ROUTES.forecast}>{t('home.final.checkForecast')}</Link></Button>
                <Button asChild size="lg" variant="outline"><Link href={HOME_CTA_ROUTES.spots}>{t('home.browseSpots')}</Link></Button>
              </div>
            </StoryCopy>
            <DecisionPanel />
          </motion.div>

          <div className={styles.progressRail} aria-hidden="true">
            <i /><i /><i /><i />
          </div>
        </div>
      </section>
    </>
  );
}

function FeaturedSpotCard({ spot }: { spot: Spot }) {
  const { t } = useI18n();
  const [imageFailed, setImageFailed] = useState(false);
  const displayName = publicSpotName(spot.slug, spot.name);
  return (
    <article className={styles.featuredCard}>
      <Link href={`/spots/${spot.slug}`} aria-label={t('home.featured.viewSpot', { spot: displayName })}>
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
            <p><MapPin aria-hidden="true" />{spot.region ?? spot.province ?? t('site.region')}</p>
          </div>
          <ArrowRight className={styles.inlineArrow} aria-hidden="true" />
        </div>
      </Link>
    </article>
  );
}

function StandardHomepageContent({ spots }: { spots: readonly Spot[] }) {
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
            {featuredSpots.map((spot) => <FeaturedSpotCard key={spot.id} spot={spot} />)}
          </div>
        ) : (
          <div className={styles.emptyState}>{t('home.featured.empty')}</div>
        )}
        <Button asChild variant="outline"><Link href={HOME_CTA_ROUTES.spots}>{t('home.browseSpots')}</Link></Button>
      </section>

      <section className={cn(styles.contentSection, styles.capabilitiesSection)} aria-labelledby="capabilities-title">
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

      <section className={cn(styles.contentSection, styles.safetySection)} aria-labelledby="safety-title">
        <div className={styles.safetyIcon}><ShieldCheck aria-hidden="true" /></div>
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

      <section className={cn(styles.contentSection, styles.finalSection)} aria-labelledby="final-cta-title">
        <p className={styles.eyebrow}>{t('home.final.eyebrow')}</p>
        <h2 id="final-cta-title">{t('home.final.title')}</h2>
        <p>{t('home.final.description')}</p>
        <div className={styles.heroActions}>
          <Button asChild size="lg"><Link href={HOME_CTA_ROUTES.forecast}>{t('home.final.checkForecast')}</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href={HOME_CTA_ROUTES.map}>{t('home.exploreMap')}</Link></Button>
        </div>
      </section>

      <footer className={styles.homeFooter}>
        <span><Fish aria-hidden="true" />FishCast</span>
        <p>{t('home.footer')}</p>
      </footer>
    </div>
  );
}

export function HomepageExperience({ spots }: { spots: readonly Spot[] }) {
  return (
    <div className={styles.home}>
      <CinematicStory spots={spots} />
      <StandardHomepageContent spots={spots} />
    </div>
  );
}
