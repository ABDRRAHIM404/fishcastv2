'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { MotionValue } from 'framer-motion';
import * as THREE from 'three';
import {
  HOME_3D_QUALITY_SETTINGS,
  homeVisualPresence,
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
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying float vCrest;
  varying float vDistance;

  float directionalWave(
    vec2 point,
    vec2 direction,
    float frequency,
    float amplitude,
    float speed,
    float time
  ) {
    return sin(dot(point, normalize(direction)) * frequency + time * speed) * amplitude;
  }

  float oceanHeight(vec2 point, float time) {
    return
      directionalWave(point, vec2(1.0, 0.18), 0.48, 0.12, 0.45, time) +
      directionalWave(point, vec2(-0.36, 1.0), 0.25, 0.16, -0.31, time) +
      directionalWave(point, vec2(0.72, 1.0), 0.78, 0.045, 0.62, time) +
      directionalWave(point, vec2(-1.0, 0.54), 1.24, 0.018, -0.83, time);
  }

  void main() {
    vec3 transformed = position;
    float height = oceanHeight(position.xy, uTime);
    float sampleDistance = 0.12;
    float heightX = oceanHeight(position.xy + vec2(sampleDistance, 0.0), uTime);
    float heightY = oceanHeight(position.xy + vec2(0.0, sampleDistance), uTime);
    vec3 localNormal = normalize(vec3(
      -(heightX - height) / sampleDistance,
      -(heightY - height) / sampleDistance,
      1.0
    ));

    transformed.z += height;
    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
    vCrest = height;
    vDistance = clamp((-position.y + 48.0) / 96.0, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const OCEAN_FRAGMENT_SHADER = `
  uniform vec3 uSunDirection;
  uniform float uPresence;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying float vCrest;
  varying float vDistance;

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 sunDirection = normalize(uSunDirection);

    float facing = clamp(dot(normal, viewDirection), 0.0, 1.0);
    float fresnel = 0.035 + 0.965 * pow(1.0 - facing, 5.0);
    float diffuse = max(dot(normal, sunDirection), 0.0);
    float sunGlint = pow(
      max(dot(reflect(-sunDirection, normal), viewDirection), 0.0),
      92.0
    );
    float broadGlint = pow(
      max(dot(reflect(-sunDirection, normal), viewDirection), 0.0),
      18.0
    );
    float foam = smoothstep(0.205, 0.305, vCrest);

    vec3 deepWater = vec3(0.006, 0.075, 0.095);
    vec3 atlantic = vec3(0.018, 0.205, 0.225);
    vec3 reflectedSky = vec3(0.18, 0.37, 0.40);
    vec3 warmSun = vec3(1.0, 0.56, 0.27);
    vec3 seaFoam = vec3(0.68, 0.83, 0.79);

    vec3 color = mix(deepWater, atlantic, 0.32 + vDistance * 0.28 + diffuse * 0.12);
    color = mix(color, reflectedSky, fresnel * 0.55);
    color += warmSun * (sunGlint * 0.8 + broadGlint * 0.08);
    color = mix(color, seaFoam, foam * 0.52);

    // The photograph supplies fine coastal detail. The WebGL surface remains
    // translucent, contributing real depth, light and moving water highlights.
    float horizonFade = smoothstep(0.02, 0.22, vDistance);
    float alpha = uPresence * horizonFade * (0.28 + fresnel * 0.2 + foam * 0.24 + sunGlint * 0.2);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.78));
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

function Ocean({ quality, progress }: Pick<Homepage3DSceneProps, 'quality' | 'progress'>) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const settings = HOME_3D_QUALITY_SETTINGS[quality];
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSunDirection: { value: new THREE.Vector3(-0.7, 0.34, 0.62).normalize() },
    uPresence: { value: 1 },
  }), []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      const presence = homeVisualPresence('ocean', progress.get());
      materialRef.current.uniforms.uPresence!.value = presence;
      materialRef.current.visible = presence > 0.003;
      if (presence > 0.003) {
        materialRef.current.uniforms.uTime!.value = clock.elapsedTime;
      }
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
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Atmosphere({ quality, progress }: Pick<Homepage3DSceneProps, 'quality' | 'progress'>) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
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
    const presence = homeVisualPresence('ocean', progress.get());
    if (pointsRef.current) {
      pointsRef.current.visible = presence > 0.003;
      if (presence > 0.003) {
        pointsRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.045) * 0.025;
      }
    }
    if (materialRef.current) materialRef.current.opacity = presence * 0.35;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
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
      context.font = '600 46px system-ui, sans-serif';
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
    const storyProgress = progress.get();
    const reveal = smoothRange(
      0.245 + index * 0.012,
      0.34 + index * 0.012,
      storyProgress
    ) * homeVisualPresence('coast', storyProgress);
    if (groupRef.current) {
      groupRef.current.visible = reveal > 0.003;
      groupRef.current.scale.setScalar(reveal);
    }
    if (reveal <= 0.003) return;
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
  const groupRef = useRef<THREE.Group>(null);
  const terrainMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const shorelineMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
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
        new THREE.Vector3(only.position[0] - 0.65, -1.28, only.position[2] + 2.4),
        new THREE.Vector3(only.position[0] - 0.45, -1.28, only.position[2]),
        new THREE.Vector3(only.position[0] - 0.2, -1.28, only.position[2] - 2.4),
      ];
    }
    return ordered.map((spot) => new THREE.Vector3(
      // The Atlantic is west/left in this language-neutral world. Keep the
      // real spot marker just inland (east/right) of the shoreline.
      spot.position[0] - 0.45,
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
  const shorelineCurve = useMemo(
    () => new THREE.CatmullRomCurve3(
      coastPoints.map((point) => new THREE.Vector3(point.x, -2.02, point.z)),
      false,
      'centripetal'
    ),
    [coastPoints]
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
      (point) => new THREE.Vector3(point.x - offset, -2.04, point.z)
    )),
    [coastLinePoints]
  );
  const landContours = useMemo(
    () => [0.75, 1.55].map((offset) => coastLinePoints.map(
      (point, index) => new THREE.Vector3(
        point.x + offset,
        point.y + 0.16 + Math.sin(index * 0.72 + offset) * 0.035,
        point.z
      )
    )),
    [coastLinePoints]
  );

  useFrame(() => {
    const storyProgress = progress.get();
    const reveal = homeVisualPresence('coast', storyProgress);
    if (groupRef.current) {
      groupRef.current.visible = reveal > 0.006;
      groupRef.current.position.y = (1 - reveal) * -0.12;
    }
    if (terrainMaterialRef.current) terrainMaterialRef.current.opacity = reveal * 0.98;
    if (shorelineMaterialRef.current) shorelineMaterialRef.current.opacity = reveal * 0.62;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh position={[0, -1.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <extrudeGeometry
          args={[shape, {
            depth: quality === 'high' ? 0.62 : 0.5,
            bevelEnabled: true,
            bevelSegments: quality === 'high' ? 2 : 1,
            bevelSize: quality === 'low' ? 0.06 : 0.1,
            bevelThickness: quality === 'low' ? 0.06 : 0.1,
            curveSegments: quality === 'high' ? 4 : 2,
            steps: 1,
          }]}
        />
        <meshStandardMaterial
          ref={terrainMaterialRef}
          color="#756047"
          emissive="#21170e"
          emissiveIntensity={0.28}
          roughness={0.98}
          metalness={0}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <tubeGeometry args={[shorelineCurve, coastSegments, quality === 'low' ? 0.025 : 0.04, 5, false]} />
        <meshBasicMaterial
          ref={shorelineMaterialRef}
          color="#d2ded1"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {bathymetry.map((points, index) => (
        <ManagedLine key={index} points={points} color="#5f9ea0" opacity={0.16 - index * 0.03} />
      ))}
      {landContours.map((points, index) => (
        <ManagedLine key={index} points={points} color="#9d8664" opacity={0.16 - index * 0.035} />
      ))}
      {worldSpots.map((spot, index) => (
        <SpotMarker
          key={spot.id}
          spot={spot}
          index={index}
          progress={progress}
          selected={spot.slug === 'tifnit'}
          showLabel={showMarkerLabels && spot.slug === 'tifnit'}
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
    const storyProgress = progress.get();
    const reveal = homeVisualPresence('marine', storyProgress);
    if (groupRef.current) {
      groupRef.current.visible = reveal > 0.003;
      groupRef.current.scale.setScalar(reveal);
    }
    if (materialRef.current) materialRef.current.opacity = reveal * 0.22;
    if (reveal <= 0.003) return;
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
  const reticleRef = useRef<THREE.Group>(null);
  const tideGroupRef = useRef<THREE.Group>(null);
  const tideRef = useRef<THREE.Mesh>(null);
  const size = useThree((state) => state.size);
  const composition = size.width / Math.max(size.height, 1) < 0.88
    ? 'portrait'
    : 'landscape';
  const origins = MARINE_SIGNAL_ORIGINS[composition];
  const labelScale = composition === 'portrait'
    ? [1.6, 0.48, 1] as const
    : [1.45, 0.38, 1] as const;

  useFrame(({ clock }) => {
    const storyProgress = progress.get();
    const reveal = homeVisualPresence('marine', storyProgress);
    if (coreRef.current) {
      coreRef.current.visible = reveal > 0.003;
      coreRef.current.scale.setScalar(reveal);
    }
    if (tideGroupRef.current) {
      tideGroupRef.current.visible = reveal > 0.003;
      tideGroupRef.current.scale.setScalar(reveal);
    }
    if (reveal <= 0.003) return;
    if (reticleRef.current) reticleRef.current.rotation.z = clock.elapsedTime * 0.075;
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
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.14, quality === 'high' ? 48 : 28]} />
          <meshStandardMaterial
            color="#123c43"
            emissive="#0a5458"
            emissiveIntensity={0.58}
            roughness={0.24}
            metalness={0.46}
            transparent
            opacity={0.92}
          />
        </mesh>
        <mesh position={[0, 0, 0.085]}>
          <circleGeometry args={[0.58, quality === 'high' ? 48 : 28]} />
          <meshBasicMaterial
            color="#0e6970"
            transparent
            opacity={0.34}
            depthWrite={false}
          />
        </mesh>
        <group ref={reticleRef} position={[0, 0, 0.13]}>
          <mesh>
            <ringGeometry args={[0.42, 0.445, quality === 'high' ? 48 : 28]} />
            <meshBasicMaterial color="#86d7cf" transparent opacity={0.5} depthWrite={false} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.17, 0.18, 32]} />
            <meshBasicMaterial color="#d5ad68" transparent opacity={0.65} depthWrite={false} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.94, 0.012, 0.012]} />
            <meshBasicMaterial color="#8adbd2" transparent opacity={0.34} depthWrite={false} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.012, 0.94, 0.012]} />
            <meshBasicMaterial color="#8adbd2" transparent opacity={0.34} depthWrite={false} />
          </mesh>
        </group>
        <pointLight color="#61cfc5" intensity={0.85} distance={4.5} decay={2} />
      </group>
    </group>
  );
}

function DecisionWorld({ progress }: Pick<Homepage3DSceneProps, 'progress'>) {
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.MeshBasicMaterial>(null);
  const frameMaterialsRef = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const accentMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const reveal = homeVisualPresence('decision', progress.get());
    groupRef.current?.scale.setScalar(0.76 + reveal * 0.24);
    if (groupRef.current) groupRef.current.visible = reveal > 0.005;
    if (reveal <= 0.005) return;
    if (haloRef.current) {
      haloRef.current.opacity = reveal * (0.07 + Math.sin(clock.elapsedTime * 0.4) * 0.015);
    }
    frameMaterialsRef.current.forEach((material) => {
      if (material) material.opacity = reveal * 0.24;
    });
    if (accentMaterialRef.current) accentMaterialRef.current.opacity = reveal * 0.42;
  });

  return (
    <group ref={groupRef} position={[0, 0.15, -50]} visible={false}>
      <mesh position={[0, 0, -0.035]}>
        <planeGeometry args={[9.35, 5.25]} />
        <meshBasicMaterial
          ref={haloRef}
          color="#092d37"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {[
        { key: 'top', position: [0, 2.62, 0] as const, size: [9.35, 0.018, 0.018] as const },
        { key: 'bottom', position: [0, -2.62, 0] as const, size: [9.35, 0.018, 0.018] as const },
        { key: 'start', position: [-4.67, 0, 0] as const, size: [0.018, 5.25, 0.018] as const },
        { key: 'end', position: [4.67, 0, 0] as const, size: [0.018, 5.25, 0.018] as const },
      ].map(({ key, position, size }, index) => (
        <mesh key={key} position={[...position]}>
          <boxGeometry args={[...size]} />
          <meshBasicMaterial
            ref={(material) => { frameMaterialsRef.current[index] = material; }}
            color="#76c9c3"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
      <mesh position={[0, -2.61, 0.025]}>
        <boxGeometry args={[2.4, 0.035, 0.025]} />
        <meshBasicMaterial
          ref={accentMaterialRef}
          color="#d4a35d"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function Homepage3DScene(props: Homepage3DSceneProps) {
  return (
    <>
      <fog attach="fog" args={['#03121b', 13, 62]} />
      <ambientLight intensity={0.55} color="#86b8b5" />
      <hemisphereLight args={['#7ad1cc', '#02101a', 0.95]} />
      <directionalLight position={[-8, 12, 5]} intensity={1.15} color="#d2e7df" />
      <CameraRig progress={props.progress} pointerX={props.pointerX} pointerY={props.pointerY} />
      <Ocean quality={props.quality} progress={props.progress} />
      <Atmosphere quality={props.quality} progress={props.progress} />
      <FishingCoast spots={props.spots} progress={props.progress} quality={props.quality} />
      <MarineIntelligence labels={props.labels} progress={props.progress} quality={props.quality} />
      <DecisionWorld progress={props.progress} />
    </>
  );
}
