import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useRacing } from "@/lib/stores/useRacing";
import { RacingTrack, RacingVertiports } from "./RacingTrack";
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
  // Two grid layers for aviation airfield look
  const gridFine   = useMemo(() => new THREE.GridHelper(60, 60, 0x0a2040, 0x060f1e), []);
  const gridCoarse = useMemo(() => new THREE.GridHelper(12, 12, 0x1a4080, 0x0a2040), []);

  return (
    <>
      <SimLoop />

      {/* ── Atmosphere ─────────────────────────────────────────────────── */}
      <fogExp2 attach="fog" color="#000C1A" density={0.018} />
      <Stars radius={60} depth={40} count={3000} factor={3} saturation={0.5} fade speed={0} />

      {/* ── Lighting ────────────────────────────────────────────────────── */}
      {/* Low ambient — let emissive tracks dominate */}
      <ambientLight intensity={0.25} color="#001428" />
      {/* Sky/ground gradient — subtle blue sky, near-black ground */}
      <hemisphereLight args={["#001a4a", "#05080f", 0.8]} />
      {/* Main key light — sharp shadows */}
      <directionalLight
        position={[3, 15, 8]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {/* Colored fill lights — neon airfield color wash */}
      <pointLight position={[-12, 2, -8]} intensity={3.0} color="#00D4FF" distance={30} decay={2} />
      <pointLight position={[12,  2,  8]} intensity={3.0} color="#FF6B00" distance={30} decay={2} />
      <pointLight position={[0,   1, -12]} intensity={1.5} color="#8B5CF6" distance={20} decay={2} />

      {/* ── Ground ──────────────────────────────────────────────────────── */}
      {/* Semi-reflective airfield surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -2.5]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#030A14" metalness={0.25} roughness={0.12} />
      </mesh>
      {/* Fine grid — overall surface markings */}
      <primitive object={gridFine}   position={[0, -0.04, -2.5]} />
      {/* Coarse grid — major runway/sector divisions */}
      <primitive object={gridCoarse} position={[0, -0.035, -2.5]} />

      {/* ── Circuit ─────────────────────────────────────────────────────── */}
      <RacingTrack />
      <RacingVertiports />
      <RacingGates />
      <RacingVehicles />

      {/* ── Camera ──────────────────────────────────────────────────────── */}
      {/* Orbit centered on lollipop circuit — drag to rotate, scroll to zoom */}
      <OrbitControls
        target={[0, 0.8, 5]}
        enableDamping
        dampingFactor={0.06}
        enablePan={true}
        enableRotate={true}
        minDistance={4}
        maxDistance={60}
        minPolarAngle={0}
        maxPolarAngle={Math.PI * 0.92}
      />
    </>
  );
}
