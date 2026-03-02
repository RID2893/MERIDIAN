import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRacing, VEHICLE_CONFIGS } from "@/lib/stores/useRacing";
import { makeCurve, ALT_CLASS_A, ALT_CLASS_B } from "./RacingTrack";

const UP = new THREE.Vector3(0, 1, 0);
const TRAIL_LENGTH = 40;

// Lateral offset so Class A and B don't overlap visually
const LATERAL_OFFSET: Record<'A' | 'B', number> = { A: +0.35, B: -0.35 };

// ─── Single Vehicle ───────────────────────────────────────────────────────
function Vehicle({ vehicleId }: { vehicleId: string }) {
  const cfg       = VEHICLE_CONFIGS.find(c => c.id === vehicleId)!;
  const altY      = cfg.vehicleClass === 'A' ? ALT_CLASS_A : ALT_CLASS_B;
  const curve     = useMemo(() => makeCurve(altY), [altY]);

  const meshRef  = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);

  // Trail: ring buffer of positions
  const trailPositions = useRef<THREE.Vector3[]>([]);
  const trailRef = useRef<THREE.Line>(null!);
  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(TRAIL_LENGTH * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return geo;
  }, []);

  const colorHex  = useMemo(() => new THREE.Color(cfg.color), [cfg.color]);
  const trailLine  = useMemo(() => new THREE.Line(
    trailGeo,
    new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.4 }),
  ), [trailGeo, cfg.color]);

  const showClassA = useRacing(s => s.showClassA);
  const showClassB = useRacing(s => s.showClassB);
  const followedId = useRacing(s => s.followedId);

  const vehicle = useRacing(s => s.vehicles.find(v => v.id === vehicleId));

  useFrame(() => {
    if (!vehicle || !meshRef.current) return;

    const visible =
      (cfg.vehicleClass === 'A' && showClassA) ||
      (cfg.vehicleClass === 'B' && showClassB);
    meshRef.current.visible = visible;
    if (lightRef.current) lightRef.current.visible = visible;
    if (trailRef.current) trailRef.current.visible = visible && (followedId === vehicleId);

    if (!visible) return;

    const t = vehicle.t;
    const pos = curve.getPoint(t);

    // Lateral offset — perpendicular to travel direction in XZ
    const tan   = curve.getTangent(t).normalize();
    const right = new THREE.Vector3().crossVectors(UP, tan).normalize();
    pos.add(right.multiplyScalar(LATERAL_OFFSET[cfg.vehicleClass]));

    // Orient cone to face direction of travel
    const quaternion = new THREE.Quaternion();
    const forward = tan.clone();
    // Cone geometry points along +Y by default — align +Y with travel direction
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), forward);

    meshRef.current.position.copy(pos);
    meshRef.current.quaternion.copy(quaternion);

    if (lightRef.current) {
      lightRef.current.position.copy(pos);
    }

    // Trail — only for followed vehicle
    if (followedId === vehicleId) {
      const trail = trailPositions.current;
      trail.push(pos.clone());
      if (trail.length > TRAIL_LENGTH) trail.shift();

      const attr = trailGeo.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        const p = trail[i] ?? pos;
        arr[i * 3 + 0] = p.x;
        arr[i * 3 + 1] = p.y;
        arr[i * 3 + 2] = p.z;
      }
      attr.needsUpdate = true;
      trailGeo.setDrawRange(0, trail.length);
    }

    // Abort pulse
    if (vehicle.aborted) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
      (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse * 2;
      (meshRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
    } else {
      (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = followedId === vehicleId ? 1.5 : 0.8;
      (meshRef.current.material as THREE.MeshStandardMaterial).emissive.copy(colorHex);
    }

    // Glow scale when followed
    const scale = followedId === vehicleId ? 1.4 : 1.0;
    meshRef.current.scale.setScalar(scale);
  });

  const hexNum = parseInt(cfg.color.replace('#', ''), 16);

  return (
    <group>
      {/* Vehicle cone */}
      <mesh ref={meshRef}>
        <coneGeometry args={[0.12, 0.35, 6]} />
        <meshStandardMaterial
          color={cfg.color}
          emissive={cfg.color}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Dynamic point light */}
      <pointLight
        ref={lightRef}
        color={hexNum}
        intensity={3}
        distance={4}
        decay={2}
      />

      {/* Trail line (only rendered for followed vehicle) */}
      <primitive object={trailLine} ref={trailRef} />
    </group>
  );
}

// ─── All Vehicles ─────────────────────────────────────────────────────────
export function RacingVehicles() {
  return (
    <group>
      {VEHICLE_CONFIGS.map(cfg => (
        <Vehicle key={cfg.id} vehicleId={cfg.id} />
      ))}
    </group>
  );
}
