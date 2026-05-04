import { useMemo } from "react";
import * as THREE from "three";

// ─── Ring constants ───────────────────────────────────────────────────────
const RING_R    = 10;
const RING_SEGS = 64;

export const ALT_CLASS_A = 1.5;
export const ALT_CLASS_B = 0.8;

function makeRingPoints(altY: number): THREE.Vector3[] {
  return Array.from({ length: RING_SEGS }, (_, i) => {
    const angle = (i / RING_SEGS) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * RING_R, altY, Math.sin(angle) * RING_R);
  });
}

export function makeCurve(altY: number): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(makeRingPoints(altY), true, 'catmullrom', 0.5);
}

// ─── Component ───────────────────────────────────────────────────────────
export function RacingTrack() {
  const curveA = useMemo(() => makeCurve(ALT_CLASS_A), []);
  const curveB = useMemo(() => makeCurve(ALT_CLASS_B), []);

  const tubeA_core = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.022, 6, true), [curveA]);
  const tubeA_mid  = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.062, 8, true), [curveA]);
  const tubeA_glow = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.26,  8, true), [curveA]);

  const tubeB_core = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.022, 6, true), [curveB]);
  const tubeB_mid  = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.062, 8, true), [curveB]);
  const tubeB_glow = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.26,  8, true), [curveB]);

  const midY = (ALT_CLASS_A + ALT_CLASS_B) / 2;

  const ringOutlineGeo = useMemo(() => {
    const pts = new THREE.EllipseCurve(0, 0, RING_R, RING_R, 0, Math.PI * 2, false, 0)
      .getPoints(128)
      .map(p => new THREE.Vector3(p.x, midY, p.y));
    pts.push(pts[0].clone()); // close the loop
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [midY]);

  const quadrantGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,            midY, -RING_R * 1.05),
    new THREE.Vector3(0,            midY,  RING_R * 1.05),
    new THREE.Vector3(-RING_R * 1.05, midY, 0),
    new THREE.Vector3( RING_R * 1.05, midY, 0),
  ]), [midY]);

  return (
    <group>
      {/* Reference ring outline */}
      <line geometry={ringOutlineGeo}>
        <lineBasicMaterial color="#00ffff" transparent opacity={0.18} />
      </line>

      {/* Quadrant dividers */}
      <lineSegments geometry={quadrantGeo}>
        <lineBasicMaterial color="#00ffff" transparent opacity={0.12} />
      </lineSegments>

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
    </group>
  );
}
