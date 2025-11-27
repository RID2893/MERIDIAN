import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { CityRing } from "./CityRing";
import { AircraftRenderer } from "./Aircraft";
import { Pipelines } from "./Pipeline";
import { useSimulation } from "@/lib/stores/useSimulation";

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
