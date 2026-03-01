import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
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
      <Grid
        position={[0, -0.04, -2.5]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#0d1a35"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#0d2244"
        fadeDistance={35}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

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
