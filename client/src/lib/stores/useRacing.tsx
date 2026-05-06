import { create } from 'zustand';
import {
  buildMRSSGates, INITIAL_GATES,
} from '@/lib/mrssTopology';

// ─── MRSSP Vehicle Config ──────────────────────────────────────────────────
export const VEHICLE_CONFIGS = [
  { id: 'AE-MK4-001', name: 'Airspeeder Alpha', vehicleClass: 'A' as const, color: '#FF6B00', speed: 1.00, t0: 0.00 },
  { id: 'AE-MK4-002', name: 'Airspeeder Beta',  vehicleClass: 'A' as const, color: '#CC5500', speed: 0.95, t0: 0.07 },
  { id: 'JT-ONE-003',  name: 'Jetson Crew One',  vehicleClass: 'A' as const, color: '#FFB800', speed: 0.80, t0: 0.14 },
  { id: 'AUTO-001',    name: 'Autonomous Alpha', vehicleClass: 'B' as const, color: '#00D4FF', speed: 1.10, t0: 0.03 },
  { id: 'AUTO-002',    name: 'Autonomous Beta',  vehicleClass: 'B' as const, color: '#0099CC', speed: 1.05, t0: 0.10 },
  { id: 'PAYLOAD-003', name: 'Payload Craft',    vehicleClass: 'B' as const, color: '#8B5CF6', speed: 0.75, t0: 0.17 },
];

// BASE_SPD: how many laps/sec a speed=1.0 vehicle completes
const BASE_SPD = 0.055;

// Altitude constants (scene units, must match RacingTrack.tsx)
const ALT_CLASS_A = 1.5;
const ALT_CLASS_B = 0.8;

// ─── Gate Definitions — built from MRSS topology (single source of truth) ─
// Active gates only (INITIAL_GATES=8, indices: 0,2,5,7,10,12,15,17).
// Circuit t-value = seg/N where seg = 0..7 (VP position on compound curve).
// Compound curve: 4 pts/seg × 8 segs = 32 ctrl pts. VP at seg/8, gate depart at seg/8+1/32.
const Q_COLORS = ['#00FF88', '#00D4FF', '#FF6B00', '#a78bfa'] as const;
const MRSS_GATES   = buildMRSSGates(INITIAL_GATES);
const ACTIVE_GATES = MRSS_GATES.filter(g => g.active).sort((a, b) => a.index - b.index);
const N_ACTIVE     = ACTIVE_GATES.length;

export const GATE_DEFS = ACTIVE_GATES.map((g, seg) => ({
  id:          `G${g.index + 1}`,
  mrssIdx:     g.index,
  name:        g.index === 0 ? 'START / FINISH' : `Q${g.quadrant + 1} · Gate ${g.index + 1}`,
  t:           seg / N_ACTIVE,
  color:       Q_COLORS[g.quadrant],
  missionPhase: g.index === 0 ? 'Race Start — Data Capture' : `Q${g.quadrant + 1} Checkpoint`,
  active:      true,
}));

// ─── Challenge Routes — scoring only (geometry lives in RacingVehicles) ───
// Each active gate except G1 has a challenge: vehicle follows MRSS spoke to
// its vertiport (outbound) and back (inbound) while being scored.
// exitT = gate.t + half-gate-width advance so vehicle doesn't re-trigger.

type ScoreKey = keyof MRSSPScores;

// Scoring data only — route geometry is derived from MRSS spoke in RacingVehicles.tsx
interface ChallengeRoute {
  title:       string;
  scoreKey:    ScoreKey;
  passBonus:   number;
  failPenalty: number;
  exitT:       number;  // gate.t + half-gate-width so vehicle doesn't re-trigger
}

// Active gate IDs (INITIAL_GATES=8, step=2.5 → indices 0,2,5,7,10,12,15,17)
// G1 (index 0) = START/FINISH, no challenge.
// exitT = gate.t + 2/32 = gate.t + 0.0625 (arc midpoint of next segment — past gate, no re-trigger)
export const CHALLENGE_ROUTES: Record<string, ChallengeRoute> = {
  'G3':  { title: 'Energy Budget Check',    scoreKey: 'efficiency', passBonus: 5, failPenalty: 8,  exitT: 0.1875 },
  'G6':  { title: 'Max Performance Window', scoreKey: 'gateTime',   passBonus: 7, failPenalty: 10, exitT: 0.3125 },
  'G8':  { title: 'Precision Sector',       scoreKey: 'precision',  passBonus: 6, failPenalty: 9,  exitT: 0.4375 },
  'G11': { title: 'TRACON Decision Point',  scoreKey: 'decision',   passBonus: 6, failPenalty: 9,  exitT: 0.5625 },
  'G13': { title: 'Recovery Protocol',      scoreKey: 'recovery',   passBonus: 5, failPenalty: 8,  exitT: 0.6875 },
  'G16': { title: 'Power Sector',           scoreKey: 'gateTime',   passBonus: 7, failPenalty: 10, exitT: 0.8125 },
  'G18': { title: 'Final Check',            scoreKey: 'efficiency', passBonus: 5, failPenalty: 8,  exitT: 0.9375 },
};

// ─── Types ────────────────────────────────────────────────────────────────
export interface MRSSPScores {
  gateTime:    number;   // 0–100
  precision:   number;
  efficiency:  number;
  decision:    number;
  recovery:    number;
  composite:   number;
}

export interface RacingVehicle {
  id: string;
  name: string;
  vehicleClass: 'A' | 'B';
  color: string;
  speed: number;
  t: number;                    // 0–1 progress on main circuit
  laps: number;
  battery: number;              // 0–100 %
  scores: MRSSPScores;
  aborted: boolean;
  abortRecovering: boolean;
  lastLapTime: number | null;   // seconds taken for previous lap
  lapStartTime: number;         // raceTime when current lap began
  nextGateId: string | null;    // ID of next upcoming gate
  // Challenge routing
  mode: 'MAIN' | 'CHALLENGE';
  challengeGk: string | null;   // active challenge gate ID
  challengeT: number;           // 0–1 progress within challenge route
  gatesVisited: string[];       // gates triggered this lap (reset on lap complete)
}

export type GateStatus = 'WAITING' | 'ACTIVE' | 'COMPLETE';

export interface RacingGate {
  id: string;
  name: string;
  t: number;
  color: string;
  missionPhase: string;
  status: GateStatus;
  activeVehicleId: string | null;
}

export type AAMIStatus = 'ACTIVE' | 'REVIEWING' | 'SUSPENDED';

export interface RacingState {
  raceRunning: boolean;
  racePaused: boolean;
  raceTime: number;           // seconds
  abortAlertLevel: number;    // 0 = none, 1-3 = sequence stages
  abortAlertText: string;
  vehicles: RacingVehicle[];
  gates: RacingGate[];
  aamiTelemetry: number;
  aamiCompliance: number;
  aamiQuality: number;
  aamiSafetyEvents: number;
  aamiStatus: AAMIStatus;
  followedId: string | null;
  showClassA: boolean;
  showClassB: boolean;
  // actions
  startRace: () => void;
  pauseRace: () => void;
  resetRace: () => void;
  triggerAbort: (vehicleId?: string) => void;
  forceGate: () => void;
  setFollowed: (id: string | null) => void;
  setShowClassA: (v: boolean) => void;
  setShowClassB: (v: boolean) => void;
  tick: (delta: number) => void;
}

// ─── Scoring helpers ──────────────────────────────────────────────────────
function vrn(base: number, variance = 8): number {
  return Math.min(100, Math.max(0, base + (Math.random() - 0.5) * 2 * variance));
}

function initScores(vehicleClass: 'A' | 'B'): MRSSPScores {
  const isB = vehicleClass === 'B';
  const gateTime   = vrn(78);
  const precision  = vrn(isB ? 76 : 85);
  const efficiency = vrn(80);
  const decision   = vrn(isB ? 88 : 78);
  const recovery   = vrn(isB ? 86 : 76);
  const composite  = gateTime * 0.25 + precision * 0.25 + efficiency * 0.20 + decision * 0.15 + recovery * 0.15;
  return { gateTime, precision, efficiency, decision, recovery, composite };
}

function updateScores(v: RacingVehicle): MRSSPScores {
  if (v.aborted) {
    const recovery = Math.min(v.scores.recovery + 5, 60);
    const composite = v.scores.gateTime * 0.25 + v.scores.precision * 0.25 + v.scores.efficiency * 0.20 + v.scores.decision * 0.15 + recovery * 0.15;
    return { ...v.scores, recovery, composite };
  }
  const isB = v.vehicleClass === 'B';
  const gateTime   = vrn(v.scores.gateTime,   6);
  const precision  = vrn(v.scores.precision + (isB ? 0 : 5), 6);
  const efficiency = vrn(v.scores.efficiency, 6);
  const decision   = vrn(v.scores.decision  + (isB ? 7 : 0), 6);
  const recovery   = vrn(v.scores.recovery  + (isB ? 7 : 0), 6);
  const composite  = gateTime * 0.25 + precision * 0.25 + efficiency * 0.20 + decision * 0.15 + recovery * 0.15;
  return { gateTime, precision, efficiency, decision, recovery, composite };
}

function evalChallenge(v: RacingVehicle, gk: string): MRSSPScores {
  const cr = CHALLENGE_ROUTES[gk];
  if (!cr) return v.scores;
  const key     = cr.scoreKey;
  const current = v.scores[key];
  // Class B gets a threshold advantage on decision + recovery
  const threshold = (v.vehicleClass === 'B' && (key === 'decision' || key === 'recovery')) ? 67 : 72;
  const passed  = current > threshold;
  const delta   = passed ? cr.passBonus : -cr.failPenalty;
  const updated = { ...v.scores, [key]: Math.min(100, Math.max(0, current + delta)) };
  const composite = updated.gateTime * 0.25 + updated.precision * 0.25 + updated.efficiency * 0.20 + updated.decision * 0.15 + updated.recovery * 0.15;
  return { ...updated, composite };
}

// ─── Initial state builders ───────────────────────────────────────────────
function makeVehicles(): RacingVehicle[] {
  return VEHICLE_CONFIGS.map(cfg => ({
    id:              cfg.id,
    name:            cfg.name,
    vehicleClass:    cfg.vehicleClass,
    color:           cfg.color,
    speed:           cfg.speed,
    t:               cfg.t0,
    laps:            0,
    battery:         100,
    scores:          initScores(cfg.vehicleClass),
    aborted:         false,
    abortRecovering: false,
    lastLapTime:     null,
    lapStartTime:    0,
    nextGateId:      GATE_DEFS[0].id,
    mode:            'MAIN' as const,
    challengeGk:     null,
    challengeT:      0,
    gatesVisited:    [],
  }));
}

function makeGates(): RacingGate[] {
  return GATE_DEFS.map(g => ({
    id:              g.id,
    name:            g.name,
    t:               g.t,
    color:           g.color,
    missionPhase:    g.missionPhase,
    status:          'WAITING' as GateStatus,
    activeVehicleId: null,
  }));
}

// ─── Store ────────────────────────────────────────────────────────────────
let scoreInterval:    ReturnType<typeof setInterval> | null = null;
let aamiInterval:     ReturnType<typeof setInterval> | null = null;
let aamiFlipInterval: ReturnType<typeof setInterval> | null = null;

function clearIntervals() {
  if (scoreInterval)    { clearInterval(scoreInterval);    scoreInterval    = null; }
  if (aamiInterval)     { clearInterval(aamiInterval);     aamiInterval     = null; }
  if (aamiFlipInterval) { clearInterval(aamiFlipInterval); aamiFlipInterval = null; }
}

export const useRacing = create<RacingState>((set, get) => ({
  raceRunning:      false,
  racePaused:       false,
  raceTime:         0,
  abortAlertLevel:  0,
  abortAlertText:   '',
  vehicles:         makeVehicles(),
  gates:            makeGates(),
  aamiTelemetry:    0,
  aamiCompliance:   99.7,
  aamiQuality:      99.8,
  aamiSafetyEvents: 0,
  aamiStatus:       'ACTIVE',
  followedId:       null,
  showClassA:       true,
  showClassB:       true,

  startRace: () => {
    clearIntervals();
    set({ raceRunning: true, racePaused: false });

    // Score updates every 500ms
    scoreInterval = setInterval(() => {
      if (!get().raceRunning || get().racePaused) return;
      set(s => ({ vehicles: s.vehicles.map(v => ({ ...v, scores: updateScores(v) })) }));
    }, 500);

    // AAMI telemetry: +1 every 20ms
    aamiInterval = setInterval(() => {
      if (!get().raceRunning || get().racePaused) return;
      set(s => ({ aamiTelemetry: s.aamiTelemetry + 1 }));
    }, 20);

    // AAMI compliance/quality fluctuation every 2s
    aamiFlipInterval = setInterval(() => {
      if (!get().raceRunning) return;
      set(s => ({
        aamiCompliance: Math.min(99.9, Math.max(99.5, s.aamiCompliance + (Math.random() - 0.5) * 0.4)),
        aamiQuality:    Math.min(99.9, Math.max(99.5, s.aamiQuality    + (Math.random() - 0.5) * 0.4)),
      }));
    }, 2000);
  },

  pauseRace: () => {
    set(s => ({ racePaused: !s.racePaused }));
  },

  resetRace: () => {
    clearIntervals();
    set({
      raceRunning:      false,
      racePaused:       false,
      raceTime:         0,
      abortAlertLevel:  0,
      abortAlertText:   '',
      vehicles:         makeVehicles(),
      gates:            makeGates(),
      aamiTelemetry:    0,
      aamiCompliance:   99.7,
      aamiQuality:      99.8,
      aamiSafetyEvents: 0,
      aamiStatus:       'ACTIVE',
    });
  },

  triggerAbort: (vehicleId?: string) => {
    set(s => {
      const targets = vehicleId
        ? s.vehicles.filter(v => v.id === vehicleId)
        : s.vehicles.filter(v => v.vehicleClass === 'B');

      return {
        abortAlertLevel:  1,
        abortAlertText:   '⚠ LEVEL 1 — VEHICLE AUTO-LAND TRIGGERED',
        aamiSafetyEvents: s.aamiSafetyEvents + 1,
        aamiStatus:       'REVIEWING',
        vehicles: s.vehicles.map(v =>
          targets.some(t => t.id === v.id)
            ? { ...v, aborted: true, mode: 'MAIN' as const, challengeGk: null, challengeT: 0, scores: { ...v.scores, recovery: 40 } }
            : v
        ),
      };
    });

    setTimeout(() => {
      set({ abortAlertLevel: 2, abortAlertText: '🔴 LEVEL 2 — GROUND STATION OVERRIDE CONFIRMED' });
    }, 1500);

    setTimeout(() => {
      set({ abortAlertLevel: 3, abortAlertText: '⬇ RECOVERY — VEHICLES RESUMING FROM SAFE POSITION' });
    }, 3000);

    setTimeout(() => {
      set(s => ({
        abortAlertLevel: 0,
        abortAlertText:  '',
        aamiStatus:      'ACTIVE',
        vehicles: s.vehicles.map(v =>
          v.aborted ? { ...v, aborted: false, abortRecovering: true } : v
        ),
      }));
      setTimeout(() => {
        set(s => ({ vehicles: s.vehicles.map(v => ({ ...v, abortRecovering: false })) }));
      }, 3000);
    }, 5000);
  },

  forceGate: () => {
    const { followedId, vehicles, gates } = get();
    const vid = followedId ?? vehicles[0]?.id;
    if (!vid) return;
    const vehicle = vehicles.find(v => v.id === vid);
    if (!vehicle) return;

    const next = gates
      .filter(g => g.t > vehicle.t || g.id === 'G1')
      .sort((a, b) => a.t - b.t)[0];

    if (!next) return;
    set(s => ({
      vehicles: s.vehicles.map(v => v.id === vid ? { ...v, t: next.t + 0.001 } : v),
      gates:    s.gates.map(g => g.id === next.id ? { ...g, status: 'ACTIVE', activeVehicleId: vid } : g),
    }));

    setTimeout(() => {
      set(s => ({
        gates: s.gates.map(g => g.id === next.id ? { ...g, status: 'COMPLETE', activeVehicleId: null } : g),
      }));
    }, 2500);
  },

  setFollowed:   (id) => set({ followedId: id }),
  setShowClassA: (v)  => set({ showClassA: v }),
  setShowClassB: (v)  => set({ showClassB: v }),

  tick: (delta: number) => {
    const s = get();
    if (!s.raceRunning || s.racePaused) return;

    const GATE_PROX = 0.04;
    let extraSafetyEvents = 0;

    const updatedVehicles = s.vehicles.map(v => {
      if (v.aborted) return v;

      // ── CHALLENGE MODE ───────────────────────────────────────────────────
      if (v.mode === 'CHALLENGE' && v.challengeGk) {
        const newCT = v.challengeT + BASE_SPD * v.speed * delta * 1.3;
        const battery = Math.max(0, v.battery - 0.015 * delta * 60);

        if (newCT >= 1) {
          // Evaluate pass/fail and apply score delta
          const newScores = evalChallenge(v, v.challengeGk);
          const passed    = newScores[CHALLENGE_ROUTES[v.challengeGk]?.scoreKey ?? 'gateTime'] >
                            v.scores[CHALLENGE_ROUTES[v.challengeGk]?.scoreKey ?? 'gateTime'];
          if (!passed) extraSafetyEvents++;
          const exitT = CHALLENGE_ROUTES[v.challengeGk]?.exitT ?? v.t;
          return {
            ...v,
            mode:        'MAIN' as const,
            challengeGk: null,
            challengeT:  0,
            t:           exitT,
            battery,
            scores:      newScores,
          };
        }
        return { ...v, challengeT: newCT, battery };
      }

      // ── MAIN MODE ────────────────────────────────────────────────────────
      const newT         = v.t + BASE_SPD * v.speed * delta;
      const completedLap = newT >= 1;
      const laps         = completedLap ? v.laps + 1 : v.laps;
      const t            = completedLap ? newT - 1 : newT;
      const battery      = Math.max(0, v.battery - 0.015 * delta * 60);
      const lastLapTime  = completedLap ? s.raceTime - v.lapStartTime : v.lastLapTime;
      const lapStartTime = completedLap ? s.raceTime : v.lapStartTime;
      // Clear gate visits on lap completion
      const gatesVisited = completedLap ? [] : v.gatesVisited;

      // Detect gate crossing (old t < gate.t <= new t), skip G1 (start/finish)
      const crossedGate = GATE_DEFS.find(g =>
        g.id !== 'G1' &&
        CHALLENGE_ROUTES[g.id] !== undefined &&
        !gatesVisited.includes(g.id) &&
        v.t < g.t && t >= g.t
      );

      if (crossedGate) {
        // Snap to gate, enter challenge
        return {
          ...v,
          t:            crossedGate.t,
          laps,
          battery,
          lastLapTime,
          lapStartTime,
          mode:         'CHALLENGE' as const,
          challengeGk:  crossedGate.id,
          challengeT:   0,
          gatesVisited: [...gatesVisited, crossedGate.id],
          nextGateId:   crossedGate.id,
        };
      }

      // Find next upcoming gate (wrapping)
      const nextGate = [...GATE_DEFS].sort((a, b) => {
        const da = (a.t - t + 1) % 1;
        const db = (b.t - t + 1) % 1;
        return da - db;
      })[0];

      return { ...v, t, laps, battery, lastLapTime, lapStartTime, gatesVisited, nextGateId: nextGate?.id ?? null };
    });

    // Gate proximity — only MAIN-mode vehicles trigger visual gate states
    const updatedGates = s.gates.map(gate => {
      if (gate.status === 'COMPLETE') {
        const anyNear = updatedVehicles.some(v =>
          v.mode === 'MAIN' && Math.abs(v.t - gate.t) < GATE_PROX * 3
        );
        if (!anyNear) return { ...gate, status: 'WAITING' as GateStatus, activeVehicleId: null };
        return gate;
      }

      const nearVehicle = updatedVehicles.find(v =>
        !v.aborted && v.mode === 'MAIN' && Math.abs(v.t - gate.t) < GATE_PROX
      );

      if (nearVehicle && gate.status === 'WAITING') {
        return { ...gate, status: 'ACTIVE' as GateStatus, activeVehicleId: nearVehicle.id };
      }
      if (gate.status === 'ACTIVE') {
        const stillNear = updatedVehicles.some(v =>
          !v.aborted && v.mode === 'MAIN' && Math.abs(v.t - gate.t) < GATE_PROX
        );
        if (!stillNear) return { ...gate, status: 'COMPLETE' as GateStatus };
      }
      return gate;
    });

    set({
      vehicles:         updatedVehicles,
      gates:            updatedGates,
      raceTime:         s.raceTime + delta,
      aamiSafetyEvents: extraSafetyEvents > 0 ? s.aamiSafetyEvents + extraSafetyEvents : s.aamiSafetyEvents,
    });
  },
}));
