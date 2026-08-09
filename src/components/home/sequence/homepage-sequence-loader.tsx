'use client';

import dynamic from 'next/dynamic';
import type { MotionValue } from 'framer-motion';
import { HomepageSequenceBoundary } from './homepage-sequence-boundary';

const LazyHomepageSequenceCanvas = dynamic(
  () => import('./homepage-sequence-canvas').then(
    (module) => module.HomepageSequenceCanvas
  ),
  { ssr: false, loading: () => null }
);

interface HomepageSequenceLoaderProps {
  active: boolean;
  enabled: boolean;
  className?: string;
  progress: MotionValue<number>;
  onReady?: () => void;
  onFailure?: () => void;
}

const NOOP = () => undefined;

/**
 * Keeps the canvas-only sequence out of the server-rendered homepage and makes
 * failure non-destructive: the parent owns the permanent poster/fallback.
 */
export function HomepageSequenceLoader({
  active,
  enabled,
  className,
  progress,
  onReady = NOOP,
  onFailure = NOOP,
}: HomepageSequenceLoaderProps) {
  if (!enabled) return null;

  return (
    <div className={className} aria-hidden="true">
      <HomepageSequenceBoundary
        onError={onFailure}
        resetKey="homepage-sequence-v1"
      >
        <LazyHomepageSequenceCanvas
          active={active}
          progress={progress}
          onReady={onReady}
          onFailure={onFailure}
        />
      </HomepageSequenceBoundary>
    </div>
  );
}
