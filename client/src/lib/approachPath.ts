import * as THREE from "three";

/**
 * Builds a cubic Bezier approach path for a gate.
 *
 * The path models an ILS-style glideslope:
 *   P0 (FAF)       — Final Approach Fix: outside the ring at full ring altitude
 *   P1 (ctrl)      — gentle inbound turn while still high
 *   P2 (ctrl)      — steepens into final descent toward gate
 *   P3 (threshold) — gate position on the ground
 *
 * @param cityPos      - City center in scene coordinates [x, y, z]
 * @param gateAngleDeg - Gate radial angle in degrees
 * @param gateDist     - Gate distance from city center (scene units)
 * @param ringRadius   - Ring orbit radius (scene units)
 * @param ringAltScene - Ring cruise altitude (scene units, converted from feet)
 */
export function buildApproachCurve(
  cityPos: readonly [number, number, number],
  gateAngleDeg: number,
  gateDist: number,
  ringRadius: number,
  ringAltScene: number
): THREE.CubicBezierCurve3 {
  const angleRad = (gateAngleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // P0 — Final Approach Fix (FAF): just outside ring at ring altitude
  const fafDist = ringRadius + 1.8;
  const p0 = new THREE.Vector3(
    cityPos[0] + cos * fafDist,
    cityPos[1] + ringAltScene,
    cityPos[2] + sin * fafDist
  );

  // P1 — early approach: arc inward while still descending gently
  const cp1Dist = ringRadius + 0.6;
  const p1 = new THREE.Vector3(
    cityPos[0] + cos * cp1Dist,
    cityPos[1] + ringAltScene * 0.60,
    cityPos[2] + sin * cp1Dist
  );

  // P2 — late approach: steepens into final, very close to gate
  const cp2Dist = gateDist + 0.3;
  const p2 = new THREE.Vector3(
    cityPos[0] + cos * cp2Dist,
    cityPos[1] + ringAltScene * 0.12,
    cityPos[2] + sin * cp2Dist
  );

  // P3 — gate threshold on the ground
  const p3 = new THREE.Vector3(
    cityPos[0] + cos * gateDist,
    cityPos[1] + 0.05,
    cityPos[2] + sin * gateDist
  );

  return new THREE.CubicBezierCurve3(p0, p1, p2, p3);
}

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
