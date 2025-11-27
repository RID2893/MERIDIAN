import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type AircraftStatus = "in_ring" | "descending" | "landed" | "in_pipeline" | "ascending";
export type GateStatus = "GREEN" | "YELLOW" | "RED";
export type CityName = "San Diego" | "Los Angeles";
export type QuadrantName = "North" | "East" | "South" | "West";
export type PipelineName = "N-S" | "E-W";

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
}

export interface Pipeline {
  id: PipelineName;
  fromCity: CityName;
  toCity: CityName;
  fromQuadrant: QuadrantName;
  toQuadrant: QuadrantName;
  capacity: number;
  currentCount: number;
  transitTime: number;
}

export interface EventLogItem {
  id: string;
  timestamp: Date;
  message: string;
  type: "info" | "warning" | "success" | "error";
}

export interface SimulationState {
  isPlaying: boolean;
  speed: number;
  simulationTime: Date;
  aircraft: Aircraft[];
  gates: Gate[];
  pipelines: Pipeline[];
  events: EventLogItem[];
  selectedScenario: string;
  
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  setScenario: (scenario: string) => void;
  
  addAircraft: (aircraft: Aircraft) => void;
  updateAircraft: (id: string, updates: Partial<Aircraft>) => void;
  removeAircraft: (id: string) => void;
  
  updateGate: (id: string, updates: Partial<Gate>) => void;
  
  updatePipeline: (id: PipelineName, updates: Partial<Pipeline>) => void;
  
  addEvent: (message: string, type: EventLogItem["type"]) => void;
  
  tick: (deltaTime: number) => void;
}

const RING_RADIUS = 6;
const GATE_MIN_DISTANCE = 4;
const GATE_MAX_DISTANCE = 7;
const GATES_PER_QUADRANT = 28;
const MAX_ALTITUDE = 1250;
const GROUND_ALTITUDE = 50;

function createGates(cityId: CityName): Gate[] {
  const gates: Gate[] = [];
  const quadrants: QuadrantName[] = ["North", "East", "South", "West"];
  const quadrantOffsets = { North: 0, East: 90, South: 180, West: 270 };
  
  quadrants.forEach((quadrant) => {
    for (let i = 0; i < GATES_PER_QUADRANT; i++) {
      const angleWithinQuadrant = (i / GATES_PER_QUADRANT) * 90;
      const angle = quadrantOffsets[quadrant] + angleWithinQuadrant;
      const distance = GATE_MIN_DISTANCE + (i / GATES_PER_QUADRANT) * (GATE_MAX_DISTANCE - GATE_MIN_DISTANCE);
      
      gates.push({
        id: `${cityId}-${quadrant[0]}Q-${i + 1}`,
        cityId,
        quadrant,
        index: i,
        angle,
        distance,
        status: "GREEN",
        assignedAircraft: null,
        queueCount: 0,
      });
    }
  });
  
  return gates;
}

function createInitialAircraft(): Aircraft[] {
  const aircraft: Aircraft[] = [];
  let id = 1;
  
  for (let i = 0; i < 50; i++) {
    aircraft.push({
      id: `AC-${String(id++).padStart(3, "0")}`,
      status: "in_ring",
      cityId: "San Diego",
      pipelineId: null,
      angleOnRing: Math.random() * 360,
      distanceFromCenter: RING_RADIUS,
      altitude: MAX_ALTITUDE,
      targetGate: null,
      pipelineProgress: 0,
      color: 0x0099ff,
      speed: 0.5 + Math.random() * 0.3,
      descentStartTime: null,
      originCity: "San Diego",
    });
  }
  
  for (let i = 0; i < 40; i++) {
    aircraft.push({
      id: `AC-${String(id++).padStart(3, "0")}`,
      status: "in_ring",
      cityId: "Los Angeles",
      pipelineId: null,
      angleOnRing: Math.random() * 360,
      distanceFromCenter: RING_RADIUS,
      altitude: MAX_ALTITUDE,
      targetGate: null,
      pipelineProgress: 0,
      color: 0x0099ff,
      speed: 0.5 + Math.random() * 0.3,
      descentStartTime: null,
      originCity: "Los Angeles",
    });
  }
  
  for (let i = 0; i < 10; i++) {
    aircraft.push({
      id: `AC-${String(id++).padStart(3, "0")}`,
      status: "in_pipeline",
      cityId: null,
      pipelineId: "N-S",
      angleOnRing: 0,
      distanceFromCenter: 0,
      altitude: 1700,
      targetGate: null,
      pipelineProgress: Math.random(),
      color: 0xFFB347,
      speed: 0.3 + Math.random() * 0.2,
      descentStartTime: null,
      originCity: "San Diego",
    });
  }
  
  for (let i = 0; i < 10; i++) {
    aircraft.push({
      id: `AC-${String(id++).padStart(3, "0")}`,
      status: "in_pipeline",
      cityId: null,
      pipelineId: "E-W",
      angleOnRing: 0,
      distanceFromCenter: 0,
      altitude: 1600,
      targetGate: null,
      pipelineProgress: Math.random(),
      color: 0xFFB347,
      speed: 0.3 + Math.random() * 0.2,
      descentStartTime: null,
      originCity: "San Diego",
    });
  }
  
  return aircraft;
}

const initialPipelines: Pipeline[] = [
  {
    id: "N-S",
    fromCity: "San Diego",
    toCity: "Los Angeles",
    fromQuadrant: "North",
    toQuadrant: "North",
    capacity: 30,
    currentCount: 10,
    transitTime: 70,
  },
  {
    id: "E-W",
    fromCity: "San Diego",
    toCity: "Los Angeles",
    fromQuadrant: "East",
    toQuadrant: "West",
    capacity: 30,
    currentCount: 10,
    transitTime: 70,
  },
];

export const useSimulation = create<SimulationState>()(
  subscribeWithSelector((set, get) => ({
    isPlaying: false,
    speed: 1,
    simulationTime: new Date(),
    aircraft: createInitialAircraft(),
    gates: [...createGates("San Diego"), ...createGates("Los Angeles")],
    pipelines: initialPipelines,
    events: [],
    selectedScenario: "normal",
    
    play: () => {
      set({ isPlaying: true });
      get().addEvent("Simulation started", "info");
    },
    
    pause: () => {
      set({ isPlaying: false });
      get().addEvent("Simulation paused", "info");
    },
    
    reset: () => {
      set({
        isPlaying: false,
        speed: 1,
        simulationTime: new Date(),
        aircraft: createInitialAircraft(),
        gates: [...createGates("San Diego"), ...createGates("Los Angeles")],
        pipelines: initialPipelines,
        events: [],
      });
    },
    
    setSpeed: (speed: number) => {
      set({ speed });
      get().addEvent(`Speed set to ${speed}x`, "info");
    },
    
    setScenario: (scenario: string) => {
      set({ selectedScenario: scenario });
      get().addEvent(`Scenario changed to: ${scenario}`, "info");
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
      
      const adjustedDelta = deltaTime * state.speed;
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
        
        for (const aircraft of prevState.aircraft) {
          if (aircraft.status === "in_ring" && aircraft.cityId) {
            let newAngle = aircraft.angleOnRing + aircraft.speed * adjustedDelta * 25;
            if (newAngle >= 360) newAngle -= 360;
            
            if (Math.random() < 0.015 * adjustedDelta) {
              const availableGates = prevState.gates.filter(
                (g) => g.cityId === aircraft.cityId && 
                       !newReservedGates.has(g.id)
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
            
            if (Math.random() < 0.005 * adjustedDelta) {
              const availablePipeline = prevState.pipelines.find(
                (p) => p.fromCity === aircraft.cityId && 
                       newPipelineCounts[p.id] < p.capacity
              );
              
              if (availablePipeline) {
                newPipelineCounts[availablePipeline.id]++;
                newEvents.push({
                  message: `${aircraft.id} entering ${availablePipeline.id} pipeline`,
                  type: "info"
                });
                updatedAircraft.push({
                  ...aircraft,
                  status: "in_pipeline",
                  originCity: aircraft.cityId,
                  cityId: null,
                  pipelineId: availablePipeline.id,
                  pipelineProgress: 0,
                  color: 0xFFB347,
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
            if (Math.random() < 0.03 * adjustedDelta) {
              const gateId = aircraft.targetGate;
              newReservedGates.delete(gateId || "");
              newEvents.push({
                message: `${aircraft.id} departing from ${gateId}`,
                type: "info"
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
            const newAltitude = aircraft.altitude + 150 * adjustedDelta;
            
            let newDistance = aircraft.distanceFromCenter;
            if (newDistance < RING_RADIUS) {
              newDistance += 1 * adjustedDelta;
              if (newDistance > RING_RADIUS) newDistance = RING_RADIUS;
            }
            
            if (newAltitude >= MAX_ALTITUDE) {
              newEvents.push({
                message: `${aircraft.id} rejoined ${aircraft.originCity} ring`,
                type: "success"
              });
              updatedAircraft.push({
                ...aircraft,
                altitude: MAX_ALTITUDE,
                status: "in_ring",
                distanceFromCenter: RING_RADIUS,
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
                updatedAircraft.push({
                  ...aircraft,
                  status: "in_ring",
                  cityId: pipeline.toCity,
                  originCity: pipeline.toCity,
                  pipelineId: null,
                  pipelineProgress: 0,
                  angleOnRing: Math.random() * 360,
                  distanceFromCenter: RING_RADIUS,
                  altitude: MAX_ALTITUDE,
                  color: 0x0099ff,
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
        
        return {
          aircraft: updatedAircraft,
          gates: updatedGates,
          pipelines: updatedPipelines,
          simulationTime: newSimTime,
          events: [...newEventItems, ...prevState.events].slice(0, 100),
        };
      });
    },
  }))
);
