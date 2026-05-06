import { useMemo } from "react";
import * as THREE from "three";
import {
  INITIAL_GATES,
  buildMRSSGates,
  gateAngleRad, gatePosition3D, vertiportPosition3D,
  buildCircuit3DPoints,
} from "@/lib/mrssTopology";

// ─── 3D constants ─────────────────────────────────────────────────────────
export const RING_R      = 10;
export const ALT_CLASS_A = 1.5;
export const ALT_CLASS_B = 0.8;
const        STEM_LEN    = 6;   // visual start/finish stem beyond ring perimeter

const MID_ALT = (ALT_CLASS_A + ALT_CLASS_B) / 2;

// ─── Race lane curve (Ring-Flow compound path) ────────────────────────────
// Pattern per segment: VP_i → Gate_i → arc_mid → Gate_j
// 4 control points × 8 active gates = 32 pts, closed circuit.
// Gate VP position: t = seg/8.  Gate departure: t ≈ seg/8 + 1/32.
export function makeCurve(altY: number): THREE.CatmullRomCurve3 {
  const pts = buildCircuit3DPoints(INITIAL_GATES, RING_R, altY).map(
    p => new THREE.Vector3(p.x, p.y, p.z)
  );
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
}

// ─── Spoke geometry helper ────────────────────────────────────────────────
function makeLine(a: THREE.Vector3, b: THREE.Vector3, color: string, opacity: number) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  return new THREE.Line(geo, mat);
}

// ─── Main Track ───────────────────────────────────────────────────────────
export function RacingTrack() {
  const curveA = useMemo(() => makeCurve(ALT_CLASS_A), []);
  const curveB = useMemo(() => makeCurve(ALT_CLASS_B), []);

  // Race lane tubes (orange ClassA, cyan ClassB)
  const tubeA_core = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.022, 6, true), [curveA]);
  const tubeA_mid  = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.062, 8, true), [curveA]);
  const tubeA_glow = useMemo(() => new THREE.TubeGeometry(curveA, 300, 0.26,  8, true), [curveA]);
  const tubeB_core = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.022, 6, true), [curveB]);
  const tubeB_mid  = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.062, 8, true), [curveB]);
  const tubeB_glow = useMemo(() => new THREE.TubeGeometry(curveB, 300, 0.26,  8, true), [curveB]);

  // Reference ring outline at mid altitude
  const ringOutlineGeo = useMemo(() => {
    const pts = new THREE.EllipseCurve(0, 0, RING_R, RING_R, 0, Math.PI * 2, false, 0)
      .getPoints(128).map(p => new THREE.Vector3(p.x, MID_ALT, p.y));
    pts.push(pts[0].clone());
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  // Quadrant dividers
  const quadrantGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0,               MID_ALT, -RING_R * 1.05),
    new THREE.Vector3(0,               MID_ALT,  RING_R * 1.05),
    new THREE.Vector3(-RING_R * 1.05,  MID_ALT, 0),
    new THREE.Vector3( RING_R * 1.05,  MID_ALT, 0),
  ]), []);

  // Stem: visual-only extension of gate 0's outbound direction (start/finish marker)
  const stemObj = useMemo(() => {
    const angle = gateAngleRad(0);
    const gp    = gatePosition3D(0, RING_R, MID_ALT);
    const tip   = gatePosition3D(0, RING_R + STEM_LEN, MID_ALT);
    const line  = makeLine(
      new THREE.Vector3(gp.x, MID_ALT, gp.z),
      new THREE.Vector3(tip.x, MID_ALT, tip.z),
      '#00FF88', 0.9,
    );
    void angle; // used via gatePosition3D
    return line;
  }, []);

  return (
    <group>
      {/* Reference ring + quadrant grid */}
      <line geometry={ringOutlineGeo}>
        <lineBasicMaterial color="#00ffff" transparent opacity={0.18} />
      </line>
      <lineSegments geometry={quadrantGeo}>
        <lineBasicMaterial color="#00ffff" transparent opacity={0.12} />
      </lineSegments>

      {/* Start/finish stem (visual only) */}
      <primitive object={stemObj} />

      {/* Class A race lane — orange */}
      <mesh geometry={tubeA_core}>
        <meshStandardMaterial color="#FF6B00" emissive="#FF6B00" emissiveIntensity={2.5} />
      </mesh>
      <mesh geometry={tubeA_mid}>
        <meshStandardMaterial color="#FF6B00" emissive="#FF6B00" emissiveIntensity={0.9} transparent opacity={0.9} />
      </mesh>
      <mesh geometry={tubeA_glow}>
        <meshStandardMaterial color="#FF6B00" emissive="#FF6B00" emissiveIntensity={0.35} transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>

      {/* Class B race lane — cyan */}
      <mesh geometry={tubeB_core}>
        <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={2.5} />
      </mesh>
      <mesh geometry={tubeB_mid}>
        <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={0.9} transparent opacity={0.9} />
      </mesh>
      <mesh geometry={tubeB_glow}>
        <meshStandardMaterial color="#00D4FF" emissive="#00D4FF" emissiveIntensity={0.35} transparent opacity={0.18} side={THREE.BackSide} />
      </mesh>

      {/* Spoke routes for active gates */}
      <SpokeRoutes />
    </group>
  );
}

// ─── Spoke routes ─────────────────────────────────────────────────────────
// Orange = outbound (VP → Gate), Blue = inbound (Gate → VP)
// Derived entirely from MRSS topology — no custom positions.

function SpokeRoutes() {
  const objects = useMemo(() => {
    const gates  = buildMRSSGates(INITIAL_GATES);
    const active = gates.filter(g => g.active);
    const objs: THREE.Object3D[] = [];

    active.forEach(g => {
      const gp = gatePosition3D(g.index, RING_R, MID_ALT);
      const vp = vertiportPosition3D(g.index, RING_R, MID_ALT);
      const gVec = new THREE.Vector3(gp.x, MID_ALT, gp.z);
      const vVec = new THREE.Vector3(vp.x, MID_ALT, vp.z);

      // Outbound spoke: VP → Gate (orange)
      objs.push(makeLine(vVec, gVec, '#FF6B00', 0.55));
      // Inbound spoke: Gate → VP (blue)
      objs.push(makeLine(gVec, vVec, '#00D4FF', 0.45));
    });

    return objs;
  }, []);

  return <group>{objects.map((o, i) => <primitive key={i} object={o} />)}</group>;
}

// ─── Vertiport markers ────────────────────────────────────────────────────

function PentagonMarker({ pos }: { pos: THREE.Vector3 }) {
  const { line, fill } = useMemo(() => {
    const r = 0.55;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineBasicMaterial({ color: '#f43f5e', transparent: true, opacity: 0.9 });
    const line    = new THREE.Line(lineGeo, lineMat);

    const shape = new THREE.Shape();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
      i === 0 ? shape.moveTo(Math.cos(a) * r, Math.sin(a) * r) : shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.closePath();
    const fillGeo = new THREE.ShapeGeometry(shape);
    const fillMat = new THREE.MeshBasicMaterial({ color: '#f43f5e', transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    const fill    = new THREE.Mesh(fillGeo, fillMat);
    return { line, fill };
  }, []);

  return (
    <group position={pos} rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={line} />
      <primitive object={fill} />
    </group>
  );
}

export function RacingVertiports() {
  const gates  = useMemo(() => buildMRSSGates(INITIAL_GATES).filter(g => g.active), []);
  return (
    <group>
      {gates.map(g => {
        const vp = vertiportPosition3D(g.index, RING_R, MID_ALT);
        return <PentagonMarker key={g.id} pos={new THREE.Vector3(vp.x, MID_ALT, vp.z)} />;
      })}
    </group>
  );
}
