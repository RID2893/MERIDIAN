import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { DemandGenerator } from "../../modules/DemandGenerator";
import { SafetySystem } from "../../modules/SafetySystem";
import { EventBus } from "../../modules/EventBus";
import { useWeather } from "./useWeather";

export type AircraftStatus = "in_ring" | "descending" | "landed" | "in_pipeline" | "ascending";
export type GateStatus = "GREEN" | "YELLOW" | "RED";
export type CityName = "San Diego" | "Orange County";
export type QuadrantName = "North" | "East" | "South" | "West";
export type PipelineVariant = "CENTER" | "TOP" | "BOTTOM";
export type PipelineName = "N-S-CENTER" | "N-S-TOP" | "N-S-BOTTOM" | "E-W-CENTER" | "E-W-TOP" | "E-W-BOTTOM";
export type ScenarioName = "normal" | "rush_hour" | "maintenance" | "emergency";
export type RingLevel = 1 | 2 | 3;
export type OperatorCode = 'AR' | 'JB' | 'WK' | 'BT' | 'LL' | 'VL';
export type FuelType = 'electric' | 'hydrogen' | 'jetFuel';
export type DAOProposalStatus = 'active' | 'passed' | 'failed';

// Meridian Ring Operation Volume Structure (FAA RFI aligned)
export const RING_CONFIGS: Record<RingLevel, { radius: number; altitude: number; color: number }> = {
  1: { radius: 3, altitude: 150, color: 0x00ff88 },   // Inner - Urban Core
  2: { radius: 6, altitude: 500, color: 0x00ffff },   // Middle - Main Corridor
  3: { radius: 9, altitude: 1000, color: 0x8866ff },  // Outer - Regional
};

// eVTOL Fleet Operator Colors (RFI Section F aligned)
export const OPERATOR_CONFIGS: Record<OperatorCode, { name: string; color: number; hex: string }> = {
  AR: { name: 'Archer Aviation', color: 0x00ff88, hex: '#00ff88' },   // Green
  JB: { name: 'Joby Aviation',   color: 0x4488ff, hex: '#4488ff' },   // Blue
  WK: { name: 'Wisk Aero',      color: 0xff8800, hex: '#ff8800' },   // Orange
  BT: { name: 'Beta Technologies', color: 0xff44aa, hex: '#ff44aa' }, // Pink
  LL: { name: 'Lilium',          color: 0xffdd00, hex: '#ffdd00' },   // Yellow
  VL: { name: 'Volocopter',      color: 0xaa66ff, hex: '#aa66ff' },   // Purple
};

const OPERATOR_CODES: OperatorCode[] = ['AR', 'JB', 'WK', 'BT', 'LL', 'VL'];

export interface ScenarioConfig {
  name: string;
  description: string;
  sdAircraftCount: number;
  laAircraftCount: number;
  pipelineAircraftCount: number;
  descentProbability: number;
  pipelineTransferProbability: number;
  departureProbability: number;
  pipelineCapacity: number;
  disabledGates: string[];
  alertMessage: string | null;
}

export const SCENARIO_CONFIGS: Record<ScenarioName, ScenarioConfig> = {
  normal: {
    name: "Normal Operations",
    description: "Standard traffic flow between cities",
    sdAircraftCount: 50,
    laAircraftCount: 40,
    pipelineAircraftCount: 20,
    descentProbability: 0.015,
    pipelineTransferProbability: 0.005,
    departureProbability: 0.03,
    pipelineCapacity: 30,
    disabledGates: [],
    alertMessage: null,
  },
  rush_hour: {
    name: "Rush Hour",
    description: "Peak traffic with high volume between cities",
    sdAircraftCount: 80,
    laAircraftCount: 70,
    pipelineAircraftCount: 40,
    descentProbability: 0.025,
    pipelineTransferProbability: 0.008,
    departureProbability: 0.04,
    pipelineCapacity: 40,
    disabledGates: [],
    alertMessage: "RUSH HOUR: High traffic volume active",
  },
  maintenance: {
    name: "Scheduled Maintenance",
    description: "Reduced capacity due to gate maintenance",
    sdAircraftCount: 30,
    laAircraftCount: 25,
    pipelineAircraftCount: 10,
    descentProbability: 0.01,
    pipelineTransferProbability: 0.003,
    departureProbability: 0.02,
    pipelineCapacity: 20,
    disabledGates: ["San Diego-NQ-01", "San Diego-NQ-02", "San Diego-NQ-03", "San Diego-NQ-04",
                    "San Diego-EQ-01", "San Diego-EQ-02", "San Diego-EQ-03", "San Diego-EQ-04",
                    "Orange County-SQ-01", "Orange County-SQ-02", "Orange County-SQ-03", "Orange County-SQ-04",
                    "Orange County-WQ-01", "Orange County-WQ-02", "Orange County-WQ-03", "Orange County-WQ-04"],
    alertMessage: "MAINTENANCE: 16 gates offline for scheduled maintenance",
  },
  emergency: {
    name: "Emergency Response",
    description: "Emergency scenario with priority routing",
    sdAircraftCount: 60,
    laAircraftCount: 60,
    pipelineAircraftCount: 30,
    descentProbability: 0.035,
    pipelineTransferProbability: 0.012,
    departureProbability: 0.05,
    pipelineCapacity: 50,
    disabledGates: [],
    alertMessage: "EMERGENCY: Priority routing active - all gates on standby",
  },
};

export interface Gate {
  id: string;
  cityId: CityName;
  quadrant: QuadrantName;
  index: number;
  angle: number;
  distance: number;
  status: GateStatus;
  assignedAircraft: string | null;
  queueCount: number;
}

export interface Aircraft {
  id: string;
  status: AircraftStatus;
  cityId: CityName | null;
  pipelineId: PipelineName | null;
  angleOnRing: number;
  distanceFromCenter: number;
  altitude: number;
  targetGate: string | null;
  pipelineProgress: number;
  color: number;
  speed: number;
  descentStartTime: number | null;
  originCity: CityName | null;
  ringLevel: RingLevel;
  operator: OperatorCode;
  fuelType: FuelType;
  batterySOC: number;   // 0–100 for electric; 100 for hydrogen/jetFuel
}

export interface Pipeline {
  id: PipelineName;
  fromCity: CityName;
  toCity: CityName;
  fromQuadrant: QuadrantName;
  toQuadrant: QuadrantName;
  variant: PipelineVariant;
  capacity: number;
  currentCount: number;
  transitTime: number;
  color: number;
  altitude: number;
}

export interface EventLogItem {
  id: string;
  timestamp: Date;
  message: string;
  type: "info" | "warning" | "success" | "error";
}

export interface FlightRequest {
  id: string;
  aircraftId: string;
  operator: OperatorCode;
  origin: CityName;
  destination: CityName;
  requestedTime: Date;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'HOLD';
  priority: 'NORMAL' | 'PRIORITY' | 'EMERGENCY';
  reason?: string;
}

// Revenue split model: 70% operator / 20% AAM Institute / 10% city
export const REVENUE_SPLIT = { operator: 0.70, aam: 0.20, city: 0.10 };
// Dynamic pricing model per FAA RFI documents
export const BASE_FARE = 155;       // $ base fare per operation
export const ENERGY_SURCHARGE = 2.25; // $ per operation (energy cost pass-through)
export const DEMAND_MULTIPLIERS: Record<ScenarioName, number> = {
  normal: 1.00,     // $157.25 per flight
  rush_hour: 1.77,  // $278.33 per flight (peak)
  maintenance: 0.65, // $102.21 per flight (reduced demand)
  emergency: 1.50,  // $235.88 per flight
};
/** Returns the dynamic fare for current scenario */
export function calculateFare(scenario: ScenarioName): {
  baseFare: number; energySurcharge: number; demandMultiplier: number; total: number;
} {
  const multiplier = DEMAND_MULTIPLIERS[scenario] ?? 1.0;
  const total = (BASE_FARE + ENERGY_SURCHARGE) * multiplier;
  return { baseFare: BASE_FARE, energySurcharge: ENERGY_SURCHARGE, demandMultiplier: multiplier, total };
}

export interface RevenueRecord {
  totalRevenue: number;
  operatorShare: number;
  aamShare: number;
  cityShare: number;
  byOperator: Record<OperatorCode, number>;
  byCity: Record<string, number>;
}

export interface BlockchainTransaction {
  id: string;
  timestamp: Date;
  type: 'LANDING_FEE' | 'DEPARTURE_FEE' | 'CORRIDOR_TOLL';
  operator: OperatorCode;
  city: CityName;
  amount: number;
  operatorPay: number;
  aamPay: number;
  cityPay: number;
  aircraftId: string;
  blockHash: string;
  // Dynamic pricing breakdown (Sprint 7 — FAA RFI alignment)
  baseFare: number;
  energySurcharge: number;
  demandMultiplier: number;
}

export interface StatisticsSnapshot {
  timestamp: number;
  landingsSD: number;
  landingsLA: number;
  departuresSD: number;
  departuresLA: number;
  pipelineTransfers: number;
  avgPipelineUtilization: number;
  avgGateUtilization: number;
  reroutings: number;
}

// ── Energy System (FAA RFI System Integration — Pillar 3) ──────────────────
// Grid capacity 3.5 MW; fuel mix: 60% electric / 25% hydrogen / 15% jet
export interface EnergyOracle {
  gridCapacityMW: number;        // constant 3.5
  gridDemandMW: number;          // 0–3.5, updated each tick
  electricGridPct: number;       // 0–100 (grid utilization %)
  jetFuelSupplyGalHr: number;    // 0–600 max gal/hr
  hydrogenSupplyKgHr: number;    // 0–150 max kg/hr
}

export interface FleetMix {
  electricPct: number;   // 60% target
  hydrogenPct: number;   // 25% target
  jetFuelPct: number;    // 15% target
}

// ── DAO Governance (FAA RFI 8-Pillar — Pillar 1 + 4) ─────────────────────
// Demo-compressed timers: 14s = "14-day" / 30s = "30-min emergency"
export interface DAOProposal {
  id: string;
  title: string;
  description: string;
  yesVotes: number;
  noVotes: number;
  timeRemaining: number;     // seconds (compressed demo time)
  status: DAOProposalStatus;
  emergencyVote?: boolean;
}

const SEED_PROPOSALS: DAOProposal[] = [
  {
    id: 'DAO-001',
    title: 'Expand Network to San Francisco',
    description: 'SFO/SJC metro pilot. 14-day standard vote. Requires FAA waiver amendment.',
    yesVotes: 47, noVotes: 12,
    timeRemaining: 14,
    status: 'active',
  },
  {
    id: 'DAO-002',
    title: 'TOP Pipeline Capacity +25%',
    description: 'Emergency overflow capacity expansion during CENTER pipeline saturation.',
    yesVotes: 31, noVotes: 8,
    timeRemaining: 30,
    status: 'active',
    emergencyVote: true,
  },
  {
    id: 'DAO-003',
    title: 'Electric Fleet Energy Subsidy',
    description: 'Reduce energy surcharge by $0.50 for 100% electric operators. Incentivizes clean fleet transition.',
    yesVotes: 22, noVotes: 35,
    timeRemaining: 14,
    status: 'active',
  },
];

export interface SimulationState {
  isPlaying: boolean;
  speed: number;
  simulationTime: Date;
  aircraft: Aircraft[];
  gates: Gate[];
  pipelines: Pipeline[];
  events: EventLogItem[];
  selectedScenario: string;
  selectedGateId: string | null;
  statistics: StatisticsSnapshot[];
  currentStats: {
    landingsSD: number;
    landingsLA: number;
    departuresSD: number;
    departuresLA: number;
    pipelineTransfers: number;
    reroutings: number;
  };

  // Weather-flight integration
  weatherGrounded: boolean;          // True when weather prevents operations
  emergencyOverride: boolean;        // FAA emergency override active
  flightQueue: FlightRequest[];      // Pending flight requests

  // Revenue & blockchain
  revenue: RevenueRecord;
  blockchain: BlockchainTransaction[];

  // Pipeline overflow tracking (CENTER >85% utilization triggers TOP overflow)
  centerPipelineUtilizationPct: number;  // 0–100
  topPipelineOverflowActive: boolean;

  // Energy system
  energyOracle: EnergyOracle;
  fleetMix: FleetMix;

  // DAO governance
  daoProposals: DAOProposal[];
  voteOnProposal: (proposalId: string, vote: 'yes' | 'no') => void;

  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  setScenario: (scenario: string) => void;
  selectGate: (gateId: string | null) => void;
  toggleEmergencyOverride: () => void;
  approveFlightRequest: (requestId: string) => void;
  denyFlightRequest: (requestId: string) => void;
  requestFlight: (operator: OperatorCode, origin: CityName, destination: CityName, priority?: 'NORMAL' | 'PRIORITY' | 'EMERGENCY') => string;
  
  addAircraft: (aircraft: Aircraft) => void;
  updateAircraft: (id: string, updates: Partial<Aircraft>) => void;
  removeAircraft: (id: string) => void;
  
  updateGate: (id: string, updates: Partial<Gate>) => void;
  
  updatePipeline: (id: PipelineName, updates: Partial<Pipeline>) => void;
  
  addEvent: (message: string, type: EventLogItem["type"]) => void;
  
  tick: (deltaTime: number) => void;
}

const RING_RADIUS = 6;
const GATES_PER_QUADRANT = 28;
const MAX_ALTITUDE = 1250;
const GROUND_ALTITUDE = 50;

function createGates(cityId: CityName, disabledGates: string[] = []): Gate[] {
  const gates: Gate[] = [];
  const quadrants: QuadrantName[] = ["North", "East", "South", "West"];
  const quadrantOffsets = { North: 0, East: 90, South: 180, West: 270 };
  
  quadrants.forEach((quadrant) => {
    for (let i = 0; i < GATES_PER_QUADRANT; i++) {
      const angleWithinQuadrant = (i / GATES_PER_QUADRANT) * 90;
      const angle = quadrantOffsets[quadrant] + angleWithinQuadrant;
      const distance = RING_RADIUS;
      const gateId = `${cityId}-${quadrant[0]}Q-${String(i + 1).padStart(2, "0")}`;
      const isDisabled = disabledGates.includes(gateId);
      
      gates.push({
        id: gateId,
        cityId,
        quadrant,
        index: i,
        angle,
        distance,
        status: isDisabled ? "RED" : "GREEN",
        assignedAircraft: isDisabled ? "MAINTENANCE" : null,
        queueCount: 0,
      });
    }
  });
  
  return gates;
}

// Corridor Directional Altitude Separation (FAA RFI aligned)
// N-S: Northbound 500ft / Southbound 600ft
// E-W: Eastbound 550ft / Westbound 650ft
// Variant offsets: CENTER = base altitude, TOP = +100ft visual, BOTTOM = -100ft visual
const CORRIDOR_ALTITUDES = {
  'N-S': { base: 500, dirOffset: 100 },  // NB 500ft, SB 600ft
  'E-W': { base: 550, dirOffset: 100 },  // EB 550ft, WB 650ft
};

// Fuel type distribution: 60% electric / 25% hydrogen / 15% jet fuel (per FAA RFI System Integration)
function assignFuelType(index: number): FuelType {
  const r = index % 20;
  if (r < 12) return 'electric';
  if (r < 17) return 'hydrogen';
  return 'jetFuel';
}

function assignBatterySOC(fuelType: FuelType): number {
  return fuelType === 'electric' ? 60 + Math.floor(Math.random() * 40) : 100;
}

function createInitialAircraft(config: ScenarioConfig = SCENARIO_CONFIGS.normal): Aircraft[] {
  const aircraft: Aircraft[] = [];
  let id = 1;
  // Distribution pattern: 20% Ring 1, 50% Ring 2, 30% Ring 3
  const ringPattern: RingLevel[] = [2, 2, 3, 2, 1, 2, 3, 2, 2, 3];

  for (let i = 0; i < config.sdAircraftCount; i++) {
    const ring = ringPattern[i % ringPattern.length];
    const rc = RING_CONFIGS[ring];
    const op = OPERATOR_CODES[i % OPERATOR_CODES.length];
    const ft = assignFuelType(id);
    aircraft.push({
      id: `AC-${String(id++).padStart(3, "0")}`,
      status: "in_ring",
      cityId: "San Diego",
      pipelineId: null,
      angleOnRing: Math.random() * 360,
      distanceFromCenter: rc.radius,
      altitude: rc.altitude,
      targetGate: null,
      pipelineProgress: 0,
      color: OPERATOR_CONFIGS[op].color,
      speed: 0.5 + Math.random() * 0.3,
      descentStartTime: null,
      originCity: "San Diego",
      ringLevel: ring,
      operator: op,
      fuelType: ft,
      batterySOC: assignBatterySOC(ft),
    });
  }

  for (let i = 0; i < config.laAircraftCount; i++) {
    const ring = ringPattern[i % ringPattern.length];
    const rc = RING_CONFIGS[ring];
    const op = OPERATOR_CODES[(i + 3) % OPERATOR_CODES.length]; // Offset for diversity
    const ft = assignFuelType(id);
    aircraft.push({
      id: `AC-${String(id++).padStart(3, "0")}`,
      status: "in_ring",
      cityId: "Orange County",
      pipelineId: null,
      angleOnRing: Math.random() * 360,
      distanceFromCenter: rc.radius,
      altitude: rc.altitude,
      targetGate: null,
      pipelineProgress: 0,
      color: OPERATOR_CONFIGS[op].color,
      speed: 0.5 + Math.random() * 0.3,
      descentStartTime: null,
      originCity: "Orange County",
      ringLevel: ring,
      operator: op,
      fuelType: ft,
      batterySOC: assignBatterySOC(ft),
    });
  }
  
  const variants: PipelineVariant[] = ["CENTER", "TOP", "BOTTOM"];
  const aircraftPerVariant = Math.floor(config.pipelineAircraftCount / 6);
  
  const variantAltOffsets: Record<PipelineVariant, number> = { CENTER: 0, TOP: 0.25, BOTTOM: -0.25 };
  variants.forEach((variant) => {
    for (let i = 0; i < aircraftPerVariant; i++) {
      const op = OPERATOR_CODES[(id) % OPERATOR_CODES.length];
      const nsAlt = (CORRIDOR_ALTITUDES['N-S'].base / 1250) * 2 + variantAltOffsets[variant];
      const ft = assignFuelType(id);
      aircraft.push({
        id: `AC-${String(id++).padStart(3, "0")}`,
        status: "in_pipeline",
        cityId: null,
        pipelineId: `N-S-${variant}` as PipelineName,
        angleOnRing: 0,
        distanceFromCenter: 0,
        altitude: nsAlt,
        targetGate: null,
        pipelineProgress: Math.random(),
        color: OPERATOR_CONFIGS[op].color,
        speed: 0.3 + Math.random() * 0.2,
        descentStartTime: null,
        originCity: "San Diego",
        ringLevel: 2,
        operator: op,
        fuelType: ft,
        batterySOC: assignBatterySOC(ft),
      });
    }
  });

  variants.forEach((variant) => {
    for (let i = 0; i < aircraftPerVariant; i++) {
      const op = OPERATOR_CODES[(id) % OPERATOR_CODES.length];
      const ewAlt = (CORRIDOR_ALTITUDES['E-W'].base / 1250) * 2 + variantAltOffsets[variant];
      const ft = assignFuelType(id);
      aircraft.push({
        id: `AC-${String(id++).padStart(3, "0")}`,
        status: "in_pipeline",
        cityId: null,
        pipelineId: `E-W-${variant}` as PipelineName,
        angleOnRing: 0,
        distanceFromCenter: 0,
        altitude: ewAlt,
        targetGate: null,
        pipelineProgress: Math.random(),
        color: OPERATOR_CONFIGS[op].color,
        speed: 0.3 + Math.random() * 0.2,
        descentStartTime: null,
        originCity: "San Diego",
        ringLevel: 2,
        operator: op,
        fuelType: ft,
        batterySOC: assignBatterySOC(ft),
      });
    }
  });
  
  return aircraft;
}

function createPipelines(config: ScenarioConfig = SCENARIO_CONFIGS.normal): Pipeline[] {
  const variantOffsets: Record<PipelineVariant, number> = {
    CENTER: 0,
    TOP: 0.25,    // Higher visual lane
    BOTTOM: -0.25, // Lower visual lane
  };

  const pipelines: Pipeline[] = [];
  const aircraftPerPipeline = Math.floor(config.pipelineAircraftCount / 6);
  const variants: PipelineVariant[] = ["CENTER", "TOP", "BOTTOM"];

  variants.forEach((variant) => {
    const cap = variant === "CENTER" ? config.pipelineCapacity : Math.floor(config.pipelineCapacity * 0.75);
    // N-S corridor: SD→LA (Northbound = 500ft base)
    const nsAlt = (CORRIDOR_ALTITUDES['N-S'].base / 1250) * 2 + variantOffsets[variant];
    pipelines.push({
      id: `N-S-${variant}` as PipelineName,
      fromCity: "San Diego",
      toCity: "Orange County",
      fromQuadrant: "North",
      toQuadrant: "North",
      variant,
      capacity: cap,
      currentCount: aircraftPerPipeline,
      transitTime: 70,
      color: 0xff00ff,
      altitude: nsAlt,
    });

    // E-W corridor: SD→LA (Eastbound = 550ft base)
    const ewAlt = (CORRIDOR_ALTITUDES['E-W'].base / 1250) * 2 + variantOffsets[variant];
    pipelines.push({
      id: `E-W-${variant}` as PipelineName,
      fromCity: "San Diego",
      toCity: "Orange County",
      fromQuadrant: "East",
      toQuadrant: "West",
      variant,
      capacity: cap,
      currentCount: aircraftPerPipeline,
      transitTime: 70,
      color: 0x00ffff,
      altitude: ewAlt,
    });
  });

  return pipelines;
}

const defaultConfig = SCENARIO_CONFIGS.normal;

const citiesConfig = [
  { name: "San Diego", position: { x: -12, y: 0, z: 0 }, gateCount: 112 },
  { name: "Orange County", position: { x: 12, y: 0, z: 8 }, gateCount: 112 }
];

function generateBlockHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 12; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

const demandGenerator = new DemandGenerator(60, citiesConfig);
const safetySystem = new SafetySystem();

export const useSimulation = create<SimulationState>()(
  subscribeWithSelector((set, get) => ({
    isPlaying: false,
    speed: 1,
    simulationTime: new Date(),
    aircraft: createInitialAircraft(defaultConfig),
    gates: [...createGates("San Diego", defaultConfig.disabledGates), ...createGates("Orange County", defaultConfig.disabledGates)],
    pipelines: createPipelines(defaultConfig),
    events: [],
    selectedScenario: "normal",
    selectedGateId: null,
    statistics: [],
    currentStats: {
      landingsSD: 0,
      landingsLA: 0,
      departuresSD: 0,
      departuresLA: 0,
      pipelineTransfers: 0,
      reroutings: 0,
    },

    weatherGrounded: false,
    emergencyOverride: false,
    flightQueue: [],

    revenue: {
      totalRevenue: 0,
      operatorShare: 0,
      aamShare: 0,
      cityShare: 0,
      byOperator: { AR: 0, JB: 0, WK: 0, BT: 0, LL: 0, VL: 0 },
      byCity: { 'San Diego': 0, 'Orange County': 0 },
    },
    blockchain: [],
    centerPipelineUtilizationPct: 0,
    topPipelineOverflowActive: false,

    energyOracle: {
      gridCapacityMW: 3.5,
      gridDemandMW: 2.1,
      electricGridPct: 60,
      jetFuelSupplyGalHr: 520,
      hydrogenSupplyKgHr: 118,
    },
    fleetMix: { electricPct: 60, hydrogenPct: 25, jetFuelPct: 15 },
    daoProposals: SEED_PROPOSALS.map(p => ({ ...p })),

    play: () => {
      set({ isPlaying: true });
      get().addEvent("Simulation started", "info");
    },
    
    pause: () => {
      set({ isPlaying: false });
      get().addEvent("Simulation paused", "info");
    },
    
    reset: () => {
      const currentScenario = get().selectedScenario as ScenarioName;
      const config = SCENARIO_CONFIGS[currentScenario] || defaultConfig;
      set({
        isPlaying: false,
        speed: 1,
        simulationTime: new Date(),
        aircraft: createInitialAircraft(config),
        gates: [...createGates("San Diego", config.disabledGates), ...createGates("Orange County", config.disabledGates)],
        pipelines: createPipelines(config),
        events: [],
        statistics: [],
        currentStats: {
          landingsSD: 0,
          landingsLA: 0,
          departuresSD: 0,
          departuresLA: 0,
          pipelineTransfers: 0,
          reroutings: 0,
        },
        weatherGrounded: false,
        emergencyOverride: false,
        flightQueue: [],
        revenue: {
          totalRevenue: 0, operatorShare: 0, aamShare: 0, cityShare: 0,
          byOperator: { AR: 0, JB: 0, WK: 0, BT: 0, LL: 0, VL: 0 },
          byCity: { 'San Diego': 0, 'Orange County': 0 },
        },
        blockchain: [],
        centerPipelineUtilizationPct: 0,
        topPipelineOverflowActive: false,
        energyOracle: { gridCapacityMW: 3.5, gridDemandMW: 2.1, electricGridPct: 60, jetFuelSupplyGalHr: 520, hydrogenSupplyKgHr: 118 },
        fleetMix: { electricPct: 60, hydrogenPct: 25, jetFuelPct: 15 },
        daoProposals: SEED_PROPOSALS.map(p => ({ ...p })),
      });
    },

    setSpeed: (speed: number) => {
      set({ speed });
      get().addEvent(`Speed set to ${speed}x`, "info");
    },
    
    setScenario: (scenario: string) => {
      const config = SCENARIO_CONFIGS[scenario as ScenarioName] || defaultConfig;
      set({
        selectedScenario: scenario,
        isPlaying: false,
        simulationTime: new Date(),
        aircraft: createInitialAircraft(config),
        gates: [...createGates("San Diego", config.disabledGates), ...createGates("Orange County", config.disabledGates)],
        pipelines: createPipelines(config),
        events: [],
        selectedGateId: null,
        statistics: [],
        currentStats: {
          landingsSD: 0,
          landingsLA: 0,
          departuresSD: 0,
          departuresLA: 0,
          pipelineTransfers: 0,
          reroutings: 0,
        },
        weatherGrounded: false,
        emergencyOverride: false,
        flightQueue: [],
        revenue: {
          totalRevenue: 0, operatorShare: 0, aamShare: 0, cityShare: 0,
          byOperator: { AR: 0, JB: 0, WK: 0, BT: 0, LL: 0, VL: 0 },
          byCity: { 'San Diego': 0, 'Orange County': 0 },
        },
        blockchain: [],
        centerPipelineUtilizationPct: 0,
        topPipelineOverflowActive: false,
        energyOracle: { gridCapacityMW: 3.5, gridDemandMW: 2.1, electricGridPct: 60, jetFuelSupplyGalHr: 520, hydrogenSupplyKgHr: 118 },
        fleetMix: { electricPct: 60, hydrogenPct: 25, jetFuelPct: 15 },
        daoProposals: SEED_PROPOSALS.map(p => ({ ...p })),
      });
      get().addEvent(`Scenario changed to: ${config.name}`, "info");
      if (config.alertMessage) {
        get().addEvent(config.alertMessage, "warning");
      }
    },
    
    selectGate: (gateId: string | null) => {
      set({ selectedGateId: gateId });
    },

    toggleEmergencyOverride: () => {
      const current = get().emergencyOverride;
      set({ emergencyOverride: !current });
      if (!current) {
        get().addEvent("FAA EMERGENCY OVERRIDE ACTIVATED — All operations resumed", "error");
      } else {
        get().addEvent("FAA Emergency Override deactivated — Normal operations", "info");
      }
    },

    voteOnProposal: (proposalId: string, vote: 'yes' | 'no') => {
      set((state) => ({
        daoProposals: state.daoProposals.map(p =>
          p.id === proposalId
            ? { ...p, yesVotes: vote === 'yes' ? p.yesVotes + 1 : p.yesVotes, noVotes: vote === 'no' ? p.noVotes + 1 : p.noVotes }
            : p
        ),
      }));
      get().addEvent(`DAO vote recorded: ${vote.toUpperCase()} on ${proposalId}`, "info");
    },

    approveFlightRequest: (requestId: string) => {
      set((state) => ({
        flightQueue: state.flightQueue.map(r =>
          r.id === requestId ? { ...r, status: 'APPROVED' as const } : r
        ),
      }));
      get().addEvent(`Flight request ${requestId} APPROVED`, "success");
    },

    denyFlightRequest: (requestId: string) => {
      set((state) => ({
        flightQueue: state.flightQueue.map(r =>
          r.id === requestId ? { ...r, status: 'DENIED' as const } : r
        ),
      }));
      get().addEvent(`Flight request ${requestId} DENIED`, "warning");
    },

    requestFlight: (operator, origin, destination, priority = 'NORMAL') => {
      const id = `FRQ-${Date.now().toString().slice(-6)}`;
      const req: FlightRequest = {
        id,
        aircraftId: `AC-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
        operator,
        origin,
        destination,
        requestedTime: new Date(get().simulationTime),
        status: 'PENDING',
        priority,
        reason: 'Pilot request via mobile app',
      };
      set((state) => ({ flightQueue: [...state.flightQueue, req].slice(-20) }));
      get().addEvent(`Flight request ${id} submitted by ${operator}: ${origin} → ${destination}`, "info");
      return id;
    },

    addAircraft: (aircraft: Aircraft) => {
      set((state) => ({
        aircraft: [...state.aircraft, aircraft],
      }));
    },
    
    updateAircraft: (id: string, updates: Partial<Aircraft>) => {
      set((state) => ({
        aircraft: state.aircraft.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      }));
    },
    
    removeAircraft: (id: string) => {
      set((state) => ({
        aircraft: state.aircraft.filter((a) => a.id !== id),
      }));
    },
    
    updateGate: (id: string, updates: Partial<Gate>) => {
      set((state) => ({
        gates: state.gates.map((g) =>
          g.id === id ? { ...g, ...updates } : g
        ),
      }));
    },
    
    updatePipeline: (id: PipelineName, updates: Partial<Pipeline>) => {
      set((state) => ({
        pipelines: state.pipelines.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
      }));
    },
    
    addEvent: (message: string, type: EventLogItem["type"]) => {
      set((state) => {
        const event: EventLogItem = {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(state.simulationTime),
          message,
          type,
        };
        return {
          events: [event, ...state.events].slice(0, 100),
        };
      });
    },
    
    tick: (deltaTime: number) => {
      const state = get();
      if (!state.isPlaying) return;

      // Weather-flight integration: read weather conditions
      const weather = useWeather.getState();
      const isWeatherGrounded = !weather.clearForFlight && !state.emergencyOverride;
      const weatherSpeedFactor = weather.safetyScore >= 80 ? 1.0
        : weather.safetyScore >= 50 ? 0.7
        : weather.safetyScore >= 20 ? 0.4
        : 0.1;

      // Update grounded state and fire event on change
      if (isWeatherGrounded !== state.weatherGrounded) {
        set({ weatherGrounded: isWeatherGrounded });
        if (isWeatherGrounded) {
          get().addEvent("WEATHER HOLD: All new departures suspended — unsafe conditions", "error");
        } else {
          get().addEvent("Weather hold lifted — operations resuming", "success");
        }
      }

      // Generate flight queue entries when grounded
      if (isWeatherGrounded && Math.random() < 0.02 * deltaTime) {
        const cities: CityName[] = ["San Diego", "Orange County"];
        const origin = cities[Math.floor(Math.random() * 2)];
        const dest = origin === "San Diego" ? "Orange County" : "San Diego";
        const op = OPERATOR_CODES[Math.floor(Math.random() * OPERATOR_CODES.length)];
        const req: FlightRequest = {
          id: `FRQ-${Date.now().toString().slice(-5)}`,
          aircraftId: `AC-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
          operator: op,
          origin,
          destination: dest,
          requestedTime: new Date(state.simulationTime),
          status: 'HOLD',
          priority: Math.random() < 0.1 ? 'EMERGENCY' : Math.random() < 0.3 ? 'PRIORITY' : 'NORMAL',
          reason: 'Weather hold — awaiting clearance',
        };
        set((s) => ({ flightQueue: [...s.flightQueue, req].slice(-20) }));
      }

      // Auto-clear approved/denied requests after a while
      if (state.flightQueue.length > 0) {
        set((s) => ({
          flightQueue: s.flightQueue.filter(r =>
            r.status === 'PENDING' || r.status === 'HOLD' ||
            (Date.now() - r.requestedTime.getTime()) < 30000
          ),
        }));
      }

      const hour = state.simulationTime.getHours();
      const day = state.simulationTime.getDay();

      // Update Demand — suppress new spawns when weather grounded
      if (state.aircraft.length < 200 && !isWeatherGrounded) {
        const odMatrix = demandGenerator.generateODMatrix(hour, day);
        if (Math.random() < 0.05 * deltaTime) {
          Object.entries(odMatrix).forEach(([pair, count]) => {
            if (count > 0 && Math.random() < 0.1) {
              const [origin, dest] = pair.split("-") as [CityName, CityName];
              if (origin !== dest) {
                // Spawn inter-city aircraft
                const id = `AC-${Date.now().toString().slice(-3)}${Math.floor(Math.random() * 100)}`;
                const spawnRing: RingLevel = ([1, 2, 2, 2, 3, 3] as RingLevel[])[Math.floor(Math.random() * 6)];
                const spawnCfg = RING_CONFIGS[spawnRing];
                const spawnOp = OPERATOR_CODES[Math.floor(Math.random() * OPERATOR_CODES.length)];
                const spawnFt = assignFuelType(Math.floor(Math.random() * 20));
                state.addAircraft({
                  id,
                  status: "in_ring",
                  cityId: origin,
                  pipelineId: null,
                  angleOnRing: Math.random() * 360,
                  distanceFromCenter: spawnCfg.radius,
                  altitude: spawnCfg.altitude,
                  targetGate: null,
                  pipelineProgress: 0,
                  color: OPERATOR_CONFIGS[spawnOp].color,
                  speed: 0.5 + Math.random() * 0.3,
                  descentStartTime: null,
                  originCity: origin,
                  ringLevel: spawnRing,
                  operator: spawnOp,
                  fuelType: spawnFt,
                  batterySOC: assignBatterySOC(spawnFt),
                });
              }
            }
          });
        }
      }

      // Safety System Check
      const safetyAircraft = state.aircraft.map(a => ({
        id: a.id,
        latitude: a.distanceFromCenter, // Mocking lat/lon with ring coordinates for now
        longitude: a.angleOnRing,
        altitude: a.altitude,
        speed: a.speed,
        heading: 0,
        timestamp: Date.now()
      }));
      
      const conflicts = safetySystem.detectAllConflicts(safetyAircraft);
      if (conflicts.length > 0) {
        conflicts.forEach(c => {
          if (c.severity === "CRITICAL") {
            state.addEvent(`CRITICAL CONFLICT: ${c.aircraftA} & ${c.aircraftB}`, "error");
          }
        });
      }

      const scenarioConfig = SCENARIO_CONFIGS[state.selectedScenario as ScenarioName] || defaultConfig;
      const adjustedDelta = deltaTime * state.speed * weatherSpeedFactor;
      const currentFare = calculateFare(state.selectedScenario as ScenarioName);
      const newEvents: { message: string; type: "info" | "warning" | "success" | "error" }[] = [];
      
      const reservedGates = new Set<string>();
      state.aircraft.forEach(ac => {
        if (ac.targetGate && (ac.status === "descending" || ac.status === "landed")) {
          reservedGates.add(ac.targetGate);
        }
      });
      
      const pipelineCounts: Record<string, number> = {};
      state.pipelines.forEach(p => {
        pipelineCounts[p.id] = state.aircraft.filter(a => a.pipelineId === p.id).length;
      });
      
      set((prevState) => {
        const updatedAircraft: Aircraft[] = [];
        const newReservedGates = new Set<string>(reservedGates);
        const newPipelineCounts = { ...pipelineCounts };
        const newTransactions: BlockchainTransaction[] = [];
        const statsUpdates = {
          landingsSD: 0,
          landingsLA: 0,
          departuresSD: 0,
          departuresLA: 0,
          pipelineTransfers: 0,
          reroutings: 0,
        };
        
        for (const aircraft of prevState.aircraft) {
          if (aircraft.status === "in_ring" && aircraft.cityId) {
            let newAngle = aircraft.angleOnRing + aircraft.speed * adjustedDelta * 25;
            if (newAngle >= 360) newAngle -= 360;
            
            if (Math.random() < scenarioConfig.descentProbability * adjustedDelta) {
              const availableGates = prevState.gates.filter(
                (g) => g.cityId === aircraft.cityId && 
                       !newReservedGates.has(g.id) &&
                       g.assignedAircraft !== "MAINTENANCE"
              );
              
              if (availableGates.length > 0) {
                const targetGate = availableGates[Math.floor(Math.random() * availableGates.length)];
                newReservedGates.add(targetGate.id);
                newEvents.push({
                  message: `${aircraft.id} beginning descent to ${targetGate.id}`,
                  type: "info"
                });
                updatedAircraft.push({
                  ...aircraft,
                  angleOnRing: newAngle,
                  status: "descending",
                  targetGate: targetGate.id,
                  descentStartTime: Date.now(),
                  originCity: aircraft.cityId,
                });
                continue;
              }
            }
            
            if (!isWeatherGrounded && Math.random() < scenarioConfig.pipelineTransferProbability * adjustedDelta) {
              const availablePipelines = prevState.pipelines.filter(
                (p) => p.fromCity === aircraft.cityId && 
                       newPipelineCounts[p.id] < p.capacity
              );
              
              if (availablePipelines.length > 0) {
                const pipelinesWithUtilization = availablePipelines.map((p) => ({
                  pipeline: p,
                  utilization: newPipelineCounts[p.id] / p.capacity,
                }));
                pipelinesWithUtilization.sort((a, b) => a.utilization - b.utilization);
                
                const selectedPipeline = pipelinesWithUtilization[0].pipeline;
                const wasRerouted = pipelinesWithUtilization.length > 1 && 
                                   pipelinesWithUtilization[1].utilization > 0.8 &&
                                   pipelinesWithUtilization[0].utilization < 0.5;
                
                newPipelineCounts[selectedPipeline.id]++;
                
                statsUpdates.pipelineTransfers++;
                
                if (wasRerouted) {
                  newEvents.push({
                    message: `${aircraft.id} rerouted to ${selectedPipeline.id} (less congested)`,
                    type: "warning"
                  });
                  statsUpdates.reroutings++;
                } else {
                  newEvents.push({
                    message: `${aircraft.id} entering ${selectedPipeline.id} pipeline`,
                    type: "info"
                  });
                }
                
                updatedAircraft.push({
                  ...aircraft,
                  status: "in_pipeline",
                  originCity: aircraft.cityId,
                  cityId: null,
                  pipelineId: selectedPipeline.id,
                  pipelineProgress: 0,
                  color: OPERATOR_CONFIGS[aircraft.operator].color,
                });
                continue;
              }
            }
            
            updatedAircraft.push({ ...aircraft, angleOnRing: newAngle });
            continue;
          }
          
          if (aircraft.status === "descending") {
            const gate = prevState.gates.find(g => g.id === aircraft.targetGate);
            if (!gate) {
              updatedAircraft.push(aircraft);
              continue;
            }
            
            const angleDiff = gate.angle - aircraft.angleOnRing;
            let newAngle = aircraft.angleOnRing;
            if (Math.abs(angleDiff) > 1) {
              newAngle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 15 * adjustedDelta);
            } else {
              newAngle = gate.angle;
            }
            
            const targetDistance = gate.distance;
            let newDistance = aircraft.distanceFromCenter;
            const distDiff = targetDistance - aircraft.distanceFromCenter;
            if (Math.abs(distDiff) > 0.1) {
              newDistance += Math.sign(distDiff) * Math.min(Math.abs(distDiff), 2 * adjustedDelta);
            }
            
            const newAltitude = aircraft.altitude - 200 * adjustedDelta;
            
            if (newAltitude <= GROUND_ALTITUDE) {
              newEvents.push({
                message: `${aircraft.id} landed at ${aircraft.targetGate}`,
                type: "success"
              });
              const landCity = aircraft.originCity || "San Diego";
              if (landCity === "San Diego") {
                statsUpdates.landingsSD++;
              } else {
                statsUpdates.landingsLA++;
              }
              newTransactions.push({
                id: `TX-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
                timestamp: new Date(prevState.simulationTime),
                type: 'LANDING_FEE',
                operator: aircraft.operator,
                city: landCity as CityName,
                amount: currentFare.total,
                operatorPay: currentFare.total * REVENUE_SPLIT.operator,
                aamPay: currentFare.total * REVENUE_SPLIT.aam,
                cityPay: currentFare.total * REVENUE_SPLIT.city,
                aircraftId: aircraft.id,
                blockHash: generateBlockHash(),
                baseFare: currentFare.baseFare,
                energySurcharge: currentFare.energySurcharge,
                demandMultiplier: currentFare.demandMultiplier,
              });
              updatedAircraft.push({
                ...aircraft,
                altitude: GROUND_ALTITUDE,
                angleOnRing: gate.angle,
                distanceFromCenter: gate.distance,
                status: "landed",
                cityId: aircraft.originCity,
              });
            } else {
              updatedAircraft.push({
                ...aircraft,
                altitude: newAltitude,
                angleOnRing: newAngle,
                distanceFromCenter: newDistance,
                cityId: aircraft.originCity,
              });
            }
            continue;
          }
          
          if (aircraft.status === "landed") {
            // Weather hold: no departures unless emergency override
            if (!isWeatherGrounded && Math.random() < scenarioConfig.departureProbability * adjustedDelta) {
              const gateId = aircraft.targetGate;
              newReservedGates.delete(gateId || "");
              newEvents.push({
                message: `${aircraft.id} departing from ${gateId}`,
                type: "info"
              });
              const depCity = aircraft.originCity || "San Diego";
              if (depCity === "San Diego") {
                statsUpdates.departuresSD++;
              } else {
                statsUpdates.departuresLA++;
              }
              newTransactions.push({
                id: `TX-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`,
                timestamp: new Date(prevState.simulationTime),
                type: 'DEPARTURE_FEE',
                operator: aircraft.operator,
                city: depCity as CityName,
                amount: currentFare.total,
                operatorPay: currentFare.total * REVENUE_SPLIT.operator,
                aamPay: currentFare.total * REVENUE_SPLIT.aam,
                cityPay: currentFare.total * REVENUE_SPLIT.city,
                aircraftId: aircraft.id,
                blockHash: generateBlockHash(),
                baseFare: currentFare.baseFare,
                energySurcharge: currentFare.energySurcharge,
                demandMultiplier: currentFare.demandMultiplier,
              });
              updatedAircraft.push({
                ...aircraft,
                status: "ascending",
                cityId: aircraft.originCity,
              });
            } else {
              updatedAircraft.push(aircraft);
            }
            continue;
          }
          
          if (aircraft.status === "ascending") {
            const ringCfg = RING_CONFIGS[aircraft.ringLevel];
            const newAltitude = aircraft.altitude + 150 * adjustedDelta;

            let newDistance = aircraft.distanceFromCenter;
            const targetRadius = ringCfg.radius;
            if (Math.abs(newDistance - targetRadius) > 0.1) {
              newDistance += Math.sign(targetRadius - newDistance) * 1 * adjustedDelta;
            } else {
              newDistance = targetRadius;
            }

            if (newAltitude >= ringCfg.altitude) {
              newEvents.push({
                message: `${aircraft.id} rejoined ${aircraft.originCity} Ring ${aircraft.ringLevel}`,
                type: "success"
              });
              updatedAircraft.push({
                ...aircraft,
                altitude: ringCfg.altitude,
                status: "in_ring",
                distanceFromCenter: ringCfg.radius,
                color: OPERATOR_CONFIGS[aircraft.operator].color,
                targetGate: null,
                cityId: aircraft.originCity,
              });
            } else {
              updatedAircraft.push({
                ...aircraft,
                altitude: newAltitude,
                distanceFromCenter: newDistance,
              });
            }
            continue;
          }
          
          if (aircraft.status === "in_pipeline" && aircraft.pipelineId) {
            const newProgress = aircraft.pipelineProgress + aircraft.speed * adjustedDelta * 0.08;
            
            if (newProgress >= 1) {
              const pipeline = prevState.pipelines.find((p) => p.id === aircraft.pipelineId);
              if (pipeline) {
                newPipelineCounts[pipeline.id]--;
                newEvents.push({
                  message: `${aircraft.id} arrived at ${pipeline.toCity}`,
                  type: "success"
                });
                const arrivalRing: RingLevel = 2;
                const arrivalCfg = RING_CONFIGS[arrivalRing];
                updatedAircraft.push({
                  ...aircraft,
                  status: "in_ring",
                  cityId: pipeline.toCity,
                  originCity: pipeline.toCity,
                  pipelineId: null,
                  pipelineProgress: 0,
                  angleOnRing: Math.random() * 360,
                  distanceFromCenter: arrivalCfg.radius,
                  altitude: arrivalCfg.altitude,
                  color: OPERATOR_CONFIGS[aircraft.operator].color,
                  ringLevel: arrivalRing,
                });
              } else {
                updatedAircraft.push(aircraft);
              }
            } else {
              updatedAircraft.push({
                ...aircraft,
                pipelineProgress: newProgress,
              });
            }
            continue;
          }
          
          updatedAircraft.push(aircraft);
        }
        
        const updatedGates = prevState.gates.map((gate) => {
          const assignedAircraft = updatedAircraft.find(
            (a) => a.targetGate === gate.id && 
                   (a.status === "descending" || a.status === "landed")
          );
          
          const nearbyAircraft = updatedAircraft.filter(
            (a) => a.status === "in_ring" && 
              (a.cityId === gate.cityId || a.originCity === gate.cityId) &&
              Math.abs(((a.angleOnRing - gate.angle + 180) % 360) - 180) < 15
          ).length;
          
          let status: GateStatus = "GREEN";
          if (assignedAircraft) {
            status = "RED";
          } else if (nearbyAircraft > 2) {
            status = "YELLOW";
          }
          
          return {
            ...gate,
            status,
            assignedAircraft: assignedAircraft?.id || null,
            queueCount: nearbyAircraft,
          };
        });
        
        const updatedPipelines = prevState.pipelines.map((pipeline) => {
          const count = updatedAircraft.filter(
            (a) => a.pipelineId === pipeline.id
          ).length;
          return { ...pipeline, currentCount: count };
        });
        
        const newSimTime = new Date(prevState.simulationTime.getTime() + adjustedDelta * 60000);
        
        const newEventItems: EventLogItem[] = newEvents.map((e, i) => ({
          id: `evt-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: newSimTime,
          message: e.message,
          type: e.type,
        }));
        
        // Accumulate revenue from new transactions
        const txTotal = newTransactions.reduce((s, t) => s + t.amount, 0);
        const updatedRevenue: RevenueRecord = {
          totalRevenue: prevState.revenue.totalRevenue + txTotal,
          operatorShare: prevState.revenue.operatorShare + txTotal * REVENUE_SPLIT.operator,
          aamShare: prevState.revenue.aamShare + txTotal * REVENUE_SPLIT.aam,
          cityShare: prevState.revenue.cityShare + txTotal * REVENUE_SPLIT.city,
          byOperator: { ...prevState.revenue.byOperator },
          byCity: { ...prevState.revenue.byCity },
        };
        newTransactions.forEach(tx => {
          updatedRevenue.byOperator[tx.operator] = (updatedRevenue.byOperator[tx.operator] || 0) + tx.operatorPay;
          updatedRevenue.byCity[tx.city] = (updatedRevenue.byCity[tx.city] || 0) + tx.cityPay;
        });

        return {
          aircraft: updatedAircraft,
          gates: updatedGates,
          pipelines: updatedPipelines,
          simulationTime: newSimTime,
          events: [...newEventItems, ...prevState.events].slice(0, 100),
          currentStats: {
            landingsSD: prevState.currentStats.landingsSD + statsUpdates.landingsSD,
            landingsLA: prevState.currentStats.landingsLA + statsUpdates.landingsLA,
            departuresSD: prevState.currentStats.departuresSD + statsUpdates.departuresSD,
            departuresLA: prevState.currentStats.departuresLA + statsUpdates.departuresLA,
            pipelineTransfers: prevState.currentStats.pipelineTransfers + statsUpdates.pipelineTransfers,
            reroutings: prevState.currentStats.reroutings + statsUpdates.reroutings,
          },
          revenue: updatedRevenue,
          blockchain: [...newTransactions, ...prevState.blockchain].slice(0, 50),
          ...(() => {
            // Pipeline overflow: compute CENTER pipeline utilization
            const centerPipelines = updatedPipelines.filter(p => p.id.includes('CENTER'));
            if (centerPipelines.length === 0) return { centerPipelineUtilizationPct: 0, topPipelineOverflowActive: false };
            const centerAircraftCount = updatedAircraft.filter(a => centerPipelines.some(p => p.id === a.pipelineId)).length;
            const centerCapacity = centerPipelines.reduce((sum, p) => sum + p.capacity, 0);
            const pct = centerCapacity > 0 ? Math.round((centerAircraftCount / centerCapacity) * 100) : 0;
            return { centerPipelineUtilizationPct: pct, topPipelineOverflowActive: pct >= 85 };
          })(),

          // ── Energy Oracle update ─────────────────────────────────────────
          ...(() => {
            const prev = prevState.energyOracle;
            // Target demand scales with fleet size (full 200-ac fleet = 3.5 MW)
            const targetDemand = Math.min(3.5, 0.5 + (updatedAircraft.length / 200) * 3.0);
            const drift = (targetDemand - prev.gridDemandMW) * 0.02 + (Math.random() - 0.5) * 0.04;
            const newDemand = Math.max(0.1, Math.min(3.5, prev.gridDemandMW + drift * adjustedDelta));
            const newJet = Math.max(200, Math.min(600, prev.jetFuelSupplyGalHr + (Math.random() - 0.5) * 8 * adjustedDelta));
            const newH2  = Math.max(50,  Math.min(150, prev.hydrogenSupplyKgHr  + (Math.random() - 0.5) * 4 * adjustedDelta));
            return {
              energyOracle: {
                gridCapacityMW: 3.5,
                gridDemandMW: parseFloat(newDemand.toFixed(2)),
                electricGridPct: Math.round((newDemand / 3.5) * 100),
                jetFuelSupplyGalHr: Math.round(newJet),
                hydrogenSupplyKgHr: Math.round(newH2),
              },
            };
          })(),

          // ── Fleet mix update ─────────────────────────────────────────────
          ...(() => {
            const total = updatedAircraft.length || 1;
            const elec = updatedAircraft.filter(a => a.fuelType === 'electric').length;
            const h2   = updatedAircraft.filter(a => a.fuelType === 'hydrogen').length;
            const jet  = total - elec - h2;
            return {
              fleetMix: {
                electricPct: Math.round((elec / total) * 100),
                hydrogenPct: Math.round((h2 / total) * 100),
                jetFuelPct:  Math.round((jet / total) * 100),
              },
            };
          })(),

          // ── DAO proposal countdown ───────────────────────────────────────
          ...(() => {
            const updatedProposals = prevState.daoProposals.map(p => {
              if (p.status !== 'active') return p;
              const newTime = p.timeRemaining - adjustedDelta;
              if (newTime <= 0) {
                return { ...p, timeRemaining: 0, status: (p.yesVotes >= p.noVotes ? 'passed' : 'failed') as DAOProposalStatus };
              }
              return { ...p, timeRemaining: newTime };
            });
            // Auto-spawn emergency vote if FAA override is active and no emergency vote running
            const hasEmergency = updatedProposals.some(p => p.emergencyVote && p.status === 'active');
            const finalProposals = (state.emergencyOverride && !hasEmergency)
              ? [...updatedProposals, {
                  id: `DAO-EMG-${Date.now().toString().slice(-4)}`,
                  title: 'FAA Override — Emergency Authority',
                  description: 'Confirm FAA emergency override continuation. 30-sec emergency vote.',
                  yesVotes: 0, noVotes: 0,
                  timeRemaining: 30,
                  status: 'active' as DAOProposalStatus,
                  emergencyVote: true,
                }]
              : updatedProposals;
            return { daoProposals: finalProposals.slice(0, 6) };
          })(),
        };
      });
    },
  }))
);
