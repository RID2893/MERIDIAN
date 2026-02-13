/**
 * MERIDIAN - Weather 3D Visualization Component
 * Renders dynamic weather effects in the R3F scene
 *
 * Effects include:
 * - Dynamic fog based on visibility
 * - Rain particle system
 * - Wind direction indicators
 * - Cloud layers
 * - Storm cell indicators
 * - Weather gradient overlays
 */

import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// ============================================================================
// TYPES
// ============================================================================

export interface WeatherVisualizationProps {
  /** Visibility in meters (affects fog) */
  visibility: number;
  /** Wind speed in m/s */
  windSpeed: number;
  /** Wind direction in degrees */
  windDirection: number;
  /** Precipitation rate in mm/h */
  precipitation: number;
  /** Precipitation type */
  precipitationType: 'NONE' | 'RAIN' | 'SNOW' | 'SLEET' | 'HAIL';
  /** Cloud cover percentage (0-100) */
  cloudCover: number;
  /** Thunderstorm active */
  thunderstorm: boolean;
  /** Whether weather effects are enabled */
  enabled: boolean;
}

// ============================================================================
// RAIN PARTICLE SYSTEM
// ============================================================================

const MAX_RAIN = 3000;
const MAX_SNOW = 2000;

function RainSystem({
  intensity,
  windSpeed,
  windDirection,
}: {
  intensity: number; // 0-1
  windSpeed: number;
  windDirection: number;
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array>(new Float32Array(MAX_RAIN * 3));
  const count = Math.floor(intensity * MAX_RAIN);

  // Allocate max-size buffer once, never resize
  const positions = useMemo(() => {
    const pos = new Float32Array(MAX_RAIN * 3);
    const vel = velocitiesRef.current;
    for (let i = 0; i < MAX_RAIN; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * 60;
      pos[i3 + 1] = Math.random() * 8;
      pos[i3 + 2] = (Math.random() - 0.5) * 40;
      vel[i3] = 0;
      vel[i3 + 1] = -8 - Math.random() * 4;
      vel[i3 + 2] = 0;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current) return;
    const geom = particlesRef.current.geometry;

    // Update draw range so only active particles render
    geom.setDrawRange(0, count);

    if (count === 0) return;

    const posArray = geom.attributes.position.array as Float32Array;
    const vel = velocitiesRef.current;
    const windRad = (windDirection * Math.PI) / 180;
    const windX = Math.sin(windRad) * windSpeed * 0.1;
    const windZ = Math.cos(windRad) * windSpeed * 0.1;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      posArray[i3] += (vel[i3] + windX) * delta;
      posArray[i3 + 1] += vel[i3 + 1] * delta;
      posArray[i3 + 2] += (vel[i3 + 2] + windZ) * delta;

      if (posArray[i3 + 1] < -1) {
        posArray[i3] = (Math.random() - 0.5) * 60;
        posArray[i3 + 1] = 6 + Math.random() * 2;
        posArray[i3 + 2] = (Math.random() - 0.5) * 40;
      }
    }

    geom.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry drawRange={{ start: 0, count }}>
        <bufferAttribute
          attach="attributes-position"
          count={MAX_RAIN}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={0x8899aa}
        size={0.05}
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ============================================================================
// SNOW PARTICLE SYSTEM
// ============================================================================

function SnowSystem({
  intensity,
  windSpeed,
  windDirection,
}: {
  intensity: number;
  windSpeed: number;
  windDirection: number;
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = Math.floor(intensity * MAX_SNOW);

  // Allocate max-size buffer once, never resize
  const positions = useMemo(() => {
    const pos = new Float32Array(MAX_SNOW * 3);
    for (let i = 0; i < MAX_SNOW; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * 60;
      pos[i3 + 1] = Math.random() * 8;
      pos[i3 + 2] = (Math.random() - 0.5) * 40;
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    const geom = particlesRef.current.geometry;

    // Update draw range so only active particles render
    geom.setDrawRange(0, count);

    if (count === 0) return;

    const posArray = geom.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;
    const windRad = (windDirection * Math.PI) / 180;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      posArray[i3] += (Math.sin(time + i) * 0.02 + Math.sin(windRad) * windSpeed * 0.02) * delta * 60;
      posArray[i3 + 1] -= (1 + Math.random() * 0.5) * delta;
      posArray[i3 + 2] += (Math.cos(time + i) * 0.02 + Math.cos(windRad) * windSpeed * 0.02) * delta * 60;

      if (posArray[i3 + 1] < -1) {
        posArray[i3] = (Math.random() - 0.5) * 60;
        posArray[i3 + 1] = 6 + Math.random() * 2;
        posArray[i3 + 2] = (Math.random() - 0.5) * 40;
      }
    }

    geom.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry drawRange={{ start: 0, count }}>
        <bufferAttribute
          attach="attributes-position"
          count={MAX_SNOW}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={0xffffff}
        size={0.12}
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ============================================================================
// WIND INDICATOR
// ============================================================================

function WindIndicator({
  speed,
  direction,
  position,
}: {
  speed: number;
  direction: number;
  position: [number, number, number];
}) {
  const arrowRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!arrowRef.current) return;
    // Rotate arrow to point in wind direction
    arrowRef.current.rotation.y = -(direction * Math.PI) / 180;
  });

  // Scale arrow length by wind speed (capped at 20 m/s)
  const arrowLength = Math.min(3, speed * 0.15);
  const arrowColor = speed > 15 ? 0xff4444 : speed > 10 ? 0xffaa00 : 0x44ff44;

  return (
    <group ref={arrowRef} position={position}>
      {/* Arrow shaft */}
      <mesh position={[0, 0, arrowLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, arrowLength, 6]} />
        <meshStandardMaterial
          color={arrowColor}
          transparent
          opacity={0.7}
          emissive={arrowColor}
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Arrow head */}
      <mesh position={[0, 0, arrowLength]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.3, 6]} />
        <meshStandardMaterial
          color={arrowColor}
          transparent
          opacity={0.7}
          emissive={arrowColor}
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Speed label - simple sphere as indicator */}
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color={arrowColor}
          emissive={arrowColor}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// CLOUD LAYER
// ============================================================================

function CloudLayer({ coverage, height }: { coverage: number; height: number }) {
  const cloudCount = Math.floor(coverage * 0.2); // Max ~20 clouds at 100%

  const clouds = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < cloudCount; i++) {
      positions.push([
        (Math.random() - 0.5) * 50,
        height + Math.random() * 2,
        (Math.random() - 0.5) * 35,
      ]);
    }
    return positions;
  }, [cloudCount, height]);

  return (
    <group>
      {clouds.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[2 + Math.random() * 3, 8, 6]} />
          <meshStandardMaterial
            color={0x667788}
            transparent
            opacity={0.15 + coverage * 0.002}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// LIGHTNING FLASH
// ============================================================================

function LightningFlash({ active }: { active: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const lastFlash = useRef(0);
  const flashDuration = useRef(0);

  useFrame((state) => {
    if (!lightRef.current || !active) {
      if (lightRef.current) lightRef.current.intensity = 0;
      return;
    }

    const time = state.clock.elapsedTime;

    // Random lightning flashes
    if (time - lastFlash.current > 3 + Math.random() * 8) {
      lastFlash.current = time;
      flashDuration.current = 0.05 + Math.random() * 0.1;
      lightRef.current.position.set(
        (Math.random() - 0.5) * 40,
        5 + Math.random() * 4,
        (Math.random() - 0.5) * 30
      );
    }

    // Flash decay
    const timeSinceFlash = time - lastFlash.current;
    if (timeSinceFlash < flashDuration.current) {
      lightRef.current.intensity = 50 * (1 - timeSinceFlash / flashDuration.current);
    } else {
      lightRef.current.intensity = 0;
    }
  });

  if (!active) return null;

  return <pointLight ref={lightRef} color={0xeeeeff} intensity={0} distance={80} />;
}

// ============================================================================
// MAIN WEATHER COMPONENT
// ============================================================================

export function WeatherEffects({
  visibility = 30000,
  windSpeed = 5,
  windDirection = 180,
  precipitation = 0,
  precipitationType = 'NONE',
  cloudCover = 20,
  thunderstorm = false,
  enabled = true,
}: Partial<WeatherVisualizationProps>) {
  if (!enabled) return null;

  // Normalize precipitation intensity (0-1)
  const precipIntensity = Math.min(1, precipitation / 20);

  // Fog distance based on visibility (closer = denser fog)
  const fogNear = Math.max(5, visibility / 2000);
  const fogFar = Math.max(20, visibility / 500);

  return (
    <group>
      {/* Dynamic fog - overrides scene fog based on visibility */}
      <fog attach="fog" args={[0x001a2e, fogNear, fogFar]} />

      {/* Rain particles */}
      {(precipitationType === 'RAIN' || precipitationType === 'SLEET') && (
        <RainSystem
          intensity={precipIntensity}
          windSpeed={windSpeed}
          windDirection={windDirection}
        />
      )}

      {/* Snow particles */}
      {(precipitationType === 'SNOW') && (
        <SnowSystem
          intensity={precipIntensity}
          windSpeed={windSpeed}
          windDirection={windDirection}
        />
      )}

      {/* Wind indicators at key locations */}
      <WindIndicator speed={windSpeed} direction={windDirection} position={[-12, 3, 0]} />
      <WindIndicator speed={windSpeed} direction={windDirection} position={[12, 3, 8]} />
      <WindIndicator speed={windSpeed} direction={windDirection} position={[0, 3, 4]} />

      {/* Cloud layer */}
      {cloudCover > 10 && (
        <CloudLayer coverage={cloudCover} height={6} />
      )}

      {/* Lightning */}
      <LightningFlash active={thunderstorm} />
    </group>
  );
}
