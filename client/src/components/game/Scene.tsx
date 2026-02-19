import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { CityRing } from "./CityRing";
import { AircraftRenderer } from "./Aircraft";
import { Pipelines } from "./Pipeline";
import { WeatherEffects } from "./Weather";
import { useSimulation, RING_CONFIGS, type Aircraft } from "@/lib/stores/useSimulation";
import { useWeather } from "@/lib/stores/useWeather";

const SD_POSITION: [number, number, number] = [-12, 0, 0];
const LA_POSITION: [number, number, number] = [12, 0, 8];

function Lights() {
  return (
    <>
      <ambientLight intensity={1.2} color={0x00ffff} />
      <directionalLight
        position={[10, 30, 10]}
        intensity={1.5}
        color={0xffffff}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <pointLight position={SD_POSITION} intensity={1} color={0x00ffff} distance={40} />
      <pointLight position={LA_POSITION} intensity={1} color={0x00ffff} distance={40} />
      <pointLight position={[0, 15, 0]} intensity={1} color={0xffffff} distance={50} />
    </>
  );
}

function GroundPlane() {
  return (
    <group position={[0, -0.5, 4]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial
          color={0x1a1a2e}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      <Grid
        position={[0, 0.01, 0]}
        args={[60, 40]}
        cellSize={2}
        cellThickness={0.5}
        cellColor={0x333355}
        sectionSize={10}
        sectionThickness={1}
        sectionColor={0x444477}
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
      />
    </group>
  );
}

function SimulationLoop() {
  const tick = useSimulation((state) => state.tick);
  const isPlaying = useSimulation((state) => state.isPlaying);
  const lastTime = useRef(0);
  
  useFrame((state) => {
    if (!isPlaying) {
      lastTime.current = state.clock.elapsedTime;
      return;
    }
    
    const deltaTime = state.clock.elapsedTime - lastTime.current;
    lastTime.current = state.clock.elapsedTime;
    
    if (deltaTime > 0 && deltaTime < 0.5) {
      tick(deltaTime);
    }
  });
  
  return null;
}

function WeatherLayer() {
  const weather = useWeather();
  return (
    <WeatherEffects
      visibility={weather.visibility}
      windSpeed={weather.windSpeed}
      windDirection={weather.windDirection}
      precipitation={weather.precipitation}
      precipitationType={weather.precipitationType}
      cloudCover={weather.cloudCover}
      thunderstorm={weather.thunderstorm}
      enabled={weather.enabled}
    />
  );
}

// ============================================================================
// SAFETY ALERT VISUALIZATION
// Yellow Alert: <750ft projected | Red Alert: <500ft | Emergency: immediate
// ============================================================================

interface ConflictPair {
  posA: THREE.Vector3;
  posB: THREE.Vector3;
  distance: number;
  severity: 'YELLOW' | 'RED' | 'EMERGENCY';
}

function getAircraftPosition(ac: Aircraft): THREE.Vector3 | null {
  if (ac.status === 'landed') return null;
  const cityPos = ac.cityId === "San Diego" ? SD_POSITION :
                  ac.cityId === "Los Angeles" ? LA_POSITION :
                  ac.originCity === "San Diego" ? SD_POSITION : LA_POSITION;
  if (ac.status === 'in_ring' || ac.status === 'descending' || ac.status === 'ascending') {
    const angleRad = (ac.angleOnRing * Math.PI) / 180;
    return new THREE.Vector3(
      cityPos[0] + Math.cos(angleRad) * ac.distanceFromCenter,
      cityPos[1] + (ac.altitude / 1250) * 2,
      cityPos[2] + Math.sin(angleRad) * ac.distanceFromCenter
    );
  }
  return null;
}

function ConflictAlerts() {
  const aircraft = useSimulation((state) => state.aircraft);
  const lineRef = useRef<THREE.LineSegments>(null);

  // Proximity threshold in 3D scene units (~1.5 units = close enough for alert)
  const YELLOW_DIST = 2.0;
  const RED_DIST = 1.2;
  const EMERGENCY_DIST = 0.6;

  const { positions, colors } = useMemo(() => {
    const conflicts: ConflictPair[] = [];
    const ringAircraft = aircraft.filter(a => a.status === 'in_ring' || a.status === 'descending' || a.status === 'ascending');

    for (let i = 0; i < ringAircraft.length; i++) {
      const posA = getAircraftPosition(ringAircraft[i]);
      if (!posA) continue;
      for (let j = i + 1; j < ringAircraft.length; j++) {
        const posB = getAircraftPosition(ringAircraft[j]);
        if (!posB) continue;
        const dist = posA.distanceTo(posB);
        if (dist < YELLOW_DIST) {
          const severity = dist < EMERGENCY_DIST ? 'EMERGENCY' : dist < RED_DIST ? 'RED' : 'YELLOW';
          conflicts.push({ posA, posB, distance: dist, severity });
        }
      }
    }

    const pos = new Float32Array(conflicts.length * 6);
    const col = new Float32Array(conflicts.length * 6);

    conflicts.forEach((c, i) => {
      const i6 = i * 6;
      pos[i6] = c.posA.x; pos[i6 + 1] = c.posA.y; pos[i6 + 2] = c.posA.z;
      pos[i6 + 3] = c.posB.x; pos[i6 + 4] = c.posB.y; pos[i6 + 5] = c.posB.z;

      const r = c.severity === 'EMERGENCY' ? 1 : c.severity === 'RED' ? 1 : 1;
      const g = c.severity === 'EMERGENCY' ? 0 : c.severity === 'RED' ? 0.2 : 0.8;
      const b = 0;
      col[i6] = r; col[i6 + 1] = g; col[i6 + 2] = b;
      col[i6 + 3] = r; col[i6 + 4] = g; col[i6 + 5] = b;
    });

    return { positions: pos, colors: col, count: conflicts.length };
  }, [aircraft]);

  useFrame((state) => {
    if (!lineRef.current) return;
    const mat = lineRef.current.material as THREE.LineBasicMaterial;
    mat.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 6) * 0.3;
  });

  if (positions.length === 0) return null;

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.8} linewidth={2} />
    </lineSegments>
  );
}

export function Scene() {
  return (
    <>
      <color attach="background" args={[0x001a2e]} />
      <fog attach="fog" args={[0x001a2e, 20, 80]} />
      
      <Lights />
      <GroundPlane />
      
      <CityRing cityId="San Diego" position={SD_POSITION} />
      <CityRing cityId="Los Angeles" position={LA_POSITION} />
      
      <Pipelines />
      <AircraftRenderer />

      {/* Safety alert lines between close aircraft */}
      <ConflictAlerts />

      {/* Weather visualization layer - connected to Zustand store */}
      <WeatherLayer />

      <SimulationLoop />
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={60}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 4]}
      />
    </>
  );
}
