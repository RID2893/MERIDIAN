import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRacing, GATE_DEFS } from "@/lib/stores/useRacing";
import { makeCurve, ALT_CLASS_A, ALT_CLASS_B } from "./RacingTrack";

const GATE_COLOR_MAP: Record<string, number> = {
  '#00FF88': 0x00ff88,
  '#00D4FF': 0x00d4ff,
  '#FF6B00': 0xff6b00,
};

// Each gate straddles both altitude bands — positioned at mid altitude
const MID_ALT = (ALT_CLASS_A + ALT_CLASS_B) / 2;

// ─── Single Gate ─────────────────────────────────────────────────────────
function Gate({ gateDef, curveA }: {
  gateDef: typeof GATE_DEFS[number];
  curveA: THREE.CatmullRomCurve3;
}) {
  const torusRef = useRef<THREE.Mesh>(null!);
  const glowRef  = useRef<THREE.Mesh>(null!);
  const gate     = useRacing(s => s.gates.find(g => g.id === gateDef.id)!);

  const { position, quaternion } = useMemo(() => {
    const pos = curveA.getPoint(gateDef.t);
    pos.y = MID_ALT;

    // Tangent along Class A curve to orient gate ring perpendicular to travel
    const tan = curveA.getTangent(gateDef.t).normalize();
    const up  = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, tan).normalize();
    const trueUp = new THREE.Vector3().crossVectors(tan, right).normalize();
    const mat = new THREE.Matrix4().makeBasis(right, trueUp, tan);
    const quat = new THREE.Quaternion().setFromRotationMatrix(mat);

    return { position: pos, quaternion: quat };
  }, [curveA, gateDef.t]);

  const colorHex = GATE_COLOR_MAP[gateDef.color] ?? 0x888888;

  useFrame((_, delta) => {
    if (!torusRef.current || !glowRef.current) return;
    const isActive = gate?.status === 'ACTIVE';
    const isComplete = gate?.status === 'COMPLETE';

    // Pulse scale when active
    if (isActive) {
      const scale = 1 + 0.2 * Math.sin(Date.now() * 0.006);
      torusRef.current.scale.setScalar(scale);
      glowRef.current.scale.setScalar(scale);
    } else {
      torusRef.current.scale.setScalar(1);
      glowRef.current.scale.setScalar(1);
    }

    // Emissive intensity
    const mat = torusRef.current.material as THREE.MeshStandardMaterial;
    if (isComplete) {
      mat.emissiveIntensity = 1.5;
      mat.color.setHex(0x00ff88);
      mat.emissive.setHex(0x00ff88);
    } else if (isActive) {
      mat.emissiveIntensity = 1.2 + 0.5 * Math.sin(Date.now() * 0.006);
      mat.color.setHex(colorHex);
      mat.emissive.setHex(colorHex);
    } else {
      mat.emissiveIntensity = 0.3;
      mat.color.setHex(gate?.status === 'WAITING' ? 0x444466 : colorHex);
      mat.emissive.setHex(gate?.status === 'WAITING' ? 0x444466 : colorHex);
    }
  });

  // Torus oriented vertically (gate arch the vehicles pass through)
  // TorusGeometry(outerR, tubeR, radialSegs, tubularSegs)
  // Gate spans GATE_HEIGHT — scale Y to match
  const outerR = 0.9;

  return (
    <group position={position} quaternion={quaternion}>
      {/* Main gate ring */}
      <mesh ref={torusRef}>
        <torusGeometry args={[outerR, 0.06, 8, 32]} />
        <meshStandardMaterial
          color={colorHex}
          emissive={colorHex}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Glow ring */}
      <mesh ref={glowRef}>
        <torusGeometry args={[outerR, 0.18, 8, 32]} />
        <meshStandardMaterial
          color={colorHex}
          emissive={colorHex}
          emissiveIntensity={0.1}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Inner fill quad (very transparent) */}
      <mesh>
        <circleGeometry args={[outerR - 0.06, 32]} />
        <meshStandardMaterial
          color={colorHex}
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ─── All Gates ────────────────────────────────────────────────────────────
export function RacingGates() {
  const curveA = useMemo(() => makeCurve(ALT_CLASS_A), []);

  return (
    <group>
      {GATE_DEFS.map(g => (
        <Gate key={g.id} gateDef={g} curveA={curveA} />
      ))}
    </group>
  );
}
