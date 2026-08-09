'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MotionValue } from 'framer-motion';
import {
  resolveHome3DMode,
  selectHome3DQuality,
  type Home3DQuality,
} from '@/lib/homepage/journey';
import { Homepage3DErrorBoundary } from './homepage-3d-error-boundary';
import type {
  Homepage3DSignalLabels,
  Homepage3DSpot,
} from './homepage-3d-scene';

const LazyHomepage3DCanvas = dynamic(
  () => import('./homepage-3d-canvas').then((module) => module.Homepage3DCanvas),
  { ssr: false, loading: () => null }
);

interface Homepage3DEnhancementProps {
  active: boolean;
  className?: string;
  progress: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  reducedMotion: boolean;
  spots: readonly Homepage3DSpot[];
  labels: Homepage3DSignalLabels;
  onReady: () => void;
  onFailure: () => void;
}

interface NavigatorWithCapabilityHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

const QUALITY_ORDER: Readonly<Record<Home3DQuality, number>> = {
  fallback: 0,
  low: 1,
  medium: 2,
  high: 3,
};

function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', {
      failIfMajorPerformanceCaveat: true,
      powerPreference: 'high-performance',
    });
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Capability-gated dynamic boundary. It renders no loading UI: the existing
 * CSS/SVG scene is already the complete loading and failure presentation.
 */
export function Homepage3DEnhancement({
  active,
  className,
  progress,
  pointerX,
  pointerY,
  reducedMotion,
  spots,
  labels,
  onReady,
  onFailure,
}: Homepage3DEnhancementProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [quality, setQuality] = useState<Home3DQuality | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const navigatorHints = navigator as NavigatorWithCapabilityHints;
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const webgl = !reducedMotion && supportsWebGL2();

    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const candidate = selectHome3DQuality({
        webgl,
        reducedMotion,
        width: bounds.width,
        height: bounds.height,
        dpr: window.devicePixelRatio || 1,
        coarsePointer,
        hardwareConcurrency: navigatorHints.hardwareConcurrency,
        deviceMemory: navigatorHints.deviceMemory,
        saveData: navigatorHints.connection?.saveData,
      });
      // Runtime changes may lower the budget, but never trigger a quality
      // upgrade and expensive scene rebuild during the same visit.
      setQuality((current) => {
        if (current === null) return candidate;
        return QUALITY_ORDER[candidate] < QUALITY_ORDER[current] ? candidate : current;
      });
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [reducedMotion]);

  const handleFailure = useCallback(() => {
    setFailed(true);
    onFailure();
  }, [onFailure]);

  useEffect(() => {
    if (quality === 'fallback') onFailure();
  }, [onFailure, quality]);

  const runtime = resolveHome3DMode({
    phase: failed ? 'runtime-error' : quality === null ? 'loading' : 'ready',
    quality: quality ?? 'low',
    offscreen: !active,
  });

  return (
    <div ref={rootRef} className={className} aria-hidden="true">
      {quality && quality !== 'fallback' && runtime.mountCanvas ? (
        <Homepage3DErrorBoundary
          onError={handleFailure}
          resetKey={`${quality}:${spots.length}`}
        >
          <LazyHomepage3DCanvas
            active={runtime.shouldRender}
            progress={progress}
            pointerX={pointerX}
            pointerY={pointerY}
            quality={quality}
            spots={spots}
            labels={labels}
            onReady={onReady}
            onFailure={handleFailure}
          />
        </Homepage3DErrorBoundary>
      ) : null}
    </div>
  );
}
