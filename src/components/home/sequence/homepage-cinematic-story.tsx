'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpDown,
  CloudSun,
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
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import type { TranslationKey } from '@/i18n/types';
import { publicSpotName } from '@/lib/forecast-ui/spots';
import {
  activeHomeScene,
  homeSceneOpacity,
} from '@/lib/homepage/sequence';
import {
  HOME_CTA_ROUTES,
  HOME_MOTION_PREFERENCE_KEY,
  normalizeSpotPositions,
  parseHomeMotionPreference,
  shouldUseStaticStory,
  type HomeMotionMode,
  type HomeStoryScene,
} from '@/lib/homepage/story';
import { cn } from '@/lib/utils';
import type { Spot } from '@/types/spot';
import { HomepageSequenceLoader } from './homepage-sequence-loader';
import styles from '../homepage.module.css';

interface ConditionSignal {
  key: 'wind' | 'waves' | 'swell' | 'tide' | 'weather';
  label: TranslationKey;
  icon: LucideIcon;
}

const CONDITION_SIGNALS: readonly ConditionSignal[] = [
  { key: 'wind', label: 'home.capability.wind', icon: Wind },
  { key: 'waves', label: 'home.capability.waves', icon: Waves },
  { key: 'swell', label: 'conditions.primarySwell', icon: Activity },
  { key: 'tide', label: 'home.capability.tide', icon: ArrowUpDown },
  { key: 'weather', label: 'home.capability.weather', icon: CloudSun },
] as const;

function SequencePoster() {
  return (
    <picture className={styles.sequencePoster}>
      <source
        media="(max-aspect-ratio: 1/1)"
        srcSet="/homepage/sequence/v1/mobile/frame_001.webp"
        type="image/webp"
      />
      {/* Already optimized; bypassing the image optimizer avoids a duplicate hero request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/homepage/sequence/v1/desktop/frame_001.webp"
        alt=""
        width="1280"
        height="720"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        className={styles.sequencePosterImage}
      />
    </picture>
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

function SelectedSpotCard({ spot }: { spot?: Spot }) {
  const { t } = useI18n();
  if (!spot) return null;

  const name = publicSpotName(spot.slug, spot.name);
  return (
    <Link href={`/spots/${spot.slug}`} className={styles.selectedSpotCard}>
      <span className={styles.selectedSpotIcon}>
        <MapPin aria-hidden="true" />
      </span>
      <span>
        <span className={styles.cardMeta}>{t('home.story.spot.selected')}</span>
        <strong>{name}</strong>
        <small>{spot.region ?? t('site.region')}</small>
      </span>
      <ArrowRight className={styles.inlineArrow} aria-hidden="true" />
    </Link>
  );
}

function SpatialSpotField({ spots, selectedSpot }: {
  spots: readonly Spot[];
  selectedSpot?: Spot;
}) {
  const positions = useMemo(
    () => normalizeSpotPositions(
      spots.map(({ id, latitude, longitude }) => ({ id, latitude, longitude }))
    ),
    [spots]
  );

  return (
    <div className={styles.spatialSpotField} dir="ltr" aria-hidden="true">
      <svg className={styles.locationContours} viewBox="0 0 1000 620" preserveAspectRatio="none">
        <path d="M-80 486 C140 390 264 518 446 408 S740 240 1080 288" />
        <path d="M-60 526 C168 424 290 558 478 446 S760 282 1060 326" />
        <path d="M-30 566 C194 468 322 594 518 486 S786 324 1040 368" />
      </svg>
      <span className={styles.locationSweep} />
      {positions.map((position) => {
        const spot = spots.find((candidate) => candidate.id === position.id);
        if (!spot) return null;
        const selected = spot.id === selectedSpot?.id;
        const style = {
          '--spot-x': `${position.xPercent}%`,
          '--spot-y': `${position.yPercent}%`,
        } as CSSProperties;

        return (
          <span
            key={spot.id}
            className={cn(styles.spatialMarker, selected && styles.spatialMarkerSelected)}
            style={style}
          >
            <i />
            <b>{publicSpotName(spot.slug, spot.name)}</b>
          </span>
        );
      })}
    </div>
  );
}

function MarineIntelligence({ pointerX, pointerY }: {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}) {
  const { t } = useI18n();
  const fieldX = useTransform(pointerX, (value) => value * 0.34);
  const fieldY = useTransform(pointerY, (value) => value * 0.24);

  return (
    <motion.div
      className={styles.marineIntelligence}
      style={{ x: fieldX, y: fieldY }}
    >
      <div className={styles.marinePhysicalLayer} dir="ltr" aria-hidden="true">
        <svg className={styles.marineFlows} viewBox="0 0 1000 700" preserveAspectRatio="none">
          <defs>
            <linearGradient id="home-flow-cyan" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8fe5df" stopOpacity="0" />
              <stop offset="0.55" stopColor="#8fe5df" stopOpacity="0.7" />
              <stop offset="1" stopColor="#8fe5df" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="home-flow-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#eabf7b" stopOpacity="0" />
              <stop offset="1" stopColor="#eabf7b" stopOpacity="0.58" />
            </linearGradient>
          </defs>
          <g className={styles.windFlow}>
            <path d="M-40 190 C205 72 356 234 608 142 S860 94 1040 130" />
            <path d="M-40 226 C180 114 372 278 626 182 S874 136 1040 166" />
            <path d="M-40 264 C162 158 390 316 650 222 S886 180 1040 204" />
          </g>
          <g className={styles.swellFlow}>
            <path d="M-100 592 C180 412 378 624 596 460 S850 292 1090 386" />
            <path d="M-80 644 C202 472 396 672 624 510 S870 350 1080 428" />
          </g>
          <g className={styles.analysisFlow}>
            <path d="M95 200 C310 210 468 288 620 365" />
            <path d="M164 542 C340 494 486 426 620 365" />
            <path d="M868 166 C820 262 734 328 620 365" />
            <path d="M900 535 C814 488 724 412 620 365" />
          </g>
          <path className={styles.weatherArc} d="M690 92 C812 36 936 90 1005 210" />
        </svg>
        <span className={styles.tideGauge}><i /><b /></span>
        <span className={styles.atmosphericReading} />
        {Array.from({ length: 8 }, (_, index) => (
          <i key={index} className={styles.marineParticle} data-particle={index} />
        ))}
      </div>

      <div className={styles.signalNodes} aria-hidden="true">
        {CONDITION_SIGNALS.map(({ key, label, icon: Icon }) => (
          <div key={key} className={styles.signalNode} data-signal={key}>
            <Icon />
            <span>{t(label)}</span>
          </div>
        ))}
      </div>

      <div className={styles.analysisLens} aria-hidden="true">
        <i className={styles.analysisReticle} />
        <Sparkles />
        <strong>{t('home.story.conditions.analysis')}</strong>
        <span>{t('home.story.decision.scoreRange')}</span>
      </div>

      <ul className="sr-only">
        {CONDITION_SIGNALS.map(({ key, label }) => <li key={key}>{t(label)}</li>)}
      </ul>
    </motion.div>
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

function sceneA11yProps(
  staticStory: boolean,
  activeScene: HomeStoryScene | null,
  scene: HomeStoryScene
) {
  const inactive = !staticStory && activeScene !== scene;
  return {
    'aria-hidden': inactive || undefined,
    inert: inactive || undefined,
  };
}

export function HomepageCinematicStory({ spots }: { spots: readonly Spot[] }) {
  const { t } = useI18n();
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerBounds = useRef<DOMRect | null>(null);
  const pointerFrame = useRef<number | null>(null);
  const pendingPointer = useRef({ x: 0, y: 0 });
  const activeSceneRef = useRef<HomeStoryScene | null>('ocean');
  const systemReducedMotion = Boolean(useReducedMotion());
  const [motionMode, setMotionMode] = useState<HomeMotionMode>('auto');
  const [activeScene, setActiveScene] = useState<HomeStoryScene | null>('ocean');
  const [animationsPaused, setAnimationsPaused] = useState(false);
  const [sequenceReady, setSequenceReady] = useState(false);
  const [sequenceFailed, setSequenceFailed] = useState(false);
  const staticStory = shouldUseStaticStory(systemReducedMotion, motionMode);
  const selectedSpot = spots.find((spot) => spot.slug === 'tifnit') ?? spots[0];
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ['start start', 'end end'],
  });
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  // The only springs are the optional, decorative pointer offsets. Frames and
  // story timing always consume raw scroll progress directly.
  const pointerXSoft = useSpring(pointerX, { stiffness: 180, damping: 30 });
  const pointerYSoft = useSpring(pointerY, { stiffness: 180, damping: 30 });

  const oceanOpacity = useTransform(scrollYProgress, (value) => homeSceneOpacity('ocean', value));
  const spotOpacity = useTransform(scrollYProgress, (value) => homeSceneOpacity('spot', value));
  const conditionsOpacity = useTransform(scrollYProgress, (value) => homeSceneOpacity('conditions', value));
  const decisionOpacity = useTransform(scrollYProgress, (value) => homeSceneOpacity('decision', value));
  const spotFieldOpacity = useTransform(scrollYProgress, [0.19, 0.27, 0.42, 0.5], [0, 1, 1, 0]);
  const marineFieldOpacity = useTransform(scrollYProgress, [0.4, 0.5, 0.7, 0.79], [0, 1, 1, 0]);
  const decisionFieldOpacity = useTransform(scrollYProgress, [0.7, 0.79, 0.91, 0.965], [0, 1, 1, 0]);
  const oceanY = useTransform(oceanOpacity, [0, 1], [20, 0]);
  const spotY = useTransform(spotOpacity, [0, 1], [20, 0]);
  const conditionsY = useTransform(conditionsOpacity, [0, 1], [20, 0]);
  const decisionY = useTransform(decisionOpacity, [0, 1], [20, 0]);
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const nextScene = activeHomeScene(value);
    if (activeSceneRef.current === nextScene) return;
    activeSceneRef.current = nextScene;
    setActiveScene(nextScene);
  });

  useEffect(() => {
    const initialScene = activeHomeScene(scrollYProgress.get());
    activeSceneRef.current = initialScene;
    setActiveScene(initialScene);
  }, [scrollYProgress]);

  useEffect(() => {
    let stored: HomeMotionMode = 'auto';
    try {
      stored = parseHomeMotionPreference(localStorage.getItem(HOME_MOTION_PREFERENCE_KEY));
    } catch {
      // Storage restrictions retain the safe automatic preference.
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
    observer?.observe(stage);
    document.addEventListener('visibilitychange', updatePaused);
    updatePaused();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updatePaused);
    };
  }, []);

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
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 12,
      y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 8,
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

  return (
    <>
      <noscript>
        <style>{`.${styles.story}{height:auto!important;min-height:0!important}.${styles.stage}{position:relative!important;top:0!important;height:min(100svh,52rem)!important;}`}</style>
      </noscript>
      <section
        ref={storyRef}
        className={styles.story}
        aria-label={t('home.story.eyebrow')}
        data-motion-mode={staticStory ? 'reduced' : motionMode}
        data-active-scene={activeScene ?? 'transition'}
        data-animations-paused={animationsPaused ? 'true' : 'false'}
        data-sequence-ready={sequenceReady ? 'true' : 'false'}
        data-sequence-failed={sequenceFailed ? 'true' : 'false'}
      >
        <div
          ref={stageRef}
          className={styles.stage}
          onPointerEnter={handlePointerEnter}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
        >
          <SequencePoster />
          <HomepageSequenceLoader
            active={!animationsPaused}
            className={styles.sequenceLayer}
            enabled={!staticStory}
            progress={scrollYProgress}
            onReady={() => {
              setSequenceFailed(false);
              setSequenceReady(true);
            }}
            onFailure={() => {
              setSequenceFailed(true);
              setSequenceReady(false);
            }}
          />
          <div className={styles.cinematicGrade} aria-hidden="true" />

          <motion.div
            className={cn(styles.scene, styles.oceanScene)}
            style={{ opacity: oceanOpacity, y: oceanY }}
            {...sceneA11yProps(staticStory, activeScene, 'ocean')}
          >
            <StoryCopy
              eyebrow={t('home.story.eyebrow')}
              title={t('home.story.ocean.title')}
              description={t('home.story.ocean.description')}
              heading="h1"
            >
              <div className={styles.heroActions}>
                <Button asChild size="lg">
                  <Link href={HOME_CTA_ROUTES.forecast}>{t('home.final.checkForecast')}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href={HOME_CTA_ROUTES.map}>{t('home.exploreMap')}</Link>
                </Button>
              </div>
            </StoryCopy>
            <div className={styles.scrollCue} aria-hidden="true">
              <span>{t('home.story.scroll')}</span><ArrowDown />
            </div>
          </motion.div>

          <motion.div
            className={styles.spatialPlane}
            style={{ opacity: spotFieldOpacity, x: pointerXSoft, y: pointerYSoft }}
            aria-hidden="true"
          >
            <SpatialSpotField spots={spots} selectedSpot={selectedSpot} />
          </motion.div>
          <motion.div
            className={cn(styles.scene, styles.spotScene)}
            style={{ opacity: spotOpacity, y: spotY }}
            {...sceneA11yProps(staticStory, activeScene, 'spot')}
          >
            <StoryCopy title={t('home.story.spot.title')} description={t('home.story.spot.description')}>
              <Button asChild variant="outline">
                <Link href={HOME_CTA_ROUTES.map}>{t('home.exploreMap')}</Link>
              </Button>
            </StoryCopy>
            <SelectedSpotCard spot={selectedSpot} />
          </motion.div>

          <motion.div
            className={styles.marinePlane}
            style={{ opacity: marineFieldOpacity }}
            aria-hidden="true"
          >
            <MarineIntelligence pointerX={pointerXSoft} pointerY={pointerYSoft} />
          </motion.div>
          <motion.div
            className={cn(styles.scene, styles.conditionsScene)}
            style={{ opacity: conditionsOpacity, y: conditionsY }}
            {...sceneA11yProps(staticStory, activeScene, 'conditions')}
          >
            <StoryCopy
              title={t('home.story.conditions.title')}
              description={t('home.story.conditions.description')}
            />
          </motion.div>

          <motion.div
            className={cn(styles.decisionAtmosphere, styles.spatialPlane)}
            style={{ opacity: decisionFieldOpacity }}
            aria-hidden="true"
          />
          <motion.div
            className={cn(styles.scene, styles.decisionScene)}
            style={{ opacity: decisionOpacity, y: decisionY }}
            {...sceneA11yProps(staticStory, activeScene, 'decision')}
          >
            <StoryCopy title={t('home.story.decision.title')} description={t('home.story.decision.description')}>
              <div className={styles.heroActions}>
                <Button asChild size="lg">
                  <Link href={HOME_CTA_ROUTES.forecast}>{t('home.final.checkForecast')}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href={HOME_CTA_ROUTES.spots}>{t('home.browseSpots')}</Link>
                </Button>
              </div>
            </StoryCopy>
            <DecisionPanel />
          </motion.div>

          <div className={styles.progressRail} aria-hidden="true">
            <motion.i style={{ scaleY: progressScale }} />
          </div>
        </div>
      </section>
    </>
  );
}
