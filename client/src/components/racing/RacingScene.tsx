import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useRacing } from "@/lib/stores/useRacing";
import { RacingTrack } from "./RacingTrack";
import { RacingGates } from "./RacingGates";
import { RacingVehicles } from "./RacingVehicles";

// ─── Simulation loop ───────────────────────────────────────────────────────
function SimLoop() {
  const tick = useRacing(s => s.tick);
  const lastTime = useRef(0);

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    const delta = now - lastTime.current;
    lastTime.current = now;
    if (delta > 0 && delta < 0.5) tick(delta);
  });

  return null;
}

// ─── Scene ────────────────────────────────────────────────────────────────
export function RacingScene() {
  const gridHelper = useMemo(() =>
    new THREE.GridHelper(40, 40, 0x0d2244, 0x0d1a35), []
  );

  return (
    <>
      <SimLoop />

      {/* Lighting */}
      <ambientLight intensity={1.0} color="#001a3a" />
      <directionalLight
        position={[5, 20, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-8, 8, -8]} intensity={0.6} color="#004488" />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -2.5]} receiveShadow>
        <planeGeometry args={[40, 32]} />
        <meshStandardMaterial color="#020810" />
      </mesh>

      {/* Grid */}
      <primitive object={gridHelper} position={[0, -0.04, -2.5]} />

      {/* Circuit */}
      <RacingTrack />
      <RacingGates />
      <RacingVehicles />

      {/* Camera controls — orbit centered on the lollipop circuit */}
      <OrbitControls
        target={[0, 0.8, -1]}
        enablePan={true}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}
