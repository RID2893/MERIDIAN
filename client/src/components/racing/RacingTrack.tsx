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
  const steps = 16;
  for (let i = 1; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const x = RING_R * Math.sin(angle);
    const z = RING_CENTER_Z + RING_R * Math.cos(angle);
    pts.push(new THREE.Vector3(x, altY, z));
  }

  // ── Return straight: ring exit → START/FINISH ──
  pts.push(new THREE.Vector3(0, altY, STRAIGHT_LEN * 0.5));
  pts.push(new THREE.Vector3(0, altY, STRAIGHT_LEN));

  return pts;
}

// Altitude Y values
export const ALT_CLASS_A = 1.5;
export const ALT_CLASS_B = 0.8;

export function makeCurve(altY: number): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(makeLollipopPoints(altY), false, 'catmullrom', 0.5);
}

// ─── Component ───────────────────────────────────────────────────────────
export function RacingTrack() {
  const curveA = useMemo(() => makeCurve(ALT_CLASS_A), []);
  const curveB = useMemo(() => makeCurve(ALT_CLASS_B), []);

  // Class A — layered orange tubes
  const tubeA_core  = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.022, 6, false),  [curveA]);
  const tubeA_mid   = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.062, 8, false),  [curveA]);
  const tubeA_glow  = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.26,  8, false),  [curveA]);

  // Class B — layered cyan tubes
  const tubeB_core  = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.022, 6, false),  [curveB]);
  const tubeB_mid   = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.062, 8, false),  [curveB]);
  const tubeB_glow  = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.26,  8, false),  [curveB]);

  return (
    <group>
      {/* Class A track — orange — 3-layer */}
      <mesh geometry={tubeA_core}>
        <meshStandardMaterial color="#FF6B00" emissive="#FF6B00" emissiveIntensity={2.5} />
      </mesh>
      <mesh geometry={tubeA_mid}>
        <meshStandardMaterial color="#FF6B00" emissive="#FF6B00" emissiveIntensity={0.9} transparent opacity={0.9} />
      </mesh>
      <mesh geometry={tubeA_glow}>
        <meshStandardMaterial color="#FF6B00" emissive="#FF6B00" emissiveIntensity={0.35} transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>

      {/* Class B track — cyan — 3-layer */}
      <mesh geometry={tubeB_core}>
        <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={2.5} />
      </mesh>
      <mesh geometry={tubeB_mid}>
        <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={0.9} transparent opacity={0.9} />
      </mesh>
      <mesh geometry={tubeB_glow}>
        <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={0.35} transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>

      {/* Challenge sub-routes */}
      <ChallengeRoutes />

      {/* Start/Finish line */}
      <StartFinishLine />

      {/* Airspace band separators */}
      <AirspaceBands />
    </group>
  );
}

// ─── Challenge Routes ─────────────────────────────────────────────────────
// Class A: amber #FFB800 (distinct from main orange #FF6B00)
// Class B: soft blue #7B9CFF (distinct from main cyan #00D4FF)
const CHALLENGE_COLOR_A = '#FFB800';
const CHALLENGE_COLOR_B = '#7B9CFF';

function ChallengeRoutes() {
  const vehicles  = useRacing(s => s.vehicles);
  const activeGks = new Set(
    vehicles.filter(v => v.mode === 'CHALLENGE' && v.challengeGk).map(v => v.challengeGk!)
  );

  return (
    <group>
      {Object.entries(CHALLENGE_ROUTES).map(([gk, cr]) => {
        const active = activeGks.has(gk);
        return (
          <group key={gk}>
            <ChallengeCorridorLine pts={cr.routeA} altY={ALT_CLASS_A} color={CHALLENGE_COLOR_A} active={active} />
            <ChallengeCorridorLine pts={cr.routeB} altY={ALT_CLASS_B} color={CHALLENGE_COLOR_B} active={active} />
          </group>
        );
      })}
    </group>
  );
}

function ChallengeCorridorLine({
  pts, altY, color, active,
}: {
  pts: [number, number][];
  altY: number;
  color: string;
  active: boolean;
}) {
  const { coreGeo, midGeo, glowGeo, curve } = useMemo(() => {
    const points = pts.map(([x, z]) => new THREE.Vector3(x, altY, z));
    const c      = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const segs   = pts.length * 8;
    return {
      curve:   c,
      coreGeo: new THREE.TubeGeometry(c, segs, 0.020, 6,  false),
      midGeo:  new THREE.TubeGeometry(c, segs, 0.055, 8,  false),
      glowGeo: new THREE.TubeGeometry(c, segs, 0.22,  8,  false),
    };
  }, [pts, altY]);

  return (
    <group>
      {/* Core — bright laser guidance beam */}
      <mesh geometry={coreGeo}>
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={active ? 4.5 : 1.2}
        />
      </mesh>

      {/* Mid tube — solid corridor wall */}
      <mesh geometry={midGeo}>
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={active ? 1.2 : 0.35}
          transparent opacity={active ? 0.88 : 0.55}
        />
      </mesh>

      {/* Glow halo — soft volume light */}
      <mesh geometry={glowGeo}>
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={active ? 0.9 : 0.18}
          transparent opacity={active ? 0.22 : 0.10}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Directional chevron markers — navigation arrows along the route */}
      <ChallengeChevrons curve={curve} altY={altY} color={color} active={active} />
    </group>
  );
}

// ─── Chevron markers ──────────────────────────────────────────────────────
// Small cones placed at intervals pointing in the direction of travel
function ChallengeChevrons({
  curve, altY, color, active,
}: {
  curve: THREE.CatmullRomCurve3;
  altY: number;
  color: string;
  active: boolean;
}) {
  const chevrons = useMemo(() => {
    const samples = [0.12, 0.28, 0.50, 0.72, 0.88];
    return samples.map(t => {
      const pos = curve.getPoint(t);
      const tan = curve.getTangent(t).normalize();
      // Align cone +Y → forward direction
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        tan
      );
      return { pos, quat };
    });
  }, [curve, altY]);

  const intensity = active ? 1.6 : 0.5;

  return (
    <group>
      {chevrons.map((ch, i) => (
        <mesh key={i} position={ch.pos} quaternion={ch.quat}>
          <coneGeometry args={[0.055, 0.13, 8]} />
          <meshStandardMaterial
            color={color} emissive={color}
            emissiveIntensity={intensity}
            transparent opacity={active ? 0.95 : 0.65}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Start/Finish line ────────────────────────────────────────────────────
function StartFinishLine() {
  return (
    <group position={[0, 0, 9]}>
      {/* Horizontal checker bar */}
      <mesh position={[0, (ALT_CLASS_A + ALT_CLASS_B) / 2, 0]}>
        <boxGeometry args={[3.5, ALT_CLASS_A - ALT_CLASS_B + 0.4, 0.04]} />
        <meshStandardMaterial color="#00FF88" emissive="#00FF88" emissiveIntensity={0.8} transparent opacity={0.75} />
      </mesh>
      {/* Label marker */}
      <mesh position={[0, ALT_CLASS_A + 0.4, 0]}>
        <boxGeometry args={[1.2, 0.08, 0.08]} />
        <meshStandardMaterial color="#00FF88" emissive="#00FF88" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

// ─── Airspace bands ───────────────────────────────────────────────────────
function AirspaceBands() {
  return (
    <group>
      {/* Class A band — orange tinted plane */}
      <mesh position={[0, ALT_CLASS_A, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 22]} />
        <meshStandardMaterial color="#FF6B00" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
      {/* Class B band — cyan tinted plane */}
      <mesh position={[0, ALT_CLASS_B, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 22]} />
        <meshStandardMaterial color="#00D4FF" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
