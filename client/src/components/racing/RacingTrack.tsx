import { useMemo } from "react";
import * as THREE from "three";

// ─── Circuit constants ────────────────────────────────────────────────────
export const RING_R       = 10;
export const STRAIGHT_LEN = 8;
const        RING_SEGS    = 32;

export const ALT_CLASS_A = 1.5;
export const ALT_CLASS_B = 0.8;

// Lollipop: straight approach → clockwise ring → return straight
// Ring centered at [0,0,0]; entry/exit at [0, y, +RING_R] (bottom, z+)
function makeLollipopPoints(altY: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];

  // Straight approach
  pts.push(new THREE.Vector3(0, altY, RING_R + STRAIGHT_LEN));
  pts.push(new THREE.Vector3(0, altY, RING_R + STRAIGHT_LEN * 0.5));
  pts.push(new THREE.Vector3(0, altY, RING_R));

  // Ring clockwise: start angle=π/2 (bottom), going right → top → left → back to bottom
  for (let i = 1; i < RING_SEGS; i++) {
    const angle = Math.PI / 2 - (i / RING_SEGS) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(angle) * RING_R, altY, Math.sin(angle) * RING_R));
  }

  // Ring exit (same as entry)
  pts.push(new THREE.Vector3(0, altY, RING_R));

  // Return straight
  pts.push(new THREE.Vector3(0, altY, RING_R + STRAIGHT_LEN * 0.5));
  pts.push(new THREE.Vector3(0, altY, RING_R + STRAIGHT_LEN));

  return pts;
}

export function makeCurve(altY: number): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(makeLollipopPoints(altY), false, 'catmullrom', 0.5);
}

// ─── Main Track Component ─────────────────────────────────────────────────
export function RacingTrack() {
  const curveA = useMemo(() => makeCurve(ALT_CLASS_A), []);
  const curveB = useMemo(() => makeCurve(ALT_CLASS_B), []);

  const tubeA_core = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.022, 6, false), [curveA]);
  const tubeA_mid  = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.062, 8, false), [curveA]);
  const tubeA_glow = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.26,  8, false), [curveA]);

  const tubeB_core = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.022, 6, false), [curveB]);
  const tubeB_mid  = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.062, 8, false), [curveB]);
  const tubeB_glow = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.26,  8, false), [curveB]);

  const midY = (ALT_CLASS_A + ALT_CLASS_B) / 2;

  // Reference ring circle outline
  const ringOutlineGeo = useMemo(() => {
    const pts = new THREE.EllipseCurve(0, 0, RING_R, RING_R, 0, Math.PI * 2, false, 0)
      .getPoints(128)
      .map(p => new THREE.Vector3(p.x, midY, p.y));
    pts.push(pts[0].clone());
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [midY]);

  // Quadrant dividers (cross inside ring)
  const quadrantGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,              midY, -RING_R * 1.05),
    new THREE.Vector3(0,              midY,  RING_R * 1.05),
    new THREE.Vector3(-RING_R * 1.05, midY, 0),
    new THREE.Vector3( RING_R * 1.05, midY, 0),
  ]), [midY]);

  // Start/Finish line at tip of straight
  const sfZ = RING_R + STRAIGHT_LEN;

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

      {/* Start/Finish bar */}
      <mesh position={[0, (ALT_CLASS_A + ALT_CLASS_B) / 2, sfZ]}>
        <boxGeometry args={[3.5, ALT_CLASS_A - ALT_CLASS_B + 0.4, 0.06]} />
        <meshStandardMaterial color="#00FF88" emissive="#00FF88" emissiveIntensity={0.9} transparent opacity={0.8} />
      </mesh>

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

// ─── Vertiports ───────────────────────────────────────────────────────────
// One per gate, positioned inside the ring. Spoke connects gate to vertiport.
// Positions match the ring interior quadrant layout (mirroring Ring Flow Sim).

const VERT_DATA: { gateId: string; t: number; vx: number; vz: number }[] = [
  { gateId: 'G1', t: 0.00, vx:  0.0, vz:  4.5 },  // center-top interior
  { gateId: 'G2', t: 0.10, vx:  2.0, vz:  7.2 },  // near ring entry, offset right
  { gateId: 'G3', t: 0.30, vx:  6.2, vz:  0.8 },  // right-side interior
  { gateId: 'G4', t: 0.70, vx: -6.2, vz:  0.8 },  // left-side interior
  { gateId: 'G5', t: 0.90, vx: -2.0, vz:  7.2 },  // near ring exit, offset left
];

function PentagonMarker({ pos }: { pos: [number, number, number] }) {
  const { lineMesh, fillMesh } = useMemo(() => {
    const r = 0.55;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineBasicMaterial({ color: '#f43f5e', transparent: true, opacity: 0.9 });
    const lineMesh = new THREE.Line(lineGeo, lineMat);

    const shape = new THREE.Shape();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
    }
    shape.closePath();
    const fillGeo = new THREE.ShapeGeometry(shape);
    const fillMat = new THREE.MeshBasicMaterial({ color: '#f43f5e', transparent: true, opacity: 0.15, side: THREE.DoubleSide });
    const fillMesh = new THREE.Mesh(fillGeo, fillMat);

    return { lineMesh, fillMesh };
  }, []);

  return (
    <group position={pos} rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={lineMesh} />
      <primitive object={fillMesh} />
    </group>
  );
}

function SpokeLine({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const obj = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color: '#56cfe1', transparent: true, opacity: 0.45 });
    return new THREE.Line(geo, mat);
  }, [from, to]);
  return <primitive object={obj} />;
}

export function RacingVertiports() {
  const curveA = useMemo(() => makeCurve(ALT_CLASS_A), []);
  const midY   = (ALT_CLASS_A + ALT_CLASS_B) / 2;

  const items = useMemo(() => VERT_DATA.map(vd => {
    const gatePos = curveA.getPoint(vd.t);
    gatePos.y = midY;
    const vertPos = new THREE.Vector3(vd.vx, midY, vd.vz);
    return { ...vd, gatePos, vertPos };
  }), [curveA, midY]);

  return (
    <group>
      {items.map(item => (
        <group key={item.gateId}>
          <PentagonMarker pos={[item.vertPos.x, item.vertPos.y, item.vertPos.z]} />
          <SpokeLine from={item.gatePos} to={item.vertPos} />
        </group>
      ))}
    </group>
  );
}
