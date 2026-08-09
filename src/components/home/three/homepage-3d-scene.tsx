'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import * as THREE from 'three';
import {
  HOME_3D_QUALITY_SETTINGS,
  sampleHomeCamera,
  type Home3DQuality,
} from '@/lib/homepage/journey';
import { normalizeSpotPositions } from '@/lib/homepage/story';

export interface Homepage3DSpot {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface Homepage3DSignalLabels {
  wind: string;
  waves: string;
  swell: string;
  tide: string;
  weather: string;
}

interface Homepage3DSceneProps {
  progress: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  quality: Exclude<Home3DQuality, 'fallback'>;
  spots: readonly Homepage3DSpot[];
  labels: Homepage3DSignalLabels;
}

interface WorldSpot extends Homepage3DSpot {
  position: readonly [number, number, number];
}

const MARINE_SIGNAL_ORIGINS = {
  landscape: {
    wind: [1.2, 1.45, -26.4],
    waves: [-0.6, -1.4, -26.8],
    swell: [2.4, -1.3, -26.5],
    tide: [2.5, 0.9, -27],
    weather: [0.4, 2.35, -27.2],
  },
  portrait: {
    wind: [-1.05, 0.65, -26.4],
    waves: [-1.05, -1, -26.8],
    swell: [1.05, -1, -26.5],
    tide: [1.05, 0.65, -27],
    weather: [0, 1.7, -27.2],
  },
} as const satisfies Readonly<Record<
  'landscape' | 'portrait',
  Record<keyof Homepage3DSignalLabels, readonly [number, number, number]>
>>;

const OCEAN_VERTEX_SHADER = `
  uniform float uTime;
  varying float vWave;
  varying float vDistance;

  void main() {
    vec3 transformed = position;
    float waveA = sin((position.x * 0.52) + (uTime * 0.42)) * 0.13;
    float waveB = sin((position.y * 0.23) - (uTime * 0.3)) * 0.17;
    float waveC = sin(((position.x + position.y) * 0.31) + (uTime * 0.2)) * 0.07;
    transformed.z += waveA + waveB + waveC;
    vWave = transformed.z;
    vDistance = clamp((-position.y + 48.0) / 96.0, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const OCEAN_FRAGMENT_SHADER = `
  varying float vWave;
  varying float vDistance;

  void main() {
    vec3 deep = vec3(0.008, 0.055, 0.082);
    vec3 atlantic = vec3(0.018, 0.20, 0.24);
    vec3 crest = vec3(0.20, 0.58, 0.57);
    float crestMix = smoothstep(0.12, 0.31, vWave) * 0.34;
    vec3 color = mix(deep, atlantic, 0.34 + (vDistance * 0.38));
    color = mix(color, crest, crestMix);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function smoothRange(start: number, end: number, value: number): number {
  if (value <= start) return 0;
  if (value >= end) return 1;
  const t = (value - start) / (end - start);
  return t * t * (3 - 2 * t);
}

function CameraRig({
  progress,
  pointerX,
  pointerY,
}: Pick<Homepage3DSceneProps, 'progress' | 'pointerX' | 'pointerY'>) {
  const size = useThree((state) => state.size);
  const composition = size.width / Math.max(size.height, 1) < 0.88
    ? 'portrait'
    : 'landscape';
  const lastFov = useRef(48);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    const pose = sampleHomeCamera(progress.get(), composition);
    const parallaxX = pointerX.get() * 0.018;
    const parallaxY = pointerY.get() * 0.012;
    camera.position.set(
      pose.position[0] + parallaxX,
      pose.position[1] - parallaxY,
      pose.position[2]
    );
    target.set(
      pose.target[0] + parallaxX * 0.28,
      pose.target[1] - parallaxY * 0.2,
      pose.target[2]
    );
    camera.lookAt(target);
    if (camera instanceof THREE.PerspectiveCamera && Math.abs(lastFov.current - pose.fov) > 0.01) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
      lastFov.current = pose.fov;
    }
  });

  return null;
}

function Ocean({ quality }: Pick<Homepage3DSceneProps, 'quality'>) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const settings = HOME_3D_QUALITY_SETTINGS[quality];
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime!.value = clock.elapsedTime;
    }
  });

  return (
    <group>
      <mesh position={[0, -2.15, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry
          args={[
            72,
            108,
            settings.oceanSegments,
            Math.max(36, Math.round(settings.oceanSegments * 1.5)),
          ]}
        />
        <shaderMaterial
          ref={materialRef}
          vertexShader={OCEAN_VERTEX_SHADER}
          fragmentShader={OCEAN_FRAGMENT_SHADER}
          uniforms={uniforms}
        />
      </mesh>
      <mesh position={[0, 7.5, -54]} scale={[1.8, 0.55, 1]}>
        <sphereGeometry args={[10, 24, 12]} />
        <meshBasicMaterial
          color="#67c9c0"
          transparent
          opacity={0.075}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Atmosphere({ quality }: Pick<Homepage3DSceneProps, 'quality'>) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = HOME_3D_QUALITY_SETTINGS[quality].particles;
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    let seed = 4819;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let index = 0; index < count; index += 1) {
      values[index * 3] = (random() - 0.5) * 36;
      values[index * 3 + 1] = random() * 10 - 0.5;
      values[index * 3 + 2] = 10 - random() * 68;
    }
    return values;
  }, [count]);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.045) * 0.025;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#a6ded9"
        size={0.035}
        transparent
        opacity={0.35}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function TextSprite({
  text,
  position,
  scale = [2.4, 0.55, 1],
}: {
  text: string;
  position: readonly [number, number, number];
  scale?: readonly [number, number, number];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = 'rgba(3, 20, 30, 0.82)';
      context.beginPath();
      context.roundRect(4, 18, 504, 92, 36);
      context.fill();
      context.strokeStyle = 'rgba(92, 218, 208, 0.46)';
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = '#e0f2f1';
      context.font = '600 38px system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.direction = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
      context.fillText(text, 256, 65, 460);
    }
    const value = new THREE.CanvasTexture(canvas);
    value.colorSpace = THREE.SRGBColorSpace;
    value.minFilter = THREE.LinearFilter;
    value.generateMipmaps = false;
    return value;
  }, [text]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <sprite position={[...position]} scale={[...scale]}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

function ManagedLine({
  points,
  color,
  opacity,
}: {
  points: readonly THREE.Vector3[];
  color: THREE.ColorRepresentation;
  opacity: number;
}) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([...points]);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    return new THREE.Line(geometry, material);
  }, [color, opacity, points]);

  useEffect(() => () => {
    line.geometry.dispose();
    if (Array.isArray(line.material)) {
      line.material.forEach((material) => material.dispose());
    } else {
      line.material.dispose();
    }
  }, [line]);

  return <primitive object={line} />;
}

function projectSpots(spots: readonly Homepage3DSpot[]): WorldSpot[] {
  const positions = normalizeSpotPositions(spots);
  return positions.map((position) => {
    const source = spots.find((spot) => spot.id === position.id)!;
    return {
      ...source,
      position: [
        ((position.xPercent - 50) / 34) * 5.2,
        -1.15,
        -19 - ((position.yPercent - 50) / 34) * 5.6,
      ],
    };
  });
}

function SpotMarker({
  spot,
  index,
  progress,
  selected,
  showLabel,
}: {
  spot: WorldSpot;
  index: number;
  progress: MotionValue<number>;
  selected: boolean;
  showLabel: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const reveal = smoothRange(0.245 + index * 0.012, 0.34 + index * 0.012, progress.get());
    groupRef.current?.scale.setScalar(reveal);
    if (selected && pulseRef.current) {
      const cycle = (clock.elapsedTime * 0.42) % 1;
      pulseRef.current.scale.setScalar(0.75 + cycle * 1.65);
      const material = pulseRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - cycle) * 0.52;
    }
  });

  return (
    <group ref={groupRef} position={[...spot.position]} scale={0}>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.025, 0.045, 0.65, 8]} />
        <meshBasicMaterial color={selected ? '#79e2d6' : '#b3d9d7'} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[selected ? 0.13 : 0.09, 12, 8]} />
        <meshStandardMaterial
          color={selected ? '#55d4c8' : '#a1c9c7'}
          emissive={selected ? '#158b8d' : '#173e43'}
          emissiveIntensity={selected ? 1.3 : 0.3}
        />
      </mesh>
      {selected ? (
        <mesh ref={pulseRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.22, 0.25, 32]} />
          <meshBasicMaterial
            color="#62ddd1"
            transparent
            opacity={0.45}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      {showLabel ? <TextSprite text={spot.name} position={[0, 1.18, 0]} /> : null}
    </group>
  );
}

function FishingCoast({
  spots,
  progress,
  quality,
}: Pick<Homepage3DSceneProps, 'spots' | 'progress' | 'quality'>) {
  const size = useThree((state) => state.size);
  const showMarkerLabels = size.width / Math.max(size.height, 1) >= 0.88;
  const worldSpots = useMemo(() => projectSpots(spots), [spots]);
  const ordered = useMemo(
    () => [...worldSpots].sort((left, right) => right.latitude - left.latitude),
    [worldSpots]
  );
  const coastPoints = useMemo(() => {
    if (ordered.length === 0) {
      return [new THREE.Vector3(-0.8, -1.28, -15), new THREE.Vector3(0.4, -1.28, -25)];
    }
    if (ordered.length === 1) {
      const only = ordered[0]!;
      return [
        new THREE.Vector3(only.position[0] + 0.25, -1.28, only.position[2] + 2.4),
        new THREE.Vector3(only.position[0] + 0.45, -1.28, only.position[2]),
        new THREE.Vector3(only.position[0] + 0.7, -1.28, only.position[2] - 2.4),
      ];
    }
    return ordered.map((spot) => new THREE.Vector3(
      spot.position[0] + 0.45,
      -1.28,
      spot.position[2]
    ));
  }, [ordered]);
  const coastCurve = useMemo(
    () => new THREE.CatmullRomCurve3(coastPoints, false, 'centripetal'),
    [coastPoints]
  );
  const coastSegments = HOME_3D_QUALITY_SETTINGS[quality].coastSegments;
  const coastLinePoints = useMemo(
    () => coastCurve.getPoints(coastSegments),
    [coastCurve, coastSegments]
  );
  const shape = useMemo(() => {
    const value = new THREE.Shape();
    coastPoints.forEach((point, index) => {
      const x = point.x;
      const y = -point.z;
      if (index === 0) value.moveTo(x, y);
      else value.lineTo(x, y);
    });
    const last = coastPoints.at(-1)!;
    const first = coastPoints[0]!;
    value.lineTo(last.x + 11, -last.z - 2);
    value.lineTo(first.x + 11, -first.z + 2);
    value.closePath();
    return value;
  }, [coastPoints]);
  const bathymetry = useMemo(
    () => [1.1, 2.1, 3.2].map((offset) => coastLinePoints.map(
      (point) => new THREE.Vector3(point.x - offset, point.y - 0.025, point.z)
    )),
    [coastLinePoints]
  );

  return (
    <group>
      <mesh position={[0, -1.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[shape, 2]} />
        <meshStandardMaterial
          color="#123d3b"
          roughness={0.92}
          metalness={0.04}
          transparent
          opacity={0.96}
          side={THREE.DoubleSide}
        />
      </mesh>
      <ManagedLine points={coastLinePoints} color="#79d8ca" opacity={0.55} />
      {bathymetry.map((points, index) => (
        <ManagedLine key={index} points={points} color="#318f94" opacity={0.2 - index * 0.035} />
      ))}
      {worldSpots.map((spot, index) => (
        <SpotMarker
          key={spot.id}
          spot={spot}
          index={index}
          progress={progress}
          selected={spot.slug === 'tifnit'}
          showLabel={showMarkerLabels}
        />
      ))}
    </group>
  );
}

function SignalFlow({
  label,
  origin,
  labelScale,
  color,
  phase,
  progress,
  quality,
}: {
  label: string;
  origin: readonly [number, number, number];
  labelScale: readonly [number, number, number];
  color: THREE.ColorRepresentation;
  phase: number;
  progress: MotionValue<number>;
  quality: Exclude<Home3DQuality, 'fallback'>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const beadsRef = useRef<Array<THREE.Mesh | null>>([]);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...origin);
    const middle = start.clone().lerp(new THREE.Vector3(0, 0.2, -29), 0.52);
    middle.y += phase % 2 === 0 ? 0.65 : -0.35;
    middle.x *= 0.72;
    return new THREE.CatmullRomCurve3([
      start,
      middle,
      new THREE.Vector3(0, 0.2, -29),
    ], false, 'centripetal');
  }, [origin, phase]);
  const segments = HOME_3D_QUALITY_SETTINGS[quality].curveSegments;
  const beadCount = quality === 'high' ? 3 : 2;

  useFrame(({ clock }) => {
    const reveal = smoothRange(0.48, 0.59, progress.get());
    groupRef.current?.scale.setScalar(reveal);
    if (materialRef.current) materialRef.current.opacity = reveal * 0.32;
    beadsRef.current.forEach((bead, index) => {
      if (!bead) return;
      const amount = (clock.elapsedTime * 0.1 + phase + index / beadCount) % 1;
      bead.position.copy(curve.getPoint(amount));
    });
  });

  return (
    <group ref={groupRef} scale={0}>
      <mesh>
        <tubeGeometry args={[curve, segments, 0.022, 5, false]} />
        <meshBasicMaterial
          ref={materialRef}
          color={color}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      {Array.from({ length: beadCount }, (_, index) => (
        <mesh
          key={index}
          ref={(node) => { beadsRef.current[index] = node; }}
        >
          <sphereGeometry args={[0.075, 10, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
      <TextSprite text={label} position={[origin[0], origin[1] + 0.6, origin[2]]} scale={labelScale} />
    </group>
  );
}

function MarineIntelligence({
  labels,
  progress,
  quality,
}: Pick<Homepage3DSceneProps, 'labels' | 'progress' | 'quality'>) {
  const coreRef = useRef<THREE.Group>(null);
  const tideGroupRef = useRef<THREE.Group>(null);
  const tideRef = useRef<THREE.Mesh>(null);
  const size = useThree((state) => state.size);
  const composition = size.width / Math.max(size.height, 1) < 0.88
    ? 'portrait'
    : 'landscape';
  const origins = MARINE_SIGNAL_ORIGINS[composition];
  const labelScale = composition === 'portrait'
    ? [1.2, 0.34, 1] as const
    : [1.45, 0.38, 1] as const;

  useFrame(({ clock }) => {
    const reveal = smoothRange(0.5, 0.62, progress.get());
    coreRef.current?.scale.setScalar(reveal);
    tideGroupRef.current?.scale.setScalar(reveal);
    if (coreRef.current) coreRef.current.rotation.y = clock.elapsedTime * 0.12;
    if (tideRef.current) tideRef.current.position.y = 1.2 + Math.sin(clock.elapsedTime * 0.65) * 0.35;
  });

  return (
    <group>
      <SignalFlow label={labels.wind} origin={origins.wind} labelScale={labelScale} color="#78d7cf" phase={0.05} progress={progress} quality={quality} />
      <SignalFlow label={labels.waves} origin={origins.waves} labelScale={labelScale} color="#4fb6c4" phase={0.22} progress={progress} quality={quality} />
      <SignalFlow label={labels.swell} origin={origins.swell} labelScale={labelScale} color="#5798b3" phase={0.43} progress={progress} quality={quality} />
      <SignalFlow label={labels.tide} origin={origins.tide} labelScale={labelScale} color="#71c7b3" phase={0.64} progress={progress} quality={quality} />
      <SignalFlow label={labels.weather} origin={origins.weather} labelScale={labelScale} color="#d5a65e" phase={0.84} progress={progress} quality={quality} />

      <group ref={tideGroupRef} position={[...origins.tide]} scale={0}>
        <mesh>
          <boxGeometry args={[0.035, 1.45, 0.035]} />
          <meshBasicMaterial color="#71c7b3" transparent opacity={0.45} />
        </mesh>
        <mesh ref={tideRef} position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.11, 10, 8]} />
          <meshBasicMaterial color="#9ae2d5" />
        </mesh>
      </group>

      <group ref={coreRef} position={[0, 0.2, -29]} scale={0}>
        <mesh>
          <icosahedronGeometry args={[0.7, quality === 'high' ? 3 : 2]} />
          <meshStandardMaterial
            color="#1da9aa"
            emissive="#0b777d"
            emissiveIntensity={1.35}
            roughness={0.28}
            metalness={0.22}
          />
        </mesh>
        <mesh scale={1.45}>
          <icosahedronGeometry args={[0.7, 1]} />
          <meshBasicMaterial
            color="#79e2d6"
            wireframe
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
        <pointLight color="#58d5cd" intensity={2.2} distance={7} decay={2} />
      </group>
    </group>
  );
}

function DecisionWorld({ progress }: Pick<Homepage3DSceneProps, 'progress'>) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const reveal = smoothRange(0.79, 0.91, progress.get());
    groupRef.current?.scale.setScalar(0.76 + reveal * 0.24);
    if (groupRef.current) groupRef.current.visible = reveal > 0.005;
    if (haloRef.current) {
      haloRef.current.opacity = reveal * (0.07 + Math.sin(clock.elapsedTime * 0.4) * 0.015);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.15, -50]} visible={false}>
      <mesh>
        <boxGeometry args={[9.8, 5.8, 0.18]} />
        <meshStandardMaterial color="#062431" roughness={0.6} metalness={0.16} />
      </mesh>
      <mesh position={[0, 0, 0.12]}>
        <planeGeometry args={[9.35, 5.35]} />
        <meshBasicMaterial color="#031923" />
      </mesh>
      {[-3.55, -1.2, 1.2, 3.55].map((x) => (
        <mesh key={x} position={[x, 0.35, 0.23]}>
          <boxGeometry args={[1.85, 3.45, 0.08]} />
          <meshStandardMaterial color="#0a3541" roughness={0.72} metalness={0.08} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.5]} scale={[1.2, 0.85, 1]}>
        <sphereGeometry args={[6.6, 28, 16]} />
        <meshBasicMaterial
          ref={haloRef}
          color="#4cc9c2"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function Homepage3DScene(props: Homepage3DSceneProps) {
  return (
    <>
      <color attach="background" args={['#020d16']} />
      <fog attach="fog" args={['#03121b', 13, 62]} />
      <ambientLight intensity={0.55} color="#86b8b5" />
      <hemisphereLight args={['#7ad1cc', '#02101a', 0.95]} />
      <directionalLight position={[-8, 12, 5]} intensity={1.15} color="#d2e7df" />
      <CameraRig progress={props.progress} pointerX={props.pointerX} pointerY={props.pointerY} />
      <Ocean quality={props.quality} />
      <Atmosphere quality={props.quality} />
      <FishingCoast spots={props.spots} progress={props.progress} quality={props.quality} />
      <MarineIntelligence labels={props.labels} progress={props.progress} quality={props.quality} />
      <DecisionWorld progress={props.progress} />
    </>
  );
}
