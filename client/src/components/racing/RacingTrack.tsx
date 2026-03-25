import { useMemo } from "react";
import * as THREE from "three";
import { CHALLENGE_ROUTES, useRacing } from "@/lib/stores/useRacing";

// ─── Lollipop circuit waypoints ───────────────────────────────────────────
// Ring: radius 5, center at [0, 0, -5] in XZ plane
// Straight: from [0, 0, 0] → [0, 0, 9] (south, toward viewer)
// START/FINISH at z = 9.

const RING_CENTER_Z = -5;
const RING_R = 5;
const STRAIGHT_LEN = 9;

function makeLollipopPoints(altY: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];

  // ── Straight: START/FINISH → ring entry ──
  pts.push(new THREE.Vector3(0, altY, STRAIGHT_LEN));           // t≈0.00 START/FINISH
  pts.push(new THREE.Vector3(0, altY, STRAIGHT_LEN * 0.5));     // t≈0.10 mid-straight
  pts.push(new THREE.Vector3(0, altY, 0));                      // t≈0.20 ring entry

  // ── Ring: clockwise from bottom (south) going right (east) ──
  // Formula: z = CENTER_Z + R*cos(angle)  → at angle=0 gives z=CENTER_Z+R=0 (entry)
  //                                         at angle=π gives z=CENTER_Z-R=-10 (top)
  //                                         at angle=2π gives z=CENTER_Z+R=0 (exit = entry)
  // ⚠ Must use +cos NOT -cos — -cos creates a duplicate point at angle=π which
  //   makes the CatmullRom tangent zero → TubeGeometry NaN normals → crash.
  const steps = 16;
  for (let i = 1; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const x = RING_R * Math.sin(angle);
    const z = RING_CENTER_Z + RING_R * Math.cos(angle);  // +cos ← CORRECT
    pts.push(new THREE.Vector3(x, altY, z));
  }
  // i=16 at angle=2π already returns to [0, altY, 0] — no explicit ring exit needed

  // ── Return straight: ring exit → START/FINISH ──
  pts.push(new THREE.Vector3(0, altY, STRAIGHT_LEN * 0.5));     // mid-straight return
  pts.push(new THREE.Vector3(0, altY, STRAIGHT_LEN));           // t≈1.00 START/FINISH

  return pts;
}

// Altitude Y values (matching plan — MERIDIAN scene scale)
export const ALT_CLASS_A = 1.5;
export const ALT_CLASS_B = 0.8;

// Exported curves so vehicles can reference them
export function makeCurve(altY: number): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(makeLollipopPoints(altY), false, 'catmullrom', 0.5);
}

// ─── Component ───────────────────────────────────────────────────────────
export function RacingTrack() {
  const curveA = useMemo(() => makeCurve(ALT_CLASS_A), []);
  const curveB = useMemo(() => makeCurve(ALT_CLASS_B), []);

  const tubeAInner = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.06, 8, false), [curveA]);
  const tubeAGlow  = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.22, 8, false), [curveA]);
  const tubeBInner = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.06, 8, false), [curveB]);
  const tubeBGlow  = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.22, 8, false), [curveB]);

  return (
    <group>
      {/* Class A track — orange */}
      <mesh geometry={tubeAInner}>
        <meshStandardMaterial color="#FF6B00" emissive="#FF6B00" emissiveIntensity={0.8} />
      </mesh>
      <mesh geometry={tubeAGlow}>
        <meshStandardMaterial color="#FF6B00" transparent opacity={0.12} emissive="#FF6B00" emissiveIntensity={0.3} side={THREE.BackSide} />
      </mesh>

      {/* Class B track — cyan */}
      <mesh geometry={tubeBInner}>
        <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={0.8} />
      </mesh>
      <mesh geometry={tubeBGlow}>
        <meshStandardMaterial color="#00D4FF" transparent opacity={0.12} emissive="#00D4FF" emissiveIntensity={0.3} side={THREE.BackSide} />
      </mesh>

      {/* Challenge sub-routes */}
      <ChallengeRoutes />

      {/* Start/Finish line — horizontal bar at z=9 */}
      <StartFinishLine />

      {/* Airspace band separators */}
      <AirspaceBands />
    </group>
  );
}

// ─── Challenge Routes ─────────────────────────────────────────────────────
// Renders dim sub-route tubes for each gate challenge; glows bright when active
function ChallengeRoutes() {
  const vehicles   = useRacing(s => s.vehicles);

  // Which gate challenges are currently active (any vehicle in CHALLENGE mode)
  const activeGks  = new Set(vehicles.filter(v => v.mode === 'CHALLENGE' && v.challengeGk).map(v => v.challengeGk!));

  return (
    <group>
      {Object.entries(CHALLENGE_ROUTES).map(([gk, cr]) => {
        const isActive = activeGks.has(gk);
        return (
          <group key={gk}>
            <ChallengeRouteLine
              pts={cr.routeA}
              altY={ALT_CLASS_A}
              color="#FF6B00"
              active={isActive}
            />
            <ChallengeRouteLine
              pts={cr.routeB}
              altY={ALT_CLASS_B}
              color="#8B5CF6"
              active={isActive}
            />
          </group>
        );
      })}
    </group>
  );
}

function ChallengeRouteLine({
  pts, altY, color, active,
}: {
  pts: [number, number][];
  altY: number;
  color: string;
  active: boolean;
}) {
  const geo = useMemo(() => {
    const points = pts.map(([x, z]) => new THREE.Vector3(x, altY, z));
    const curve  = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, pts.length * 6, 0.04, 6, false);
  }, [pts, altY]);

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={active ? 1.6 : 0.25}
        transparent
        opacity={active ? 0.9 : 0.35}
      />
    </mesh>
  );
}

function StartFinishLine() {
  return (
    <group position={[0, 0, 9]}>
      {/* Horizontal checker bar */}
      <mesh position={[0, (ALT_CLASS_A + ALT_CLASS_B) / 2, 0]}>
        <boxGeometry args={[3.5, ALT_CLASS_A - ALT_CLASS_B + 0.4, 0.04]} />
        <meshStandardMaterial color="#00FF88" emissive="#00FF88" emissiveIntensity={0.6} transparent opacity={0.7} />
      </mesh>
      {/* Label marker */}
      <mesh position={[0, ALT_CLASS_A + 0.4, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.2, 0.08, 0.08]} />
        <meshStandardMaterial color="#00FF88" emissive="#00FF88" emissiveIntensity={1.0} />
      </mesh>
    </group>
  );
}

function AirspaceBands() {
  // Subtle horizontal planes showing the two altitude bands
  return (
    <group>
      {/* Class A band — orange tinted plane */}
      <mesh position={[0, ALT_CLASS_A, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 22]} />
        <meshStandardMaterial color="#FF6B00" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
      {/* Class B band — cyan tinted plane */}
      <mesh position={[0, ALT_CLASS_B, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 22]} />
        <meshStandardMaterial color="#00D4FF" transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
