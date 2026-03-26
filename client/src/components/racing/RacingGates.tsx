import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useRacing, GATE_DEFS } from "@/lib/stores/useRacing";
import { makeCurve, ALT_CLASS_A, ALT_CLASS_B } from "./RacingTrack";

const GATE_COLOR_MAP: Record<string, number> = {
  '#00FF88': 0x00ff88,
  '#00D4FF': 0x00d4ff,
  '#FF6B00': 0xff6b00,
};

const MID_ALT = (ALT_CLASS_A + ALT_CLASS_B) / 2;

// ─── Single Gate ─────────────────────────────────────────────────────────
function Gate({ gateDef, curveA }: {
  gateDef: typeof GATE_DEFS[number];
  curveA: THREE.CatmullRomCurve3;
}) {
  const ringRef    = useRef<THREE.Mesh>(null!);
  const glowRef    = useRef<THREE.Mesh>(null!);
  const frameRef   = useRef<THREE.Mesh>(null!);
  const light0Ref  = useRef<THREE.Mesh>(null!);
  const light1Ref  = useRef<THREE.Mesh>(null!);
  const light2Ref  = useRef<THREE.Mesh>(null!);
  const light3Ref  = useRef<THREE.Mesh>(null!);
  const gate       = useRacing(s => s.gates.find(g => g.id === gateDef.id)!);

  const { position, quaternion } = useMemo(() => {
    const pos = curveA.getPoint(gateDef.t);
    pos.y = MID_ALT;
    const tan    = curveA.getTangent(gateDef.t).normalize();
    const up     = new THREE.Vector3(0, 1, 0);
    const right  = new THREE.Vector3().crossVectors(up, tan).normalize();
    const trueUp = new THREE.Vector3().crossVectors(tan, right).normalize();
    const mat    = new THREE.Matrix4().makeBasis(right, trueUp, tan);
    const quat   = new THREE.Quaternion().setFromRotationMatrix(mat);
    return { position: pos, quaternion: quat };
  }, [curveA, gateDef.t]);

  const colorHex = GATE_COLOR_MAP[gateDef.color] ?? 0x888888;

  useFrame(() => {
    if (!ringRef.current || !glowRef.current) return;
    const isActive   = gate?.status === 'ACTIVE';
    const isComplete = gate?.status === 'COMPLETE';

    // Scale pulse when active
    const scale = isActive ? 1 + 0.25 * Math.sin(Date.now() * 0.008) : 1;
    ringRef.current.scale.setScalar(scale);
    glowRef.current.scale.setScalar(scale);
    if (frameRef.current) frameRef.current.scale.setScalar(scale);

    // Emissive state
    const mat = ringRef.current.material as THREE.MeshStandardMaterial;
    if (isComplete) {
      mat.emissiveIntensity = 2.0;
      mat.color.setHex(0x00ff88);
      mat.emissive.setHex(0x00ff88);
    } else if (isActive) {
      const pulse = 1.8 + 1.2 * Math.sin(Date.now() * 0.008);
      mat.emissiveIntensity = pulse;
      mat.color.setHex(colorHex);
      mat.emissive.setHex(colorHex);
    } else {
      mat.emissiveIntensity = 0.35;
      mat.color.setHex(0x444466);
      mat.emissive.setHex(0x444466);
    }

    // Threshold indicator lights — blink at 2 Hz when ACTIVE
    const blinkOn = isActive && Math.floor(Date.now() / 250) % 2 === 0;
    const blinkIntensity = blinkOn ? 3.0 : (isActive ? 0.3 : 0.15);
    const lightColor = isComplete ? 0x00ff88 : colorHex;
    [light0Ref, light1Ref, light2Ref, light3Ref].forEach(ref => {
      if (!ref.current) return;
      const m = ref.current.material as THREE.MeshStandardMaterial;
      m.emissive.setHex(lightColor);
      m.color.setHex(lightColor);
      m.emissiveIntensity = blinkIntensity;
    });
  });

  const outerR = 1.2;

  // Threshold light positions in gate-local space (cardinal points on ring plane)
  // Gate local: right=X, up=Y, forward=Z — lights sit on the ring in XY plane
  const thresholdLights = [
    [outerR,  0,  0],   // right
    [-outerR, 0,  0],   // left
    [0,  outerR,  0],   // top
    [0, -outerR,  0],   // bottom
  ] as [number, number, number][];

  const lightRefs = [light0Ref, light1Ref, light2Ref, light3Ref];

  return (
    <group position={position} quaternion={quaternion}>
      {/* Structural outer frame — thin halo ring */}
      <mesh ref={frameRef}>
        <torusGeometry args={[1.55, 0.022, 6, 48]} />
        <meshStandardMaterial
          color={colorHex} emissive={colorHex}
          emissiveIntensity={0.2} transparent opacity={0.6}
        />
      </mesh>

      {/* Main gate ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[outerR, 0.09, 10, 48]} />
        <meshStandardMaterial
          color={colorHex} emissive={colorHex}
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Glow ring */}
      <mesh ref={glowRef}>
        <torusGeometry args={[outerR, 0.28, 10, 48]} />
        <meshStandardMaterial
          color={colorHex} emissive={colorHex}
          emissiveIntensity={0.12}
          transparent opacity={0.18}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Inner fill — subtle gate plane */}
      <mesh>
        <circleGeometry args={[outerR - 0.09, 48]} />
        <meshStandardMaterial
          color={colorHex}
          transparent opacity={0.07}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Threshold indicator lights at cardinal positions */}
      {thresholdLights.map(([x, y, z], i) => (
        <mesh key={i} ref={lightRefs[i]} position={[x, y, z]}>
          <sphereGeometry args={[0.042, 8, 8]} />
          <meshStandardMaterial
            color={colorHex} emissive={colorHex}
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}

      {/* Gate label — shown in WAITING and ACTIVE states */}
      {gate?.status !== 'COMPLETE' && (
        <Text
          position={[0, outerR + 0.28, 0]}
          fontSize={0.115}
          color={gateDef.color}
          anchorX="center"
          anchorY="bottom"
          font={undefined}
          letterSpacing={0.05}
          outlineWidth={0.008}
          outlineColor="#000000"
        >
          {`${gateDef.id}  ·  ${gateDef.name.toUpperCase()}`}
        </Text>
      )}
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
