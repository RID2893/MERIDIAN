import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRacing, VEHICLE_CONFIGS, GATE_DEFS, CHALLENGE_ROUTES } from "@/lib/stores/useRacing";
import { makeCurve, ALT_CLASS_A, ALT_CLASS_B } from "./RacingTrack";

// Derived from CHALLENGE_ROUTES — single source of truth, can never diverge
const CHALLENGE_ROUTE_EXIT: Record<string, number> = Object.fromEntries(
  Object.entries(CHALLENGE_ROUTES).map(([gk, cr]) => [gk, cr.exitT])
);

const UP       = new THREE.Vector3(0, 1, 0);
const FWD      = new THREE.Vector3(0, 0, 1);  // box elongated along Z
const TRAIL_LENGTH = 50;

// Lateral offset so Class A and B don't overlap visually on shared curve
const LATERAL_OFFSET: Record<'A' | 'B', number> = { A: +0.35, B: -0.35 };

// ─── Single Vehicle ───────────────────────────────────────────────────────
function Vehicle({ vehicleId }: { vehicleId: string }) {
  const cfg    = VEHICLE_CONFIGS.find(c => c.id === vehicleId)!;
  const altY   = cfg.vehicleClass === 'A' ? ALT_CLASS_A : ALT_CLASS_B;
  const curve  = useMemo(() => makeCurve(altY), [altY]);
  const color  = useMemo(() => new THREE.Color(cfg.color), [cfg.color]);

  // Main group (position + orientation)
  const groupRef    = useRef<THREE.Group>(null!);
  const lightRef    = useRef<THREE.PointLight>(null!);

  // Sub-mesh refs for per-frame material updates
  const fuselageRef = useRef<THREE.Mesh>(null!);
  const wingsRef    = useRef<THREE.Mesh>(null!);
  const tailRef     = useRef<THREE.Mesh>(null!);
  const portRef     = useRef<THREE.Mesh>(null!);     // red nav light
  const starboardRef = useRef<THREE.Mesh>(null!);    // green nav light

  // Trail
  const trailPositions = useRef<THREE.Vector3[]>([]);
  const trailRef = useRef<THREE.Line>(null!);
  const trailGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(TRAIL_LENGTH * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return geo;
  }, []);
  const trailLine = useMemo(() => new THREE.Line(
    trailGeo,
    new THREE.LineBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.45 }),
  ), [trailGeo, cfg.color]);

  const showClassA = useRacing(s => s.showClassA);
  const showClassB = useRacing(s => s.showClassB);
  const followedId = useRacing(s => s.followedId);
  const vehicle    = useRacing(s => s.vehicles.find(v => v.id === vehicleId));

  useFrame(() => {
    if (!vehicle || !groupRef.current) return;

    const visible =
      (cfg.vehicleClass === 'A' && showClassA) ||
      (cfg.vehicleClass === 'B' && showClassB);
    groupRef.current.visible = visible;
    if (lightRef.current) lightRef.current.visible = visible;
    if (trailRef.current) trailRef.current.visible = visible && followedId === vehicleId;
    if (!visible) return;

    // ── Position & Orientation ─────────────────────────────────────────
    let pos: THREE.Vector3;
    let tan: THREE.Vector3;

    if (vehicle.mode === 'CHALLENGE' && vehicle.challengeGk) {
      const gateT    = GATE_DEFS.find(g => g.id === vehicle.challengeGk)?.t ?? vehicle.t;
      const exitTval = CHALLENGE_ROUTE_EXIT[vehicle.challengeGk] ?? gateT;
      const visualT  = gateT + (exitTval - gateT) * vehicle.challengeT;
      pos = curve.getPoint(visualT);
      tan = curve.getTangent(visualT).normalize();
      const right = new THREE.Vector3().crossVectors(UP, tan).normalize();
      pos.add(right.multiplyScalar(LATERAL_OFFSET[cfg.vehicleClass]));
    } else {
      const t    = vehicle.t;
      pos        = curve.getPoint(t);
      tan        = curve.getTangent(t).normalize();
      const right = new THREE.Vector3().crossVectors(UP, tan).normalize();
      pos.add(right.multiplyScalar(LATERAL_OFFSET[cfg.vehicleClass]));
    }

    // Align aircraft +Z with travel direction
    const quaternion = new THREE.Quaternion().setFromUnitVectors(FWD, tan);
    groupRef.current.position.copy(pos);
    groupRef.current.quaternion.copy(quaternion);

    if (lightRef.current) lightRef.current.position.copy(pos);

    // ── Trail ──────────────────────────────────────────────────────────
    if (followedId === vehicleId) {
      const trail = trailPositions.current;
      trail.push(pos.clone());
      if (trail.length > TRAIL_LENGTH) trail.shift();
      const attr = trailGeo.attributes.position as THREE.BufferAttribute;
      const arr  = attr.array as Float32Array;
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        const p = trail[i] ?? pos;
        arr[i * 3]     = p.x;
        arr[i * 3 + 1] = p.y;
        arr[i * 3 + 2] = p.z;
      }
      attr.needsUpdate = true;
      trailGeo.setDrawRange(0, trail.length);
    }

    // ── Material States ────────────────────────────────────────────────
    const isFollowed = followedId === vehicleId;
    const emissiveBase = vehicle.aborted
      ? new THREE.Color(0xff0000)
      : color.clone();
    const emissiveIntensity = vehicle.aborted
      ? (0.5 + 0.5 * Math.sin(Date.now() * 0.01)) * 2.5
      : isFollowed ? 1.8 : 0.9;

    for (const ref of [fuselageRef, wingsRef, tailRef]) {
      if (!ref.current) return;
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.emissive.copy(emissiveBase);
      mat.emissiveIntensity = emissiveIntensity;
    }

    // Scale up when followed
    const s = isFollowed ? 1.35 : 1.0;
    groupRef.current.scale.setScalar(s);

    // ── Nav Lights — alternating blink (aviation standard) ─────────────
    const blink = Math.floor(Date.now() / 800) % 2;
    if (portRef.current) {
      (portRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        blink === 0 ? 4.0 : 0.2;
    }
    if (starboardRef.current) {
      (starboardRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        blink === 1 ? 4.0 : 0.2;
    }
  });

  const hexNum = parseInt(cfg.color.replace('#', ''), 16);

  return (
    <group>
      {/* Aircraft group — position + orientation applied here */}
      <group ref={groupRef}>
        {/* Fuselage — elongated body along Z */}
        <mesh ref={fuselageRef} castShadow>
          <boxGeometry args={[0.08, 0.05, 0.28]} />
          <meshStandardMaterial
            color={cfg.color} emissive={cfg.color}
            emissiveIntensity={0.9} metalness={0.6} roughness={0.3}
          />
        </mesh>

        {/* Wings — swept back 10° around Y */}
        <mesh ref={wingsRef} castShadow rotation={[0, -0.175, 0]}>
          <boxGeometry args={[0.52, 0.013, 0.10]} />
          <meshStandardMaterial
            color={cfg.color} emissive={cfg.color}
            emissiveIntensity={0.7} metalness={0.65} roughness={0.25}
          />
        </mesh>

        {/* Vertical tail fin */}
        <mesh ref={tailRef} castShadow position={[0, 0.045, 0.12]}>
          <boxGeometry args={[0.014, 0.09, 0.07]} />
          <meshStandardMaterial
            color={cfg.color} emissive={cfg.color}
            emissiveIntensity={0.6} metalness={0.5} roughness={0.4}
          />
        </mesh>

        {/* Port nav light — red, left wing tip */}
        <mesh ref={portRef} position={[-0.26, 0, 0]}>
          <sphereGeometry args={[0.026, 7, 7]} />
          <meshStandardMaterial
            color="#FF2020" emissive="#FF2020"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* Starboard nav light — green, right wing tip */}
        <mesh ref={starboardRef} position={[0.26, 0, 0]}>
          <sphereGeometry args={[0.026, 7, 7]} />
          <meshStandardMaterial
            color="#20FF50" emissive="#20FF50"
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>

      {/* Dynamic point light follows vehicle */}
      <pointLight
        ref={lightRef}
        color={hexNum}
        intensity={4}
        distance={5}
        decay={2}
      />

      {/* Trail — only for followed vehicle */}
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
