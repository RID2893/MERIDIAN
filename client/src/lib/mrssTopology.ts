// ============================================================================
// MRSS Ring Topology — Single Source of Truth
// Verbatim constants from RingFlowSimulator.tsx.
// Both the 2D Ring Flow canvas and the 3D Racing Simulator import from here.
// DO NOT re-implement these values anywhere else.
// ============================================================================

export const MAX_GATES               = 20;
export const QUADRANTS               = 4;
export const GATES_PER_QUADRANT      = MAX_GATES / QUADRANTS;
export const INITIAL_GATES           = 8;
export const ROUTE_CAPACITY          = 4;
export const GATE_THROUGHPUT         = 6;
export const SPLIT_OPERATOR          = 0.7;
export const SPLIT_MRSS              = 0.2;
export const SPLIT_CITY              = 0.1;
export const GATE_FIXED_COST_PER_SEC = 0.4;

// Quadrant angle ranges on the 2D unit circle (radians)
// Q1 = top-right, Q2 = bottom-right, Q3 = bottom-left, Q4 = top-left
export const QUADRANT_RANGES: [number, number][] = [
  [-Math.PI / 2, 0],
  [0,            Math.PI / 2],
  [Math.PI / 2,  Math.PI],
  [Math.PI,      (3 * Math.PI) / 2],
];

// 5 vertiport slot definitions per quadrant (verbatim from RingFlowSimulator)
export const VERT_SLOTS = [
  { angleFrac: 0.12, radiusFrac: 0.68 },
  { angleFrac: 0.32, radiusFrac: 0.42 },
  { angleFrac: 0.52, radiusFrac: 0.72 },
  { angleFrac: 0.72, radiusFrac: 0.45 },
  { angleFrac: 0.90, radiusFrac: 0.62 },
] as const;

// ─── Pure topology functions (verbatim from RingFlowSimulator) ────────────

export function gateAngleRad(index: number): number {
  return (index / MAX_GATES) * Math.PI * 2 - Math.PI / 2;
}

export function quadrantOf(index: number): number {
  const a = (index / MAX_GATES) * 360;
  if (a < 90)  return 0;
  if (a < 180) return 1;
  if (a < 270) return 2;
  return 3;
}

// Angle (radians) of the vertiport for gate at gateIndex
export function vertiportAngle(gateIndex: number): number {
  const q        = quadrantOf(gateIndex);
  const localIdx = gateIndex - q * GATES_PER_QUADRANT;
  const slot     = VERT_SLOTS[localIdx % VERT_SLOTS.length];
  const [a0, a1] = QUADRANT_RANGES[q];
  return a0 + (a1 - a0) * slot.angleFrac;
}

// Radius fraction (0‥1) of the vertiport for gate at gateIndex
export function vertiportRadiusFrac(gateIndex: number): number {
  const q        = quadrantOf(gateIndex);
  const localIdx = gateIndex - q * GATES_PER_QUADRANT;
  return VERT_SLOTS[localIdx % VERT_SLOTS.length].radiusFrac;
}

// ─── 3D position helpers ──────────────────────────────────────────────────
// Maps ring topology to 3D XZ plane (canvas-Y → world-Z), altitude on world-Y.
// These are the ONLY additions allowed on top of the 2D topology.

export interface Vec3 { x: number; y: number; z: number }

export function gatePosition3D(index: number, radius: number, altY: number): Vec3 {
  const angle = gateAngleRad(index);
  return { x: Math.cos(angle) * radius, y: altY, z: Math.sin(angle) * radius };
}

export function vertiportPosition3D(gateIndex: number, radius: number, altY: number): Vec3 {
  const angle = vertiportAngle(gateIndex);
  const rf    = vertiportRadiusFrac(gateIndex);
  return { x: Math.cos(angle) * radius * rf, y: altY, z: Math.sin(angle) * radius * rf };
}

// ─── Gate / topology builders ─────────────────────────────────────────────

export interface MRSSGate {
  id:       string;
  index:    number;
  quadrant: number;
  active:   boolean;
}

// Build all 20 MRSS gates; mark initialActive evenly-spaced ones as active.
// Uses the identical spacing logic from RingFlowSimulator.tsx makeGates().
export function buildMRSSGates(initialActive = INITIAL_GATES): MRSSGate[] {
  const gates: MRSSGate[] = [];
  for (let i = 0; i < MAX_GATES; i++) {
    gates.push({ id: `G${i + 1}`, index: i, quadrant: quadrantOf(i), active: false });
  }
  const step = MAX_GATES / Math.max(1, initialActive);
  for (let k = 0; k < initialActive; k++) {
    gates[Math.floor(k * step) % MAX_GATES].active = true;
  }
  return gates;
}

// Consecutive active-gate pairs in clockwise order → each pair = one route segment
export function activeRoutePairs(
  gates: MRSSGate[],
): Array<{ fromIdx: number; toIdx: number }> {
  const active = gates.filter(g => g.active).sort((a, b) => a.index - b.index);
  return active.map((g, i) => ({
    fromIdx: g.index,
    toIdx:   active[(i + 1) % active.length].index,
  }));
}
