import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";

// ============================================================================
// MERIDIAN RING SIMULATOR — Ring Flow Reference
// Correct ring flow architecture: clockwise routing, 20 gates on perimeter,
// 4 quadrants, vertiports inside ring connected by wavy Bézier spokes.
// ============================================================================

const MAX_GATES = 20;
const QUADRANTS = 4;
const TICKET_PRICE = 150;
const SPLIT_OPERATOR = 0.7;
const SPLIT_MRSS = 0.2;
const SPLIT_CITY = 0.1;
const GATE_FIXED_COST_PER_SEC = 0.4;
const ROUTE_CAPACITY = 4;
const GATE_THROUGHPUT = 6;
const MIN_SEPARATION = 0.10;
const DECISION_INTERVAL_SEC = 4;
const VEHICLE_SPEED = 0.18;
const MAX_RING_CAPACITY_PER_HOUR = 140;
const CAPACITY_PER_GATE_PER_HOUR = MAX_RING_CAPACITY_PER_HOUR / MAX_GATES;
const INITIAL_GATES = 8;

const OPERATORS = ["Aero", "Sky", "Volt", "Cirrus"];
const OPERATOR_COLORS = ["#22d3ee", "#a78bfa", "#f472b6", "#facc15"];

const QUADRANT_RANGES: [number, number][] = [
  [-Math.PI / 2, 0],
  [0, Math.PI / 2],
  [Math.PI / 2, Math.PI],
  [Math.PI, (3 * Math.PI) / 2],
];

interface Gate { id: string; index: number; quadrant: number; x: number; y: number; active: boolean; throughput: number; }
interface Vertiport { id: string; quadrant: number; gateIndex: number; angle: number; radiusFrac: number; x: number; y: number; capacity: number; }
interface Route { id: string; fromIdx: number; toIdx: number; fromVertId: string; vertId: string; capacity: number; intra: boolean; load: number; curveSeed: number; }
interface Vehicle { id: number; routeId: string; progress: number; speed: number; operator: number; }
interface LogEntry { t: number; msg: string; kind: "info" | "warn" | "good"; }
type AdvisorAction = "expand" | "contract" | "hold";
type AdvisorSeverity = "ok" | "warn" | "alert";
type SafetyStatus = "green" | "yellow" | "red";
interface AdvisorRec { action: AdvisorAction; delta: number; threshold: number; utilization: number; flightsPerHour: number; gates: number; netPerMin: number; reason: string; severity: AdvisorSeverity; targetQuadrant?: number; }
interface AdvisorEvent { t: number; rec: AdvisorRec; applied?: boolean; }
interface AdvisorInputs { active: number; sustained: number; flightsPerHour: number; netPerMin: number; safety: SafetyStatus; perQuadrantUtil: number[]; perQuadrantGates: number[]; }

function thresholdsForTier(active: number) {
  if (active <= 5) return { expand: 0.80, expandBy: 2, contract: 0.25, contractBy: 1 };
  if (active <= 10) return { expand: 0.80, expandBy: 2, contract: 0.25, contractBy: 2 };
  if (active <= 15) return { expand: 0.85, expandBy: 2, contract: 0.30, contractBy: 2 };
  return { expand: 0.85, expandBy: MAX_GATES, contract: 0.30, contractBy: 2 };
}

function computeAdvisorRec(inp: AdvisorInputs): AdvisorRec {
  const { active, sustained, flightsPerHour, netPerMin, safety, perQuadrantUtil, perQuadrantGates } = inp;
  const t = thresholdsForTier(active);
  const utilPct = Math.round(sustained * 100);
  let hotQ = -1, coldQ = -1, hotV = -Infinity, coldV = Infinity;
  for (let q = 0; q < 4; q++) {
    if (perQuadrantGates[q] === 0) continue;
    const v = perQuadrantUtil[q];
    if (v > hotV) { hotV = v; hotQ = q; }
    if (v < coldV) { coldV = v; coldQ = q; }
  }
  const expandTrigger = (sustained >= t.expand && (safety === "yellow" || safety === "red")) || sustained >= 0.95;
  if (expandTrigger && active < MAX_GATES) {
    const delta = Math.max(1, Math.min(t.expandBy, MAX_GATES - active));
    const sev: AdvisorSeverity = sustained >= 0.95 ? "alert" : "warn";
    const reason = hotQ >= 0 && hotV >= sustained + 0.07
      ? `Q${hotQ + 1} is running hotter (${Math.round(hotV * 100)}%) with ${active} gates. Recommended: +${delta} gate${delta > 1 ? "s" : ""} in Q${hotQ + 1}.`
      : `Utilization ${utilPct}% with ${active} gates and ${safety.toUpperCase()} safety. Recommended: +${delta} gate${delta > 1 ? "s" : ""}.`;
    return { action: "expand", delta, threshold: t.expand, utilization: sustained, flightsPerHour, gates: active, netPerMin, severity: sev, targetQuadrant: hotQ >= 0 ? hotQ : undefined, reason };
  }
  const cashWeak = netPerMin <= 2;
  if (sustained <= t.contract && cashWeak && active > 3) {
    const delta = Math.max(1, Math.min(t.contractBy, active - 3));
    const reason = coldQ >= 0 && coldV <= sustained - 0.03
      ? `Utilization ${utilPct}% with ${active} gates, net ${netPerMin.toFixed(1)}/min. Q${coldQ + 1} coolest (${Math.round(coldV * 100)}%). Recommended: −${delta} gate${delta > 1 ? "s" : ""}.`
      : `Utilization ${utilPct}% with ${active} gates, net ${netPerMin.toFixed(1)}/min. Recommended: −${delta} gate${delta > 1 ? "s" : ""}.`;
    return { action: "contract", delta, threshold: t.contract, utilization: sustained, flightsPerHour, gates: active, netPerMin, severity: "ok", targetQuadrant: coldQ >= 0 ? coldQ : undefined, reason };
  }
  const healthyBand = sustained >= 0.30 && sustained <= 0.70 && netPerMin > 2;
  const reason = healthyBand
    ? `${utilPct}% utilization with ${active} gates is within the healthy band — no change recommended.`
    : `${utilPct}% utilization with ${active} gates and ${safety.toUpperCase()} safety — holding for now.`;
  return { action: "hold", delta: 0, threshold: 0, utilization: sustained, flightsPerHour, gates: active, netPerMin, severity: "ok", reason };
}

function gatePosition(index: number, cx: number, cy: number, r: number) {
  const angle = (index / MAX_GATES) * Math.PI * 2 - Math.PI / 2;
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}
function quadrantOf(index: number) {
  const a = (index / MAX_GATES) * 360;
  if (a < 90) return 0; if (a < 180) return 1; if (a < 270) return 2; return 3;
}
function seedRand(seed: number, salt: number) {
  const x = Math.sin(seed * 9301 + salt * 49297) * 233280;
  return (x - Math.floor(x)) * 2 - 1;
}
function makeGates(initialActive: number, cx: number, cy: number, r: number): Gate[] {
  const gates: Gate[] = [];
  for (let i = 0; i < MAX_GATES; i++) {
    const p = gatePosition(i, cx, cy, r);
    gates.push({ id: `G${i + 1}`, index: i, quadrant: quadrantOf(i), x: p.x, y: p.y, active: false, throughput: GATE_THROUGHPUT });
  }
  const step = MAX_GATES / Math.max(1, initialActive);
  for (let k = 0; k < initialActive; k++) gates[Math.floor(k * step) % MAX_GATES].active = true;
  return gates;
}
const VERT_SLOTS = [{ angleFrac: 0.12, radiusFrac: 0.68 }, { angleFrac: 0.32, radiusFrac: 0.42 }, { angleFrac: 0.52, radiusFrac: 0.72 }, { angleFrac: 0.72, radiusFrac: 0.45 }, { angleFrac: 0.90, radiusFrac: 0.62 }];
const GATES_PER_QUADRANT = MAX_GATES / QUADRANTS;
function makeVertForGate(g: Gate, cx: number, cy: number, radius: number): Vertiport {
  const localIdx = g.index - g.quadrant * GATES_PER_QUADRANT;
  const slot = VERT_SLOTS[localIdx % VERT_SLOTS.length];
  const [a0, a1] = QUADRANT_RANGES[g.quadrant];
  const angle = a0 + (a1 - a0) * slot.angleFrac;
  return { id: `VP-${g.index + 1}`, quadrant: g.quadrant, gateIndex: g.index, angle, radiusFrac: slot.radiusFrac, x: cx + Math.cos(angle) * radius * slot.radiusFrac, y: cy + Math.sin(angle) * radius * slot.radiusFrac, capacity: GATE_THROUGHPUT };
}
function buildTopology(gates: Gate[], prevRoutes: Route[], cx: number, cy: number, radius: number) {
  const vertiports: Vertiport[] = [];
  const routes: Route[] = [];
  const vertByGateIdx = new Map<number, Vertiport>();
  for (const g of gates) { if (!g.active) continue; const v = makeVertForGate(g, cx, cy, radius); vertiports.push(v); vertByGateIdx.set(g.index, v); }
  const activeSorted = gates.filter(g => g.active).sort((a, b) => a.index - b.index);
  for (let i = 0; i < activeSorted.length; i++) {
    const from = activeSorted[i], to = activeSorted[(i + 1) % activeSorted.length];
    if (to.index === from.index) continue;
    const fromV = vertByGateIdx.get(from.index)!, toV = vertByGateIdx.get(to.index)!;
    const id = `R-${from.index}->${to.index}`;
    const existing = prevRoutes.find(r => r.id === id);
    routes.push({ id, fromIdx: from.index, toIdx: to.index, fromVertId: fromV.id, vertId: toV.id, capacity: ROUTE_CAPACITY, intra: true, load: existing?.load ?? 0, curveSeed: existing?.curveSeed ?? ((from.index * 73856093) ^ (to.index * 19349663)) });
  }
  return { vertiports, routes };
}
function gateAngleRaw(index: number) { return (index / MAX_GATES) * Math.PI * 2 - Math.PI / 2; }
function cwAngularDelta(a: number, b: number) { let d = b - a; while (d <= 0) d += Math.PI * 2; while (d > Math.PI * 2) d -= Math.PI * 2; return d; }
interface SpokeBezier { ax: number; ay: number; p1x: number; p1y: number; p2x: number; p2y: number; bx: number; by: number; }
interface RouteGeometry { segEnds: [number, number, number]; s1: SpokeBezier; arc: { startAngle: number; deltaAngle: number; radius: number; cx: number; cy: number }; s2: SpokeBezier; }
function buildSpokeBezier(ax: number, ay: number, bx: number, by: number, radius: number, seed: number): SpokeBezier {
  const dx = bx - ax, dy = by - ay, len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len, ny = dx / len, wobble = radius * 0.18;
  const w1 = seedRand(seed, 1) * wobble, w2 = seedRand(seed, 2) * wobble;
  return { ax, ay, p1x: ax + dx / 3 + nx * w1, p1y: ay + dy / 3 + ny * w1, p2x: ax + 2 * dx / 3 + nx * w2, p2y: ay + 2 * dy / 3 + ny * w2, bx, by };
}
function bezierAt(s: SpokeBezier, t: number) {
  const u = 1 - t;
  return { x: u*u*u*s.ax + 3*u*u*t*s.p1x + 3*u*t*t*s.p2x + t*t*t*s.bx, y: u*u*u*s.ay + 3*u*u*t*s.p1y + 3*u*t*t*s.p2y + t*t*t*s.by };
}
function buildRouteGeometry(fromVert: Vertiport, fromGate: Gate, toGate: Gate, toVert: Vertiport, cx: number, cy: number, radius: number, curveSeed: number): RouteGeometry {
  const startAngle = gateAngleRaw(fromGate.index), endAngle = gateAngleRaw(toGate.index), deltaAngle = cwAngularDelta(startAngle, endAngle);
  const s1Len = Math.hypot(fromGate.x - fromVert.x, fromGate.y - fromVert.y);
  const arcLen = radius * deltaAngle;
  const s2Len = Math.hypot(toVert.x - toGate.x, toVert.y - toGate.y);
  const total = Math.max(1, s1Len + arcLen + s2Len);
  const e1 = s1Len / total, e2 = e1 + arcLen / total;
  return { segEnds: [e1, e2, 1], s1: buildSpokeBezier(fromVert.x, fromVert.y, fromGate.x, fromGate.y, radius, curveSeed ^ 0x55aa), arc: { startAngle, deltaAngle, radius, cx, cy }, s2: buildSpokeBezier(toGate.x, toGate.y, toVert.x, toVert.y, radius, curveSeed ^ 0xaa55) };
}
function routePointAt(g: RouteGeometry, t: number) {
  const tt = Math.max(0, Math.min(1, t)), [e1, e2] = g.segEnds;
  if (tt <= e1) return bezierAt(g.s1, e1 > 0 ? tt / e1 : 0);
  if (tt <= e2) { const k = (tt - e1) / Math.max(1e-6, e2 - e1), a = g.arc.startAngle + g.arc.deltaAngle * k; return { x: g.arc.cx + Math.cos(a) * g.arc.radius, y: g.arc.cy + Math.sin(a) * g.arc.radius }; }
  return bezierAt(g.s2, (tt - e2) / Math.max(1e-6, 1 - e2));
}
function uid() { return Math.floor(Math.random() * 1e9); }
function drawPentagon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string, stroke: string) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; i === 0 ? ctx.moveTo(x + Math.cos(a) * size, y + Math.sin(a) * size) : ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke();
}
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, color: string) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, r = i % 2 === 0 ? outer : inner; i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

export function RingFlowSimulator() {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dimsRef = useRef({ cx: 360, cy: 360, radius: 280 });
  const gatesRef = useRef<Gate[]>([]);
  const vertiportsRef = useRef<Vertiport[]>([]);
  const routesRef = useRef<Route[]>([]);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const flaggedRoutesRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef<number>(performance.now());
  const lastDecisionRef = useRef<number>(0);
  const lastSpawnAcc = useRef<number>(0);
  const simTimeRef = useRef<number>(0);
  const utilHistoryRef = useRef<number[]>([]);
  const manualFloorRef = useRef<number>(0);
  const advisorSamplesRef = useRef<{ util: number; flights: number }[]>([]);
  const lastAdvisorSampleRef = useRef<number>(0);
  const lastAdvisorActionRef = useRef<number>(-999);
  const completedRollingRef = useRef<{ t: number; n: number }[]>([]);

  const [demand, setDemand] = useState(45);
  const [initialGates, setInitialGates] = useState(INITIAL_GATES);
  const [running, setRunning] = useState(true);
  const [autoScale, setAutoScale] = useState(true);
  const [stats, setStats] = useState({ activeGates: 0, activeRoutes: 0, completedFlights: 0, revenue: 0, revOperator: 0, revMrss: 0, revCity: 0, cost: 0, safety: "green" as SafetyStatus, avgUtil: 0, revPerMin: 0, netPerMin: 0 });
  const statsRef = useRef(stats); statsRef.current = stats;
  const initialAdvisor: AdvisorRec = { action: "hold", delta: 0, threshold: 0, utilization: 0, flightsPerHour: 0, gates: 0, netPerMin: 0, severity: "ok", reason: "Collecting data…" };
  const [advisor, setAdvisor] = useState<AdvisorRec>(initialAdvisor);
  const advisorRef = useRef<AdvisorRec>(initialAdvisor); advisorRef.current = advisor;
  const [advisorLog, setAdvisorLog] = useState<AdvisorEvent[]>([]);
  const advisorLogRef = useRef<AdvisorEvent[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logRef = useRef<LogEntry[]>([]);

  const pushLog = useCallback((msg: string, kind: LogEntry["kind"] = "info") => {
    const entry = { t: simTimeRef.current, msg, kind };
    logRef.current = [entry, ...logRef.current].slice(0, 60);
    setLog(logRef.current);
  }, []);
  const vertById = useCallback((id: string) => vertiportsRef.current.find(v => v.id === id), []);

  const reset = useCallback(() => {
    const { cx, cy, radius } = dimsRef.current;
    gatesRef.current = makeGates(initialGates, cx, cy, radius);
    const topo = buildTopology(gatesRef.current, [], cx, cy, radius);
    vertiportsRef.current = topo.vertiports; routesRef.current = topo.routes; vehiclesRef.current = [];
    flaggedRoutesRef.current = new Set(); simTimeRef.current = 0; lastDecisionRef.current = 0;
    lastSpawnAcc.current = 0; utilHistoryRef.current = []; manualFloorRef.current = initialGates;
    advisorSamplesRef.current = []; lastAdvisorSampleRef.current = 0; lastAdvisorActionRef.current = -999;
    completedRollingRef.current = []; advisorLogRef.current = []; setAdvisorLog([]); setAdvisor(initialAdvisor);
    logRef.current = []; setLog([]);
    setStats({ activeGates: gatesRef.current.filter(g => g.active).length, activeRoutes: routesRef.current.length, completedFlights: 0, revenue: 0, revOperator: 0, revMrss: 0, revCity: 0, cost: 0, safety: "green", avgUtil: 0, revPerMin: 0, netPerMin: 0 });
    pushLog(`Reset with ${initialGates} active gates.`, "info");
  }, [initialGates, pushLog]);

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapperRef.current;
    if (!canvas || !wrap) return;
    const update = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight, dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + "px"; canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d"); ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = w / 2, cy = h / 2, radius = Math.min(w, h) * 0.42;
      dimsRef.current = { cx, cy, radius };
      gatesRef.current.forEach(g => { const p = gatePosition(g.index, cx, cy, radius); g.x = p.x; g.y = p.y; });
      vertiportsRef.current.forEach(v => { v.x = cx + Math.cos(v.angle) * radius * v.radiusFrac; v.y = cy + Math.sin(v.angle) * radius * v.radiusFrac; });
    };
    update(); const ro = new ResizeObserver(update); ro.observe(wrap); return () => ro.disconnect();
  }, []);

  useEffect(() => { reset(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const recomputeRoutes = useCallback(() => {
    const { cx, cy, radius } = dimsRef.current;
    const topo = buildTopology(gatesRef.current, routesRef.current, cx, cy, radius);
    const ids = new Set(topo.routes.map(r => r.id));
    vehiclesRef.current = vehiclesRef.current.filter(v => ids.has(v.routeId));
    vertiportsRef.current = topo.vertiports; routesRef.current = topo.routes;
  }, []);

  const syncActiveCount = useCallback(() => {
    setStats(s => ({ ...s, activeGates: gatesRef.current.filter(g => g.active).length, activeRoutes: routesRef.current.length }));
  }, []);

  const activateGate = useCallback((quadrant: number, reason: string, manual = false) => {
    const totalActive = gatesRef.current.filter(g => g.active).length;
    if (totalActive >= MAX_GATES) { if (manual) pushLog(`All ${MAX_GATES} gates active.`, "warn"); return false; }
    const candidates = gatesRef.current.filter(g => !g.active && g.quadrant === quadrant);
    const pool = candidates.length > 0 ? candidates : gatesRef.current.filter(g => !g.active);
    if (pool.length === 0) return false;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    pick.active = true;
    if (manual) { manualFloorRef.current = Math.max(manualFloorRef.current, totalActive + 1); utilHistoryRef.current = []; }
    recomputeRoutes(); syncActiveCount(); pushLog(`Gate ${pick.id} ACTIVATED in Q${pick.quadrant + 1} (${reason}).`, "good"); return true;
  }, [pushLog, recomputeRoutes, syncActiveCount]);

  const deactivateGate = useCallback((reason: string, manual = false) => {
    const active = gatesRef.current.filter(g => g.active);
    if (active.length <= 3) { if (manual) pushLog(`Minimum 3 gates required.`, "warn"); return false; }
    const scored = active.map(g => ({ g, load: routesRef.current.filter(r => r.fromIdx === g.index).reduce((s, r) => s + r.load, 0) })).sort((a, b) => a.load - b.load);
    const target = scored[0].g; target.active = false;
    if (manual) { manualFloorRef.current = Math.max(3, Math.min(manualFloorRef.current, active.length - 1)); utilHistoryRef.current = []; }
    recomputeRoutes(); syncActiveCount(); pushLog(`Gate ${target.id} DEACTIVATED in Q${target.quadrant + 1} (${reason}).`, "info"); return true;
  }, [pushLog, recomputeRoutes, syncActiveCount]);

  const busiestQuadrant = useCallback(() => {
    const qLoad = [0,0,0,0], qCount = [0,0,0,0];
    routesRef.current.forEach(r => { const q = quadrantOf(r.fromIdx); qLoad[q] += r.load / r.capacity; qCount[q]++; });
    let bestQ = 0, bestVal = -1;
    for (let i = 0; i < 4; i++) { const v = qCount[i] > 0 ? qLoad[i] / qCount[i] : 0; if (v > bestVal) { bestVal = v; bestQ = i; } }
    return bestQ;
  }, []);

  const tryDecide = useCallback(() => {
    if (!autoScale) return;
    const rec = advisorRef.current; let appliedCount = 0;
    if (rec.action === "expand") { const targetQ = rec.targetQuadrant ?? busiestQuadrant(); for (let i = 0; i < rec.delta; i++) { if (!activateGate(targetQ, `advisor: ${Math.round(rec.utilization * 100)}% util`)) break; appliedCount++; } }
    else if (rec.action === "contract") { const floor = Math.max(3, manualFloorRef.current); for (let i = 0; i < rec.delta; i++) { if (gatesRef.current.filter(g => g.active).length <= floor) break; if (!deactivateGate(`advisor: ${Math.round(rec.utilization * 100)}% util`)) break; appliedCount++; } }
    if (appliedCount > 0) { advisorLogRef.current = [{ t: simTimeRef.current, rec: { ...rec, delta: appliedCount }, applied: true }, ...advisorLogRef.current].slice(0, 40); setAdvisorLog(advisorLogRef.current); }
  }, [autoScale, activateGate, deactivateGate, busiestQuadrant]);

  useEffect(() => {
    let raf = 0;
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      if (running) update(dt);
      draw();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, demand, autoScale]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(dt: number) {
    simTimeRef.current += dt;
    const routes = routesRef.current, vehicles = vehiclesRef.current;
    const spawnRate = 0.1 + (demand / 100) * 5.9;
    lastSpawnAcc.current += spawnRate * dt;
    while (lastSpawnAcc.current >= 1 && routes.length > 0) {
      lastSpawnAcc.current -= 1;
      const choices = routes.filter(r => r.load < r.capacity);
      const pool = choices.length > 0 ? choices : routes;
      const r = pool[Math.floor(Math.random() * pool.length)];
      if (vehicles.some(v => v.routeId === r.id && v.progress < MIN_SEPARATION)) continue;
      vehicles.push({ id: uid(), routeId: r.id, progress: 0, speed: VEHICLE_SPEED * (0.85 + Math.random() * 0.3), operator: Math.floor(Math.random() * OPERATORS.length) });
    }
    const byRoute: Record<string, Vehicle[]> = {};
    vehicles.forEach(v => { (byRoute[v.routeId] ||= []).push(v); });
    Object.values(byRoute).forEach(vs => vs.sort((a, b) => b.progress - a.progress));
    let completedThisTick = 0, revenueThisTick = 0;
    Object.entries(byRoute).forEach(([rid, vs]) => {
      for (let i = 0; i < vs.length; i++) {
        const v = vs[i]; let advance = v.speed * dt;
        if (i > 0) advance = Math.min(advance, Math.max(0, vs[i-1].progress - v.progress - MIN_SEPARATION));
        v.progress += advance;
        if (v.progress >= 1) { completedThisTick++; revenueThisTick += TICKET_PRICE; }
      }
      const route = routes.find(r => r.id === rid);
      if (route) route.load = vs.filter(v => v.progress < 1).length;
    });
    vehiclesRef.current = vehicles.filter(v => v.progress < 1);
    routes.forEach(r => { if (!byRoute[r.id]) r.load = 0; });
    let worst: SafetyStatus = "green"; flaggedRoutesRef.current = new Set();
    routes.forEach(r => { const u = r.load / r.capacity; if (u >= 1) { worst = "red"; flaggedRoutesRef.current.add(r.id); } else if (u >= 0.75 && worst !== "red") worst = "yellow"; });
    if (completedThisTick > 0) completedRollingRef.current.push({ t: simTimeRef.current, n: completedThisTick });
    completedRollingRef.current = completedRollingRef.current.filter(e => simTimeRef.current - e.t <= 60);
    const windowSec = Math.min(60, Math.max(1, simTimeRef.current));
    const flightsPerMin = (completedRollingRef.current.reduce((s, e) => s + e.n, 0) / windowSec) * 60;
    if (simTimeRef.current - lastAdvisorSampleRef.current >= 0.5) {
      lastAdvisorSampleRef.current = simTimeRef.current;
      const curUtil = routes.length > 0 ? routes.reduce((sum, r) => sum + r.load / r.capacity, 0) / routes.length : 0;
      advisorSamplesRef.current.push({ util: curUtil, flights: flightsPerMin });
      if (advisorSamplesRef.current.length > 16) advisorSamplesRef.current.shift();
      const sustained = advisorSamplesRef.current.reduce((s, x) => s + x.util, 0) / advisorSamplesRef.current.length;
      const activeNow = gatesRef.current.filter(g => g.active).length;
      const qLoadSum = [0,0,0,0], qGates = [0,0,0,0];
      routes.forEach(r => { const q = quadrantOf(r.fromIdx); qLoadSum[q] += r.load / r.capacity; qGates[q]++; });
      const perQuadrantUtil = qLoadSum.map((sum, i) => qGates[i] > 0 ? sum / qGates[i] : 0);
      const tentRev = statsRef.current.revenue + revenueThisTick;
      const tentCost = statsRef.current.cost + activeNow * GATE_FIXED_COST_PER_SEC * dt;
      const netPerMinNow = (tentRev - tentCost) / Math.max(1/60, simTimeRef.current / 60);
      const rec = computeAdvisorRec({ active: activeNow, sustained, flightsPerHour: sustained * activeNow * CAPACITY_PER_GATE_PER_HOUR, netPerMin: netPerMinNow, safety: worst, perQuadrantUtil, perQuadrantGates: qGates });
      const prev = advisorRef.current;
      if (prev.action !== rec.action || prev.delta !== rec.delta || prev.gates !== rec.gates || Math.abs(prev.utilization - rec.utilization) > 0.05) {
        advisorLogRef.current = [{ t: simTimeRef.current, rec }, ...advisorLogRef.current].slice(0, 40); setAdvisorLog(advisorLogRef.current);
      }
      advisorRef.current = rec; setAdvisor(rec);
    }
    if (simTimeRef.current - lastDecisionRef.current >= DECISION_INTERVAL_SEC) {
      lastDecisionRef.current = simTimeRef.current;
      if (simTimeRef.current - lastAdvisorActionRef.current >= DECISION_INTERVAL_SEC && autoScale && advisorRef.current.action !== "hold") {
        tryDecide(); lastAdvisorActionRef.current = simTimeRef.current; advisorSamplesRef.current = [];
      }
      flaggedRoutesRef.current.forEach(rid => pushLog(`Safety warning: Route ${rid} at capacity.`, "warn"));
    }
    const s = statsRef.current, completed = s.completedFlights + completedThisTick, revenue = s.revenue + revenueThisTick;
    const activeGates = gatesRef.current.filter(g => g.active).length, cost = s.cost + activeGates * GATE_FIXED_COST_PER_SEC * dt;
    const avgUtil = routes.length > 0 ? routes.reduce((sum, r) => sum + r.load / r.capacity, 0) / routes.length : 0;
    const minutes = Math.max(1/60, simTimeRef.current / 60);
    setStats({ activeGates, activeRoutes: routes.length, completedFlights: completed, revenue, revOperator: s.revOperator + revenueThisTick * SPLIT_OPERATOR, revMrss: s.revMrss + revenueThisTick * SPLIT_MRSS, revCity: s.revCity + revenueThisTick * SPLIT_CITY, cost, safety: worst, avgUtil, revPerMin: revenue / minutes, netPerMin: (revenue - cost) / minutes });
  }

  function draw() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const { cx, cy, radius } = dimsRef.current;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 1.2);
    grad.addColorStop(0, "rgba(20,184,166,0.10)"); grad.addColorStop(1, "rgba(20,184,166,0)");
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, radius * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(148,163,184,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, cy - radius * 1.05); ctx.lineTo(cx, cy + radius * 1.05); ctx.moveTo(cx - radius * 1.05, cy); ctx.lineTo(cx + radius * 1.05, cy); ctx.stroke();
    ctx.strokeStyle = "rgba(148,163,184,0.40)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(148,163,184,0.55)"; ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Q1", cx + radius * 0.6, cy - radius * 0.6); ctx.fillText("Q2", cx + radius * 0.6, cy + radius * 0.6);
    ctx.fillText("Q3", cx - radius * 0.6, cy + radius * 0.6); ctx.fillText("Q4", cx - radius * 0.6, cy - radius * 0.6);
    [-Math.PI/4, Math.PI/4, 3*Math.PI/4, -3*Math.PI/4].forEach(a => {
      const x = cx + Math.cos(a) * radius, y = cy + Math.sin(a) * radius, tx = -Math.sin(a), ty = Math.cos(a), len = 8, ww = 4;
      ctx.fillStyle = "rgba(148,163,184,0.55)"; ctx.beginPath();
      ctx.moveTo(x + tx*len, y + ty*len); ctx.lineTo(x - tx*(len*0.4) + ty*ww, y - ty*(len*0.4) - tx*ww); ctx.lineTo(x - tx*(len*0.4) - ty*ww, y - ty*(len*0.4) + tx*ww); ctx.closePath(); ctx.fill();
    });
    const routeGeoms = new Map<string, RouteGeometry>();
    routesRef.current.forEach(r => {
      const fromGate = gatesRef.current[r.fromIdx], toGate = gatesRef.current[r.toIdx];
      const fromV = vertById(r.fromVertId), toV = vertById(r.vertId);
      if (!fromGate || !toGate || !fromV || !toV) return;
      const geom = buildRouteGeometry(fromV, fromGate, toGate, toV, cx, cy, radius, r.curveSeed);
      routeGeoms.set(r.id, geom);
      const flagged = flaggedRoutesRef.current.has(r.id), u = r.load / r.capacity;
      const color = flagged ? "rgba(248,113,113,0.95)" : u > 0.75 ? "rgba(250,204,21,0.85)" : "rgba(56,189,248,0.55)";
      ctx.strokeStyle = color; ctx.lineWidth = flagged ? 2.2 : 1.4;
      ctx.beginPath(); ctx.moveTo(geom.s1.ax, geom.s1.ay); ctx.bezierCurveTo(geom.s1.p1x, geom.s1.p1y, geom.s1.p2x, geom.s1.p2y, geom.s1.bx, geom.s1.by); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, radius, geom.arc.startAngle, geom.arc.startAngle + geom.arc.deltaAngle, false); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(geom.s2.ax, geom.s2.ay); ctx.bezierCurveTo(geom.s2.p1x, geom.s2.p1y, geom.s2.p2x, geom.s2.p2y, geom.s2.bx, geom.s2.by); ctx.stroke();
      const midAngle = geom.arc.startAngle + geom.arc.deltaAngle * 0.55;
      const mx = cx + Math.cos(midAngle) * radius, my = cy + Math.sin(midAngle) * radius, tx = -Math.sin(midAngle), ty = Math.cos(midAngle);
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(mx + tx*7, my + ty*7); ctx.lineTo(mx - tx*2.8 + ty*3.5, my - ty*2.8 - tx*3.5); ctx.lineTo(mx - tx*2.8 - ty*3.5, my - ty*2.8 + tx*3.5); ctx.closePath(); ctx.fill();
    });
    vehiclesRef.current.forEach(v => {
      const r = routesRef.current.find(rt => rt.id === v.routeId); if (!r) return;
      const geom = routeGeoms.get(r.id); if (!geom) return;
      const p = routePointAt(geom, v.progress);
      ctx.fillStyle = OPERATOR_COLORS[v.operator]; ctx.shadowColor = OPERATOR_COLORS[v.operator]; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    });
    vertiportsRef.current.forEach(v => {
      const incoming = routesRef.current.filter(r => r.vertId === v.id);
      const hot = incoming.some(r => flaggedRoutesRef.current.has(r.id)), hasRoute = incoming.length > 0;
      drawPentagon(ctx, v.x, v.y, 9, hasRoute ? "rgba(244,63,94,0.18)" : "rgba(100,116,139,0.10)", hot ? "#f87171" : hasRoute ? "#f43f5e" : "rgba(148,163,184,0.55)");
      ctx.fillStyle = hasRoute ? "rgba(248,113,113,0.85)" : "rgba(148,163,184,0.55)"; ctx.font = "9px ui-monospace, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(v.id, v.x, v.y + 12);
    });
    gatesRef.current.forEach(g => {
      if (g.active) { ctx.shadowColor = "#10b981"; ctx.shadowBlur = 12; drawStar(ctx, g.x, g.y, 9, 4, "#10b981"); ctx.shadowBlur = 0; }
      else { ctx.fillStyle = "rgba(100,116,139,0.55)"; ctx.beginPath(); ctx.arc(g.x, g.y, 4, 0, Math.PI * 2); ctx.fill(); }
      const angle = Math.atan2(g.y - cy, g.x - cx), lx = cx + Math.cos(angle) * (radius + 18), ly = cy + Math.sin(angle) * (radius + 18);
      ctx.fillStyle = g.active ? "rgba(226,232,240,0.95)" : "rgba(148,163,184,0.5)"; ctx.font = "10px ui-monospace, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(g.id, lx, ly);
    });
  }

  const safetyColor = stats.safety === "green" ? "bg-emerald-500" : stats.safety === "yellow" ? "bg-yellow-400" : "bg-red-500";
  const profitable = stats.revenue - stats.cost > 0;

  return (
    <div className="min-h-screen w-full text-foreground">
      <header className="px-6 py-4 border-b border-border/60 backdrop-blur sticky top-0 bg-background/70 z-20">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} style={{ background:"rgba(0,255,255,0.08)", border:"1px solid rgba(0,255,255,0.3)", color:"#00ffcc", padding:"4px 14px", borderRadius:"4px", cursor:"pointer", fontSize:"9px", letterSpacing:"2px", fontFamily:"'Orbitron', monospace" }}>
              ← MRSS
            </button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Meridian Ring <span className="text-primary">Flow Simulator</span></h1>
              <p className="text-xs text-muted-foreground mt-0.5">Correct ring flow: clockwise, spoke-arc-spoke, quadrant vertiports, 70/20/10 split.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border ${profitable ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" : "border-amber-500/40 text-amber-300 bg-amber-500/10"}`}>
              <span className={`w-2 h-2 rounded-full ${profitable ? "bg-emerald-400" : "bg-amber-400"}`} />{profitable ? "Profitable" : "Below break-even"}
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card">
              <span className={`w-2 h-2 rounded-full ${safetyColor}`} />Safety: {stats.safety === "green" ? "All clear" : stats.safety === "yellow" ? "Approaching capacity" : "Conflict risk"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-4">
        <section className="space-y-4">
          <RFCard title="Controls">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">Traffic Demand <span className="text-primary">{demand}</span></div>
                <input type="range" min={0} max={100} value={demand} onChange={e => setDemand(Number(e.target.value))} className="w-full accent-teal-400" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">Initial Active Gates <span className="text-primary">{initialGates}</span></div>
                <input type="range" min={3} max={MAX_GATES} value={initialGates} onChange={e => setInitialGates(Number(e.target.value))} className="w-full accent-teal-400" />
                <div className="text-[10px] text-muted-foreground mt-1">Applied on Reset.</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Auto Expand / Contract</span>
                <button onClick={() => setAutoScale(v => !v)} className={`px-3 py-1 rounded-md text-xs font-medium border transition ${autoScale ? "bg-primary/20 border-primary/50 text-primary" : "bg-muted border-border text-muted-foreground"}`}>{autoScale ? "ON" : "OFF"}</button>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setRunning(r => !r)} className="flex-1 px-3 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90">{running ? "Pause" : "Start"}</button>
                <button onClick={reset} className="px-3 py-2 rounded-md text-sm font-medium border border-border bg-card hover:bg-muted">Reset</button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => activateGate(Math.floor(Math.random() * 4), "manual", true)} disabled={stats.activeGates >= MAX_GATES} className="px-2 py-1.5 rounded-md text-xs border border-border bg-card hover:bg-muted disabled:opacity-40">+ Gate</button>
                <button onClick={() => deactivateGate("manual", true)} disabled={stats.activeGates <= 3} className="px-2 py-1.5 rounded-md text-xs border border-border bg-card hover:bg-muted disabled:opacity-40">− Gate</button>
              </div>
            </div>
          </RFCard>
          <RFCard title="System">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["Active Gates", `${stats.activeGates} / ${MAX_GATES}`], ["Active Routes", String(stats.activeRoutes)], ["Avg Util", `${(stats.avgUtil*100).toFixed(0)}%`], ["Flights Done", stats.completedFlights.toLocaleString()]].map(([l,v]) => (
                <div key={l}><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div><div className="text-lg font-semibold tabular-nums">{v}</div></div>
              ))}
            </div>
          </RFCard>
        </section>

        <section className="relative bg-card/40 border border-border rounded-xl overflow-hidden min-h-[620px]">
          <div ref={wrapperRef} className="absolute inset-0"><canvas ref={canvasRef} className="block w-full h-full" /></div>
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 bg-background/70 backdrop-blur px-3 py-2 rounded-lg border border-border text-[11px]">
            {OPERATORS.map((op, i) => <span key={op} className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: OPERATOR_COLORS[i] }} />{op}</span>)}
          </div>
          <div className="absolute top-3 right-3 text-[11px] text-muted-foreground bg-background/70 backdrop-blur px-3 py-1.5 rounded-md border border-border tabular-nums">
            {Math.floor(stats.avgUtil * 100)}% util
          </div>
        </section>

        <section className="space-y-4">
          <RFCard title="Cash Flow">
            <div className="space-y-2 text-sm">
              {[["Total Revenue", `$${stats.revenue.toFixed(0)}`], ["Operators 70%", `$${stats.revOperator.toFixed(0)}`], ["MRSS 20%", `$${stats.revMrss.toFixed(0)}`], ["City 10%", `$${stats.revCity.toFixed(0)}`]].map(([k,v]) => (
                <div key={k} className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{k}</span><span className="font-mono tabular-nums text-sm">{v}</span></div>
              ))}
              <div className="h-px bg-border my-1" />
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Gate Cost</span><span className="font-mono tabular-nums text-sm text-red-300">-${stats.cost.toFixed(0)}</span></div>
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Net</span><span className="font-mono tabular-nums text-sm font-semibold">${(stats.revenue - stats.cost).toFixed(0)}</span></div>
              <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Net / min</span><span className="font-mono tabular-nums text-sm">${stats.netPerMin.toFixed(1)}</span></div>
            </div>
          </RFCard>
          <RFCard title="Capacity Advisor">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Utilization</span><span className="font-semibold">{Math.round(advisor.utilization * 100)}%</span></div>
                <div className="relative h-3 rounded-full border border-border bg-muted overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-[70%] bg-emerald-500/20" />
                  <div className="absolute inset-y-0 left-[70%] w-[15%] bg-amber-500/25" />
                  <div className="absolute inset-y-0 left-[85%] w-[15%] bg-red-500/25" />
                  <div className="absolute -top-1 -bottom-1 w-[3px] bg-foreground rounded-sm" style={{ left: `calc(${Math.round(advisor.utilization * 100)}% - 1.5px)` }} />
                </div>
              </div>
              <div className={`rounded-md border px-3 py-2 text-xs ${advisor.severity === "alert" ? "border-red-500/50 bg-red-500/10 text-red-200" : advisor.severity === "warn" ? "border-amber-500/50 bg-amber-500/10 text-amber-100" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-wider opacity-80">Recommendation</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${advisor.action === "expand" ? "bg-amber-500/20 text-amber-200 border-amber-500/40" : advisor.action === "contract" ? "bg-sky-500/20 text-sky-200 border-sky-500/40" : "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"}`}>
                    {advisor.action === "expand" ? `+${advisor.delta} gates` : advisor.action === "contract" ? `−${advisor.delta} gates` : "Hold"}
                  </span>
                </div>
                <div>{advisor.reason}</div>
              </div>
              <div className="max-h-[120px] overflow-auto space-y-1 pr-1">
                {advisorLog.length === 0 && <div className="text-[11px] text-muted-foreground">No events yet…</div>}
                {advisorLog.map((e, i) => (
                  <div key={i} className="text-[11px] font-mono">
                    <span className="text-muted-foreground">{e.t.toFixed(1)}s </span>
                    <span className={e.applied ? "text-emerald-300" : e.rec.action === "expand" ? "text-amber-200" : e.rec.action === "contract" ? "text-sky-300" : "text-slate-400"}>
                      {Math.round(e.rec.utilization * 100)}% ({e.rec.gates}g) → {e.applied ? `Applied ${e.rec.action}` : e.rec.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </RFCard>
          <RFCard title="Event Log">
            <div className="max-h-[200px] overflow-auto space-y-1">
              {log.length === 0 && <div className="text-xs text-muted-foreground">No events yet…</div>}
              {log.map((e, i) => <div key={i} className="text-[11px] font-mono"><span className="text-muted-foreground">{e.t.toFixed(1)}s </span><span className={e.kind === "warn" ? "text-red-300" : e.kind === "good" ? "text-emerald-300" : "text-slate-300"}>{e.msg}</span></div>)}
            </div>
          </RFCard>
        </section>
      </main>
    </div>
  );
}

function RFCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card/60 border border-border rounded-xl">
      <div className="px-4 py-2.5 border-b border-border/70 text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}
