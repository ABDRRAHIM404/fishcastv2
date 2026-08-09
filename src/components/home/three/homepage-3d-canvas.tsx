'use client';

import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import * as THREE from 'three';
import {
  HOME_3D_QUALITY_SETTINGS,
  type Home3DQuality,
} from '@/lib/homepage/journey';
import {
  Homepage3DScene,
  type Homepage3DSignalLabels,
  type Homepage3DSpot,
} from './homepage-3d-scene';

interface Homepage3DCanvasProps {
  active: boolean;
  progress: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  quality: Exclude<Home3DQuality, 'fallback'>;
  spots: readonly Homepage3DSpot[];
  labels: Homepage3DSignalLabels;
  onReady: () => void;
  onFailure: () => void;
}

function FirstFrame({ onReady }: { onReady: () => void }) {
  const reported = useRef(false);
  useFrame(() => {
    if (reported.current) return;
    reported.current = true;
    onReady();
  });
  return null;
}

function RendererLifecycle({
  active,
  onFailure,
}: Pick<Homepage3DCanvasProps, 'active' | 'onFailure'>) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, { passive: false });
    return () => canvas.removeEventListener('webglcontextlost', handleContextLost);
  }, [gl, onFailure]);

  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);

  return null;
}

export function Homepage3DCanvas({
  active,
  progress,
  pointerX,
  pointerY,
  quality,
  spots,
  labels,
  onReady,
  onFailure,
}: Homepage3DCanvasProps) {
  const settings = HOME_3D_QUALITY_SETTINGS[quality];
  const dpr: [number, number] = [
    quality === 'low' ? 0.8 : 1,
    settings.maxDpr,
  ];

  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 3.4, 13], fov: 48, near: 0.1, far: 130 }}
      dpr={dpr}
      frameloop={active ? 'always' : 'never'}
      shadows={settings.shadows}
      gl={{
        alpha: true,
        antialias: settings.antialias,
        depth: true,
        powerPreference: quality === 'low' ? 'low-power' : 'high-performance',
        preserveDrawingBuffer: false,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
      resize={{ debounce: { scroll: 50, resize: 100 } }}
      style={{ pointerEvents: 'none' }}
    >
      <RendererLifecycle active={active} onFailure={onFailure} />
      <Homepage3DScene
        progress={progress}
        pointerX={pointerX}
        pointerY={pointerY}
        quality={quality}
        spots={spots}
        labels={labels}
      />
      <FirstFrame onReady={onReady} />
    </Canvas>
  );
}
