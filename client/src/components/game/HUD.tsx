import { useState } from "react";
import { useLocation } from "wouter";
import { useSimulation, SCENARIO_CONFIGS, RING_CONFIGS, OPERATOR_CONFIGS, REVENUE_SPLIT, ScenarioName, type OperatorCode, type RingLevel, type FlightRequest, type BlockchainTransaction } from "@/lib/stores/useSimulation";
import { useWeather, type WeatherPreset } from "@/lib/stores/useWeather";

// ─────────────────────────────────────────────
// Always-visible: Header
// ─────────────────────────────────────────────
function Header() {
  const simulationTime = useSimulation((state) => state.simulationTime);
  const emergencyOverride = useSimulation((state) => state.emergencyOverride);
  const weatherGrounded = useSimulation((state) => state.weatherGrounded);
  const [, navigate] = useLocation();

  const formattedTime = simulationTime.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const formattedDate = simulationTime.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
      <h1 style={{ margin: 0, fontSize: "14px" }}>RINGS MULTI-CITY NETWORK SIMULATOR</h1>

      {/* Status badges */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {weatherGrounded && !emergencyOverride && (
          <span style={{
            background: "rgba(255,0,0,0.25)", border: "1px solid #ff4444",
            color: "#ff6666", padding: "2px 10px", borderRadius: "4px",
            fontSize: "10px", fontFamily: "'Orbitron', monospace", animation: "pulse 1s infinite",
          }}>
            WEATHER HOLD
          </span>
        )}
        {emergencyOverride && (
          <span style={{
            background: "rgba(255,100,0,0.3)", border: "1px solid #ff8800",
            color: "#ffaa00", padding: "2px 10px", borderRadius: "4px",
            fontSize: "10px", fontFamily: "'Orbitron', monospace", animation: "pulse 0.5s infinite",
          }}>
            FAA OVERRIDE
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={() => navigate("/demo")}
          style={{
            background: "rgba(0,255,255,0.08)",
            border: "1px solid rgba(0,255,255,0.3)",
            color: "#00ffcc",
            padding: "4px 14px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "9px",
            letterSpacing: "2px",
            fontFamily: "'Orbitron', monospace",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(0,255,255,0.18)"; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(0,255,255,0.08)"; }}
        >
          ▶ DEMO
        </button>
        <button
          onClick={() => navigate("/pilot")}
          style={{
            background: "rgba(0,255,136,0.08)",
            border: "1px solid rgba(0,255,136,0.3)",
            color: "#00ff88",
            padding: "4px 14px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "9px",
            letterSpacing: "2px",
            fontFamily: "'Orbitron', monospace",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(0,255,136,0.18)"; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(0,255,136,0.08)"; }}
        >
          ✈ PILOT
        </button>
        <button
          onClick={() => navigate("/operator")}
          style={{
            background: "rgba(170,68,255,0.08)",
            border: "1px solid rgba(170,68,255,0.3)",
            color: "#aa44ff",
            padding: "4px 14px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "9px",
            letterSpacing: "2px",
            fontFamily: "'Orbitron', monospace",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(170,68,255,0.18)"; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(170,68,255,0.08)"; }}
        >
          ⊞ OPS
        </button>
        <button
          onClick={() => navigate("/admin")}
          style={{
            background: "rgba(255,136,0,0.08)",
            border: "1px solid rgba(255,136,0,0.3)",
            color: "#ff8800",
            padding: "4px 14px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "9px",
            letterSpacing: "2px",
            fontFamily: "'Orbitron', monospace",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(255,136,0,0.18)"; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(255,136,0,0.08)"; }}
        >
          ⛨ FAA
        </button>
        <button
          onClick={() => navigate('/racing')}
          style={{
            background: "rgba(255,184,0,0.08)",
            border: "1px solid rgba(255,184,0,0.3)",
            color: "#FFB800",
            padding: "4px 14px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "9px",
            letterSpacing: "2px",
            fontFamily: "'Orbitron', monospace",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(255,184,0,0.18)"; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(255,184,0,0.08)"; }}
        >
          🏁 RACING
        </button>
        <div className="time-display">
          <span>{formattedDate}</span>
          <span style={{ marginLeft: "12px" }}>{formattedTime}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Always-visible: ScenarioAlert (top-center)
// ─────────────────────────────────────────────
function ScenarioAlert() {
  const selectedScenario = useSimulation((state) => state.selectedScenario);
  const config = SCENARIO_CONFIGS[selectedScenario as ScenarioName];
  if (!config?.alertMessage) return null;
  const isEmergency = selectedScenario === "emergency";
  const isMaintenance = selectedScenario === "maintenance";
  return (
    <div
      className={`scenario-alert ${isEmergency ? "emergency" : isMaintenance ? "maintenance" : ""}`}
      style={{
        position: "absolute", top: "70px", left: "50%", transform: "translateX(-50%)",
        padding: "8px 20px", borderRadius: "4px",
        fontFamily: "'Orbitron', monospace", fontSize: "12px", fontWeight: "bold",
        letterSpacing: "1px", zIndex: 1000, animation: isEmergency ? "pulse 1s infinite" : "none",
        background: isEmergency
          ? "linear-gradient(90deg, rgba(255,0,0,0.3), rgba(255,100,0,0.3))"
          : isMaintenance ? "linear-gradient(90deg, rgba(255,200,0,0.3), rgba(255,150,0,0.3))"
          : "rgba(0,255,255,0.2)",
        border: isEmergency ? "1px solid #ff4444" : isMaintenance ? "1px solid #ffaa00" : "1px solid #00ffff",
        color: isEmergency ? "#ff6666" : isMaintenance ? "#ffcc00" : "#00ffff",
      }}
    >
      {config.alertMessage}
    </div>
  );
}

// ─────────────────────────────────────────────
// Always-visible: CapacityWarnings (top-left)
// ─────────────────────────────────────────────
function CapacityWarnings() {
  const pipelines = useSimulation((state) => state.pipelines);
  const gates = useSimulation((state) => state.gates);
  const warnings: { id: string; message: string; severity: "warning" | "critical" }[] = [];

  pipelines.forEach((p) => {
    const utilization = (p.currentCount / p.capacity) * 100;
    if (utilization >= 90)
      warnings.push({ id: `pipeline-${p.id}`, message: `${p.id} Pipeline ${utilization.toFixed(0)}% — CRITICAL`, severity: "critical" });
    else if (utilization >= 75)
      warnings.push({ id: `pipeline-${p.id}`, message: `${p.id} Pipeline ${utilization.toFixed(0)}% capacity`, severity: "warning" });
  });

  ["San Diego", "Orange County"].forEach((city) => {
    const cityGates = gates.filter((g) => g.cityId === city);
    const occupiedPercent = (cityGates.filter((g) => g.status === "RED").length / cityGates.length) * 100;
    const congestedGates = cityGates.filter((g) => g.status === "YELLOW").length;
    if (occupiedPercent >= 50)
      warnings.push({ id: `city-${city}`, message: `${city}: ${occupiedPercent.toFixed(0)}% gates occupied`, severity: "critical" });
    else if (occupiedPercent >= 30 || congestedGates > 20)
      warnings.push({ id: `city-${city}`, message: `${city}: High gate congestion`, severity: "warning" });
  });

  if (warnings.length === 0) return null;
  return (
    <div style={{ position: "absolute", top: "70px", left: "10px", maxWidth: "300px", zIndex: 1000, pointerEvents: "auto" }}>
      {warnings.map((w) => (
        <div key={w.id} style={{
          background: w.severity === "critical" ? "rgba(255,0,0,0.2)" : "rgba(255,200,0,0.2)",
          border: w.severity === "critical" ? "1px solid #ff4444" : "1px solid #ffaa00",
          color: w.severity === "critical" ? "#ff6666" : "#ffcc00",
          padding: "6px 12px", borderRadius: "4px", marginBottom: "4px",
          fontSize: "11px", fontFamily: "'Orbitron', monospace",
          animation: w.severity === "critical" ? "pulse 1s infinite" : "none",
        }}>
          {w.message}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Always-visible: ControlPanel (left sidebar)
// ─────────────────────────────────────────────
function ControlPanel() {
  const { isPlaying, speed, play, pause, reset, setSpeed, selectedScenario, setScenario } = useSimulation();
  const toggleEmergencyOverride = useSimulation((state) => state.toggleEmergencyOverride);
  const emergencyOverride = useSimulation((state) => state.emergencyOverride);
  const weatherGrounded = useSimulation((state) => state.weatherGrounded);
  const config = SCENARIO_CONFIGS[selectedScenario as ScenarioName];

  const sectionLabel = (text: string) => (
    <div style={{
      color: "#00ffff",
      fontSize: "8px",
      letterSpacing: "2px",
      fontFamily: "'Orbitron', monospace",
      opacity: 0.6,
      marginBottom: "6px",
    }}>
      {text}
    </div>
  );

  const divider = (
    <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", margin: "10px 0" }} />
  );

  return (
    <div className="control-panel">

      {/* ── Playback ── */}
      {sectionLabel("PLAYBACK")}
      <div style={{ display: "flex", gap: "6px" }}>
        {isPlaying
          ? <button onClick={pause}  style={{ flex: 1, padding: "6px 4px", fontSize: "11px" }}>Pause</button>
          : <button onClick={play}   style={{ flex: 1, padding: "6px 4px", fontSize: "11px" }}>Play</button>
        }
        <button onClick={reset} style={{ flex: 1, padding: "6px 4px", fontSize: "11px" }}>Reset</button>
      </div>

      {divider}

      {/* ── Speed ── */}
      {sectionLabel("SPEED")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
        {[1, 2, 4, 10].map((s) => (
          <button
            key={s}
            className={`speed-btn ${speed === s ? "active" : ""}`}
            onClick={() => setSpeed(s)}
            style={{ padding: "5px 0", fontSize: "11px", minWidth: "unset" }}
          >
            {s}x
          </button>
        ))}
      </div>

      {divider}

      {/* ── Scenario ── */}
      {sectionLabel("SCENARIO")}
      <select
        value={selectedScenario}
        onChange={(e) => setScenario(e.target.value)}
        style={{
          width: "100%",
          background: "#050f1e",
          border: "1px solid rgba(0,255,255,0.25)",
          color: "#ccc",
          padding: "5px 6px",
          borderRadius: "4px",
          fontSize: "10px",
          fontFamily: "'Courier New', monospace",
          cursor: "pointer",
          marginBottom: "6px",
          boxShadow: "none",
        }}
      >
        <option value="normal">Normal Operations</option>
        <option value="rush_hour">Rush Hour</option>
        <option value="maintenance">Scheduled Maintenance</option>
        <option value="emergency">Emergency Response</option>
      </select>
      <span style={{
        color: "#446688",
        fontSize: "9px",
        fontStyle: "italic",
        lineHeight: "1.4",
        display: "block",
      }}>
        {config?.description}
      </span>

      {/* Spacer pushes FAA Override to the bottom */}
      <div style={{ flex: 1 }} />

      {/* ── FAA Override ── */}
      <button
        onClick={toggleEmergencyOverride}
        style={{
          background: emergencyOverride
            ? "linear-gradient(180deg,rgba(255,100,0,0.4),rgba(255,50,0,0.6))"
            : weatherGrounded
            ? "linear-gradient(180deg,rgba(255,0,0,0.3),rgba(200,0,0,0.5))"
            : "rgba(40,40,60,0.8)",
          border: emergencyOverride ? "2px solid #ff8800" : weatherGrounded ? "2px solid #ff4444" : "1px solid #444466",
          color: emergencyOverride ? "#ffaa00" : weatherGrounded ? "#ff6666" : "#666",
          fontFamily: "'Orbitron', monospace",
          fontSize: "9px",
          padding: "7px 4px",
          borderRadius: "4px",
          cursor: "pointer",
          width: "100%",
          letterSpacing: "0.5px",
        }}
      >
        {emergencyOverride ? "DEACTIVATE OVERRIDE" : "FAA OVERRIDE"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Gate info modal (click-triggered, floating)
// ─────────────────────────────────────────────
function GateInfoModal() {
  const selectedGateId = useSimulation((state) => state.selectedGateId);
  const selectGate = useSimulation((state) => state.selectGate);
  const gates = useSimulation((state) => state.gates);
  const aircraft = useSimulation((state) => state.aircraft);
  const selectedGate = gates.find((g) => g.id === selectedGateId);
  if (!selectedGate) return null;

  const assignedAircraft = aircraft.find((a) => a.targetGate === selectedGate.id && (a.status === "descending" || a.status === "landed"));
  const nearbyAircraft = aircraft.filter((a) => a.status === "in_ring" && (a.cityId === selectedGate.cityId || a.originCity === selectedGate.cityId) && Math.abs(((a.angleOnRing - selectedGate.angle + 180) % 360) - 180) < 30);
  const queuedAircraft = aircraft.filter((a) => a.status === "in_ring" && (a.cityId === selectedGate.cityId || a.originCity === selectedGate.cityId) && Math.abs(((a.angleOnRing - selectedGate.angle + 180) % 360) - 180) < 15);

  const statusColor = selectedGate.status === "GREEN" ? "#00ff00" : selectedGate.status === "YELLOW" ? "#ffff00" : "#ff0000";
  const statusText = selectedGate.assignedAircraft === "MAINTENANCE" ? "MAINTENANCE" : selectedGate.status === "GREEN" ? "AVAILABLE" : selectedGate.status === "YELLOW" ? "CONGESTED" : "OCCUPIED";

  return (
    <div style={{
      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      background: "rgba(0,0,0,0.97)", border: "2px solid #00ffff", borderRadius: "8px",
      padding: "16px", minWidth: "280px", maxWidth: "320px", zIndex: 2000, pointerEvents: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ color: "#00ffff", fontSize: "16px", margin: 0, fontFamily: "'Orbitron', monospace" }}>GATE {selectedGate.id}</h3>
        <button onClick={() => selectGate(null)} style={{ background: "transparent", border: "1px solid #ff4444", color: "#ff4444", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}>CLOSE</button>
      </div>
      <Row label="Status" value={statusText} valueColor={statusColor} />
      <Row label="City" value={selectedGate.cityId} />
      <Row label="Quadrant" value={selectedGate.quadrant} />
      <Row label="Position" value={`${selectedGate.angle.toFixed(1)}° / ${selectedGate.distance.toFixed(1)} units`} />
      {assignedAircraft && (
        <div style={{ margin: "8px 0", padding: "8px", background: "rgba(255,255,0,0.1)", borderRadius: "4px" }}>
          <div style={{ color: "#ffff00", fontSize: "12px", marginBottom: "4px" }}>ASSIGNED: {assignedAircraft.id}</div>
          <Row label="Altitude" value={`${assignedAircraft.altitude.toFixed(0)}m`} />
        </div>
      )}
      <div style={{ marginTop: "8px" }}>
        <Row label="Nearby (30°)" value={String(nearbyAircraft.length)} valueColor={nearbyAircraft.length > 3 ? "#ffff00" : "#00ff00"} />
        <Row label="In Queue (15°)" value={String(queuedAircraft.length)} valueColor={queuedAircraft.length > 2 ? "#ff0000" : "#00ff00"} />
      </div>
    </div>
  );
}

function Row({ label, value, valueColor = "#ffffff" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
      <span style={{ color: "#888888", fontSize: "12px" }}>{label}:</span>
      <span style={{ color: valueColor, fontSize: "12px" }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB PANEL CONTENTS
// ─────────────────────────────────────────────

const RING_CAPACITY: Record<RingLevel, number> = { 1: 75, 2: 150, 3: 100 };
const CORRIDOR_THROUGHPUT: Record<string, number> = { "N-S": 60, "E-W": 45 };

function getBarColor(pct: number) {
  return pct >= 80 ? "#ff4444" : pct >= 60 ? "#ffaa00" : "#00ff00";
}

// ── Tab: AIRSPACE ──
function AirspaceTab() {
  const aircraft = useSimulation((state) => state.aircraft);
  const pipelines = useSimulation((state) => state.pipelines);
  const centerPipelineUtilizationPct = useSimulation((state) => state.centerPipelineUtilizationPct);
  const topPipelineOverflowActive = useSimulation((state) => state.topPipelineOverflowActive);
  const energyOracle = useSimulation((state) => state.energyOracle);
  const fleetMix = useSimulation((state) => state.fleetMix);

  const ringCounts = (city: string) =>
    ([1, 2, 3] as RingLevel[]).map((r) => ({
      ring: r,
      count: aircraft.filter((a) => (a.cityId === city || a.originCity === city) && a.status !== "in_pipeline" && a.ringLevel === r && (a.status === "in_ring" || a.status === "ascending")).length,
      capacity: RING_CAPACITY[r],
    }));

  const sdRings = ringCounts("San Diego");
  const laRings = ringCounts("Orange County");
  const nsPipelines = pipelines.filter((p) => p.id.startsWith("N-S"));
  const ewPipelines = pipelines.filter((p) => p.id.startsWith("E-W"));
  const nsCount = nsPipelines.reduce((s, p) => s + p.currentCount, 0);
  const ewCount = ewPipelines.reduce((s, p) => s + p.currentCount, 0);
  const opCounts: Record<string, number> = {};
  aircraft.forEach((a) => { opCounts[a.operator] = (opCounts[a.operator] || 0) + 1; });

  const RingBar = ({ ring, count, capacity }: { ring: RingLevel; count: number; capacity: number }) => {
    const pct = capacity > 0 ? (count / capacity) * 100 : 0;
    const cfg = RING_CONFIGS[ring];
    const colorHex = `#${cfg.color.toString(16).padStart(6, "0")}`;
    return (
      <div style={{ marginBottom: "5px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
          <span style={{ color: colorHex }}>Ring {ring}</span>
          <span style={{ color: getBarColor(pct) }}>{count}/{capacity} ({pct.toFixed(0)}%)</span>
        </div>
        <div style={{ background: "#333", borderRadius: "2px", height: "3px" }}>
          <div style={{ background: getBarColor(pct), width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: "2px" }} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <Section label="SAN DIEGO — Ring Occupancy">
        {sdRings.map((r) => <RingBar key={`sd-${r.ring}`} ring={r.ring} count={r.count} capacity={r.capacity} />)}
      </Section>
      <Section label="ORANGE COUNTY — Ring Occupancy">
        {laRings.map((r) => <RingBar key={`oc-${r.ring}`} ring={r.ring} count={r.count} capacity={r.capacity} />)}
      </Section>
      <Section label="CORRIDOR THROUGHPUT">
        <PipelineRow label="N-S Corridor" count={nsCount} cap={CORRIDOR_THROUGHPUT["N-S"]} />
        <PipelineRow label="E-W Corridor" count={ewCount} cap={CORRIDOR_THROUGHPUT["E-W"]} />
        {/* CENTER pipeline utilization + overflow badge */}
        <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#888", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>
            CENTER PIPELINE: {centerPipelineUtilizationPct}%
          </span>
          {topPipelineOverflowActive && (
            <span style={{
              background: "rgba(255,170,0,0.2)", border: "1px solid #ffaa00",
              color: "#ffcc00", padding: "1px 7px", borderRadius: "3px",
              fontSize: "8px", fontFamily: "'Orbitron', monospace",
              animation: "pulse 1s infinite",
            }}>
              OVERFLOW ACTIVE
            </span>
          )}
        </div>
      </Section>
      <Section label="FLEET MIX">
        {(Object.keys(OPERATOR_CONFIGS) as OperatorCode[]).map((op) => {
          const count = opCounts[op] || 0;
          const pct = aircraft.length > 0 ? (count / aircraft.length) * 100 : 0;
          return (
            <div key={op} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: OPERATOR_CONFIGS[op].hex }} />
                <span style={{ color: OPERATOR_CONFIGS[op].hex, fontSize: "10px", fontFamily: "'Courier New', monospace" }}>{op}</span>
              </div>
              <span style={{ color: "#aaa", fontSize: "10px" }}>{count} ({pct.toFixed(0)}%)</span>
            </div>
          );
        })}
      </Section>

      {/* ── ENERGY GRID (Sprint 9 — FAA RFI System Integration Pillar 3) ── */}
      <Section label="ENERGY GRID" accentColor="#00ff88">
        {/* Energy alert banner */}
        {energyOracle.electricGridPct >= 91 && (
          <div style={{
            background: "rgba(255,80,0,0.15)", border: "1px solid #ff5500",
            color: "#ff7722", padding: "4px 8px", borderRadius: "3px",
            fontSize: "9px", fontFamily: "'Orbitron', monospace",
            letterSpacing: "1px", marginBottom: "8px",
            animation: "pulse 1s infinite",
          }}>
            ⚡ ENERGY ALERT — Prioritizing electric fleet
          </div>
        )}

        {/* Grid demand bar */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "3px" }}>
            <span style={{ color: "#888" }}>GRID DEMAND</span>
            <span style={{ color: energyOracle.electricGridPct >= 91 ? "#ff5500" : energyOracle.electricGridPct >= 70 ? "#ffaa00" : "#00ff88" }}>
              {energyOracle.gridDemandMW.toFixed(1)} / {energyOracle.gridCapacityMW.toFixed(1)} MW
            </span>
          </div>
          <div style={{ background: "#1a1a2e", borderRadius: "2px", height: "5px" }}>
            <div style={{
              background: energyOracle.electricGridPct >= 91 ? "#ff4400" : energyOracle.electricGridPct >= 70 ? "#ffaa00" : "#00ff88",
              width: `${Math.min(energyOracle.electricGridPct, 100)}%`,
              height: "100%", borderRadius: "2px",
              boxShadow: `0 0 6px ${energyOracle.electricGridPct >= 91 ? "#ff4400" : "#00ff88"}`,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* Fuel supply rows */}
        {[
          { label: "ELEC", color: "#00ff88", pct: fleetMix.electricPct, sub: `${energyOracle.electricGridPct}% grid` },
          { label: "H₂",   color: "#4488ff", pct: fleetMix.hydrogenPct, sub: `${energyOracle.hydrogenSupplyKgHr} kg/hr` },
          { label: "JET",  color: "#ff8800", pct: fleetMix.jetFuelPct,  sub: `${energyOracle.jetFuelSupplyGalHr} gal/hr` },
        ].map(({ label, color, pct, sub }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
            <span style={{ color, fontSize: "9px", fontFamily: "'Orbitron', monospace", width: "28px", flexShrink: 0 }}>{label}</span>
            <div style={{ flex: 1, background: "#1a1a2e", borderRadius: "2px", height: "3px" }}>
              <div style={{ background: color, width: `${pct}%`, height: "100%", borderRadius: "2px" }} />
            </div>
            <span style={{ color: "#888", fontSize: "9px", width: "52px", textAlign: "right" }}>{sub}</span>
            <span style={{ color, fontSize: "9px", width: "26px", textAlign: "right" }}>{pct}%</span>
          </div>
        ))}
      </Section>
    </div>
  );
}

function PipelineRow({ label, count, cap }: { label: string; count: number; cap: number }) {
  const pct = (count / cap) * 100;
  return (
    <div style={{ marginBottom: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "2px" }}>
        <span style={{ color: "#fff" }}>{label}</span>
        <span style={{ color: getBarColor(pct) }}>{count} / {cap}</span>
      </div>
      <div style={{ background: "#333", borderRadius: "2px", height: "3px" }}>
        <div style={{ background: getBarColor(pct), width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: "2px" }} />
      </div>
    </div>
  );
}

// ── Tab: OPS ──
function OpsTab() {
  const aircraft = useSimulation((state) => state.aircraft);
  const gates = useSimulation((state) => state.gates);
  const pipelines = useSimulation((state) => state.pipelines);
  const currentStats = useSimulation((state) => state.currentStats);
  const flightQueue = useSimulation((state) => state.flightQueue);
  const approveFlightRequest = useSimulation((state) => state.approveFlightRequest);
  const denyFlightRequest = useSimulation((state) => state.denyFlightRequest);
  const weatherGrounded = useSimulation((state) => state.weatherGrounded);
  const events = useSimulation((state) => state.events);
  const daoProposals = useSimulation((state) => state.daoProposals);
  const voteOnProposal = useSimulation((state) => state.voteOnProposal);
  const emergencyOverride = useSimulation((state) => state.emergencyOverride);

  const pendingRequests = flightQueue.filter((r) => r.status === "HOLD" || r.status === "PENDING");

  const inRing = aircraft.filter((a) => a.status === "in_ring").length;
  const descending = aircraft.filter((a) => a.status === "descending").length;
  const landed = aircraft.filter((a) => a.status === "landed").length;
  const ascending = aircraft.filter((a) => a.status === "ascending").length;
  const inPipeline = aircraft.filter((a) => a.status === "in_pipeline").length;

  const sdGates = gates.filter((g) => g.cityId === "San Diego");
  const laGates = gates.filter((g) => g.cityId === "Orange County");
  const sdUtil = (sdGates.filter((g) => g.status === "RED").length / sdGates.length) * 100;
  const laUtil = (laGates.filter((g) => g.status === "RED").length / laGates.length) * 100;

  const totalLandings = currentStats.landingsSD + currentStats.landingsLA;
  const totalDepartures = currentStats.departuresSD + currentStats.departuresLA;
  const throughput = totalLandings + totalDepartures + currentStats.pipelineTransfers;

  const getPriorityColor = (priority: string) =>
    priority === "EMERGENCY" ? "#ff4444" : priority === "PRIORITY" ? "#ffaa00" : "#00ffcc";

  const getEventColor = (type: string) =>
    type === "success" ? "#00ff00" : type === "warning" ? "#ffff00" : type === "error" ? "#ff0000" : "#ffffff";

  return (
    <div>
      {/* Flight Queue */}
      {(pendingRequests.length > 0 || weatherGrounded) && (
        <Section label={`FLIGHT QUEUE (${pendingRequests.length})`} accentColor="#ffaa00">
          {pendingRequests.length === 0 ? (
            <div style={{ color: "#666", fontSize: "10px" }}>No pending requests</div>
          ) : (
            pendingRequests.map((req) => (
              <div key={req.id} style={{
                background: "rgba(255,170,0,0.08)", border: `1px solid ${getPriorityColor(req.priority)}33`,
                borderRadius: "4px", padding: "8px", marginBottom: "6px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: OPERATOR_CONFIGS[req.operator].hex, fontWeight: "bold", fontFamily: "'Courier New', monospace" }}>
                    {req.operator}-{req.aircraftId.slice(-3)}
                  </span>
                  <span style={{ color: getPriorityColor(req.priority), fontSize: "9px", fontFamily: "'Orbitron', monospace", border: `1px solid ${getPriorityColor(req.priority)}`, padding: "1px 6px", borderRadius: "3px" }}>
                    {req.priority}
                  </span>
                </div>
                <div style={{ color: "#aaa", fontSize: "10px", marginBottom: "2px" }}>
                  {req.origin === "San Diego" ? "SD" : "OC"} → {req.destination === "San Diego" ? "SD" : "OC"}
                </div>
                <div style={{ color: "#777", fontSize: "9px", marginBottom: "6px" }}>{req.reason}</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => approveFlightRequest(req.id)} style={{ flex: 1, padding: "4px", background: "rgba(0,255,0,0.15)", border: "1px solid #00ff00", color: "#00ff00", borderRadius: "3px", cursor: "pointer", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>APPROVE</button>
                  <button onClick={() => denyFlightRequest(req.id)} style={{ flex: 1, padding: "4px", background: "rgba(255,0,0,0.15)", border: "1px solid #ff4444", color: "#ff4444", borderRadius: "3px", cursor: "pointer", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>DENY</button>
                </div>
              </div>
            ))
          )}
        </Section>
      )}

      {/* Live Stats */}
      <Section label="AIRCRAFT STATUS">
        <StatRow label="In Ring" value={inRing} color="#00ff00" />
        <StatRow label="Descending" value={descending} color="#ffff00" />
        <StatRow label="Landed" value={landed} color="#ff8800" />
        <StatRow label="Ascending" value={ascending} color="#88ff00" />
        <StatRow label="In Pipeline" value={inPipeline} color="#ff00ff" />
      </Section>

      <Section label="GATE UTILIZATION">
        <UtilBar label="San Diego" pct={sdUtil} />
        <UtilBar label="Orange County" pct={laUtil} />
      </Section>

      <Section label="CUMULATIVE STATS">
        <StatRow label="Landings" value={totalLandings} color="#00ff00" />
        <StatRow label="Departures" value={totalDepartures} color="#ffff00" />
        <StatRow label="Pipeline Xfers" value={currentStats.pipelineTransfers} color="#ff8800" />
        <StatRow label="Reroutings" value={currentStats.reroutings} color="#ff00ff" />
        <div style={{ borderTop: "1px solid #333", paddingTop: "4px", marginTop: "4px" }}>
          <StatRow label="Total Throughput" value={throughput} color="#00ffff" />
        </div>
      </Section>

      {/* ── DAO GOVERNANCE (Sprint 9 — 8-Pillar Philosophy, Pillars 1 + 4) ── */}
      <Section label="DAO GOVERNANCE" accentColor="#aa44ff">
        {emergencyOverride && (
          <div style={{
            background: "rgba(255,80,0,0.15)", border: "1px solid #ff5500",
            color: "#ff7722", padding: "3px 8px", borderRadius: "3px",
            fontSize: "9px", fontFamily: "'Orbitron', monospace",
            marginBottom: "8px", animation: "pulse 0.5s infinite",
          }}>
            ⚡ FAA OVERRIDE ACTIVE — Emergency vote triggered
          </div>
        )}
        {daoProposals.map((proposal) => {
          const total = proposal.yesVotes + proposal.noVotes || 1;
          const yesPct = Math.round((proposal.yesVotes / total) * 100);
          const expired = proposal.status !== 'active';
          const timerColor = proposal.timeRemaining < 5 ? "#ff4444" : proposal.timeRemaining < 10 ? "#ffaa00" : "#00ffcc";
          const statusColor = proposal.status === 'passed' ? "#00ff88" : proposal.status === 'failed' ? "#ff4444" : "#aa44ff";
          return (
            <div key={proposal.id} style={{
              background: expired ? "rgba(255,255,255,0.03)" : proposal.emergencyVote ? "rgba(255,80,0,0.08)" : "rgba(170,68,255,0.06)",
              border: `1px solid ${expired ? "#333" : proposal.emergencyVote ? "#ff550055" : "#aa44ff33"}`,
              borderRadius: "4px", padding: "8px", marginBottom: "7px",
              opacity: expired ? 0.65 : 1,
            }}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3px" }}>
                <span style={{ color: proposal.emergencyVote ? "#ff7722" : "#cc88ff", fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.5px", maxWidth: "160px", lineHeight: 1.3 }}>
                  {proposal.emergencyVote && "⚡ "}{proposal.title}
                </span>
                {expired ? (
                  <span style={{ color: statusColor, fontSize: "8px", fontFamily: "'Orbitron', monospace", border: `1px solid ${statusColor}`, padding: "1px 5px", borderRadius: "2px", flexShrink: 0, marginLeft: "4px" }}>
                    {proposal.status.toUpperCase()}
                  </span>
                ) : (
                  <span style={{ color: timerColor, fontSize: "9px", fontFamily: "'Courier New', monospace", flexShrink: 0, marginLeft: "4px" }}>
                    ⏱ {proposal.timeRemaining.toFixed(0)}s
                  </span>
                )}
              </div>
              {/* Description */}
              <div style={{ color: "#777", fontSize: "9px", marginBottom: "6px", lineHeight: 1.4 }}>{proposal.description}</div>
              {/* Vote bar */}
              <div style={{ marginBottom: "5px" }}>
                <div style={{ display: "flex", height: "4px", borderRadius: "2px", overflow: "hidden", background: "#1a1a2e" }}>
                  <div style={{ width: `${yesPct}%`, background: "#00ff88", transition: "width 0.4s" }} />
                  <div style={{ flex: 1, background: "#ff4444" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginTop: "2px" }}>
                  <span style={{ color: "#00ff88" }}>FOR {proposal.yesVotes} ({yesPct}%)</span>
                  <span style={{ color: "#ff4444" }}>AGAINST {proposal.noVotes} ({100 - yesPct}%)</span>
                </div>
              </div>
              {/* Vote buttons (only while active) */}
              {!expired && (
                <div style={{ display: "flex", gap: "5px" }}>
                  <button onClick={() => voteOnProposal(proposal.id, 'yes')} style={{ flex: 1, padding: "3px", background: "rgba(0,255,136,0.1)", border: "1px solid #00ff88", color: "#00ff88", borderRadius: "3px", cursor: "pointer", fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>
                    FOR
                  </button>
                  <button onClick={() => voteOnProposal(proposal.id, 'no')} style={{ flex: 1, padding: "3px", background: "rgba(255,68,68,0.1)", border: "1px solid #ff4444", color: "#ff4444", borderRadius: "3px", cursor: "pointer", fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>
                    AGAINST
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </Section>

      {/* Event Log */}
      <Section label="EVENT LOG">
        <div style={{ maxHeight: "180px", overflowY: "auto" }}>
          {events.slice(0, 30).map((event) => (
            <div key={event.id} style={{ display: "flex", gap: "6px", marginBottom: "3px", fontSize: "9px" }}>
              <span style={{ color: "#555", whiteSpace: "nowrap" }}>
                {event.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
              </span>
              <span style={{ color: getEventColor(event.type) }}>{event.message}</span>
            </div>
          ))}
          {events.length === 0 && <div style={{ color: "#666", fontSize: "10px" }}>Press Play to start.</div>}
        </div>
      </Section>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
      <span style={{ color: "#ffffff", fontSize: "10px" }}>{label}:</span>
      <span style={{ color, fontSize: "10px", fontFamily: "'Courier New', monospace" }}>{value}</span>
    </div>
  );
}

function UtilBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div style={{ marginBottom: "5px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "2px" }}>
        <span style={{ color: "#fff" }}>{label}</span>
        <span style={{ color: getBarColor(pct) }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ background: "#333", borderRadius: "2px", height: "4px" }}>
        <div style={{ background: getBarColor(pct), width: `${pct}%`, height: "100%", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// ── Tab: FINANCE ──
function FinanceTab() {
  const revenue = useSimulation((state) => state.revenue);
  const blockchain = useSimulation((state) => state.blockchain);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const fmt = (n: number) => `$${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  const getTypeLabel = (type: BlockchainTransaction["type"]) =>
    type === "LANDING_FEE" ? "LND" : type === "DEPARTURE_FEE" ? "DEP" : "COR";

  const getTypeColor = (type: BlockchainTransaction["type"]) =>
    type === "LANDING_FEE" ? "#00ff00" : type === "DEPARTURE_FEE" ? "#ffaa00" : "#ff00ff";

  const getTypeFull = (type: BlockchainTransaction["type"]) =>
    type === "LANDING_FEE" ? "Landing Fee" : type === "DEPARTURE_FEE" ? "Departure Fee" : "Corridor Toll";

  return (
    <div>
      {/* Revenue Summary */}
      <Section label={`TOTAL REVENUE: ${fmt(revenue.totalRevenue)}`} accentColor="#00ff88">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
          <span style={{ color: "#00ff88", fontSize: "10px" }}>Operators (70%)</span>
          <span style={{ color: "#00ff88", fontSize: "10px", fontFamily: "'Courier New', monospace" }}>{fmt(revenue.operatorShare)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
          <span style={{ color: "#4488ff", fontSize: "10px" }}>AAM Institute (20%)</span>
          <span style={{ color: "#4488ff", fontSize: "10px", fontFamily: "'Courier New', monospace" }}>{fmt(revenue.aamShare)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ color: "#ffaa00", fontSize: "10px" }}>City Revenue (10%)</span>
          <span style={{ color: "#ffaa00", fontSize: "10px", fontFamily: "'Courier New', monospace" }}>{fmt(revenue.cityShare)}</span>
        </div>
        {/* Split bar */}
        <div style={{ display: "flex", height: "5px", borderRadius: "3px", overflow: "hidden", marginBottom: "10px" }}>
          <div style={{ width: "70%", background: "#00ff88" }} />
          <div style={{ width: "20%", background: "#4488ff" }} />
          <div style={{ width: "10%", background: "#ffaa00" }} />
        </div>
      </Section>

      <Section label="OPERATOR EARNINGS" accentColor="#00ff88">
        {(Object.keys(OPERATOR_CONFIGS) as OperatorCode[]).map((op) => (
          <div key={op} style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: OPERATOR_CONFIGS[op].hex }} />
              <span style={{ color: OPERATOR_CONFIGS[op].hex, fontSize: "10px" }}>{op}</span>
            </div>
            <span style={{ color: "#aaa", fontSize: "10px", fontFamily: "'Courier New', monospace" }}>
              {fmt(revenue.byOperator[op] || 0)}
            </span>
          </div>
        ))}
      </Section>

      <Section label="CITY REVENUE" accentColor="#ffaa00">
        {Object.entries(revenue.byCity).map(([city, amount]) => (
          <div key={city} style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ color: "#fff", fontSize: "10px" }}>{city === "San Diego" ? "SD" : "OC"}</span>
            <span style={{ color: "#ffaa00", fontSize: "10px", fontFamily: "'Courier New', monospace" }}>{fmt(amount)}</span>
          </div>
        ))}
      </Section>

      {/* Blockchain Ledger with expandable rows */}
      <Section label={`BLOCKCHAIN LEDGER (${blockchain.length} txns)`} accentColor="#aa66ff">
        {/* SIMULATED LEDGER disclaimer badge */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "8px",
        }}>
          <span style={{ color: "#666", fontSize: "8px" }}>Algorand-compatible hash format</span>
          <span style={{
            background: "rgba(255,200,0,0.15)", border: "1px solid #ffcc0066",
            color: "#ffcc00", padding: "1px 7px", borderRadius: "3px",
            fontSize: "8px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.5px",
          }}>
            SIMULATED LEDGER
          </span>
        </div>
        {blockchain.length === 0 ? (
          <div style={{ color: "#666", fontSize: "10px" }}>No transactions yet — start simulation</div>
        ) : (
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {blockchain.slice(0, 50).map((tx) => {
              const isExpanded = expandedTx === tx.id;
              return (
                <div
                  key={tx.id}
                  onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                  style={{
                    background: isExpanded ? "rgba(170,102,255,0.15)" : "rgba(170,102,255,0.05)",
                    border: `1px solid ${isExpanded ? "#aa66ff88" : "#aa66ff22"}`,
                    borderRadius: "4px", padding: "6px 8px", marginBottom: "4px",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  {/* Collapsed row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{
                        color: getTypeColor(tx.type), border: `1px solid ${getTypeColor(tx.type)}`,
                        padding: "0 4px", borderRadius: "2px", fontSize: "8px",
                        fontFamily: "'Orbitron', monospace",
                      }}>
                        {getTypeLabel(tx.type)}
                      </span>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: OPERATOR_CONFIGS[tx.operator].hex }} />
                      <span style={{ color: OPERATOR_CONFIGS[tx.operator].hex, fontSize: "9px" }}>
                        {tx.operator}-{tx.aircraftId.slice(-3)}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#00ff88", fontSize: "9px", fontFamily: "'Courier New', monospace", fontWeight: "bold" }}>
                        ${tx.amount.toFixed(2)}
                      </span>
                      <span style={{ color: "#555", fontSize: "9px" }}>{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ marginTop: "8px", borderTop: "1px solid #aa66ff33", paddingTop: "8px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", marginBottom: "6px" }}>
                        <Detail label="Type" value={getTypeFull(tx.type)} />
                        <Detail label="City" value={tx.city === "San Diego" ? "SD" : "OC"} />
                        <Detail label="Operator" value={tx.operator} valueColor={OPERATOR_CONFIGS[tx.operator].hex} />
                        <Detail label="Aircraft" value={tx.aircraftId} />
                      </div>
                      {/* Dynamic pricing breakdown */}
                      <div style={{ background: "rgba(0,255,136,0.05)", borderRadius: "3px", padding: "6px", marginBottom: "6px", border: "1px solid #00ff8822" }}>
                        <div style={{ color: "#777", fontSize: "8px", marginBottom: "4px" }}>FARE CALCULATION</div>
                        <div style={{ color: "#888", fontSize: "8px", fontFamily: "'Courier New', monospace", marginBottom: "2px" }}>
                          <span style={{ color: "#aaa" }}>${(tx.baseFare ?? 155).toFixed(2)}</span>
                          <span style={{ color: "#666" }}> base + </span>
                          <span style={{ color: "#aaa" }}>${(tx.energySurcharge ?? 2.25).toFixed(2)}</span>
                          <span style={{ color: "#666" }}> energy</span>
                        </div>
                        <div style={{ color: "#888", fontSize: "8px", fontFamily: "'Courier New', monospace", marginBottom: "4px" }}>
                          <span style={{ color: "#666" }}>× </span>
                          <span style={{ color: "#ffcc00" }}>{(tx.demandMultiplier ?? 1.0).toFixed(2)}x</span>
                          <span style={{ color: "#666" }}> demand = </span>
                          <span style={{ color: "#00ff88", fontWeight: "bold" }}>${tx.amount.toFixed(2)}</span>
                        </div>
                      </div>
                      {/* Revenue split */}
                      <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "3px", padding: "6px", marginBottom: "6px" }}>
                        <div style={{ color: "#777", fontSize: "8px", marginBottom: "4px" }}>REVENUE SPLIT</div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#00ff88", fontSize: "9px" }}>Op: ${tx.operatorPay.toFixed(2)}</span>
                          <span style={{ color: "#4488ff", fontSize: "9px" }}>AAM: ${tx.aamPay.toFixed(2)}</span>
                          <span style={{ color: "#ffaa00", fontSize: "9px" }}>City: ${tx.cityPay.toFixed(2)}</span>
                        </div>
                        <div style={{ display: "flex", height: "3px", borderRadius: "2px", overflow: "hidden", marginTop: "4px" }}>
                          <div style={{ width: "70%", background: "#00ff88" }} />
                          <div style={{ width: "20%", background: "#4488ff" }} />
                          <div style={{ width: "10%", background: "#ffaa00" }} />
                        </div>
                      </div>
                      {/* Full block hash */}
                      <div style={{ background: "rgba(170,102,255,0.1)", borderRadius: "3px", padding: "6px" }}>
                        <div style={{ color: "#777", fontSize: "8px", marginBottom: "2px" }}>BLOCK HASH</div>
                        <div style={{ color: "#aa66ff", fontSize: "8px", fontFamily: "'Courier New', monospace", wordBreak: "break-all" }}>
                          {tx.blockHash}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Detail({ label, value, valueColor = "#ffffff" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div style={{ color: "#666", fontSize: "8px" }}>{label}</div>
      <div style={{ color: valueColor, fontSize: "9px", fontFamily: "'Courier New', monospace" }}>{value}</div>
    </div>
  );
}

// ── Tab: WEATHER ──
function WeatherTab() {
  const weather = useWeather();
  const presets: { key: WeatherPreset; label: string; icon: string; color: string }[] = [
    { key: "clear", label: "CLEAR", icon: "☀", color: "#00ff00" },
    { key: "cloudy", label: "CLOUDY", icon: "☁", color: "#aaaaaa" },
    { key: "rain", label: "RAIN", icon: "🌧", color: "#4488ff" },
    { key: "storm", label: "STORM", icon: "⛈", color: "#ff4444" },
    { key: "snow", label: "SNOW", icon: "❄", color: "#ccddff" },
    { key: "fog", label: "FOG", icon: "🌫", color: "#888888" },
  ];
  const getSafetyColor = (score: number) => score >= 80 ? "#00ff00" : score >= 50 ? "#ffaa00" : "#ff4444";

  return (
    <div>
      <Section label="WEATHER CONTROL">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ color: "#888", fontSize: "10px" }}>System:</span>
          <button
            onClick={() => weather.setEnabled(!weather.enabled)}
            style={{
              background: weather.enabled ? "rgba(0,255,255,0.2)" : "rgba(255,0,0,0.2)",
              border: `1px solid ${weather.enabled ? "#00ffff" : "#ff4444"}`,
              color: weather.enabled ? "#00ffff" : "#ff4444",
              padding: "3px 14px", cursor: "pointer", fontSize: "10px",
              borderRadius: "3px", fontFamily: "'Orbitron', monospace",
            }}
          >
            {weather.enabled ? "ONLINE" : "OFFLINE"}
          </button>
        </div>

        {/* Presets grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", marginBottom: "12px" }}>
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => weather.setPreset(p.key)}
              style={{
                background: weather.activePreset === p.key ? "rgba(0,255,255,0.25)" : "rgba(255,255,255,0.05)",
                border: weather.activePreset === p.key ? "1px solid #00ffff" : "1px solid #333355",
                color: weather.activePreset === p.key ? p.color : "#666666",
                padding: "8px 4px", cursor: "pointer", fontSize: "9px",
                borderRadius: "4px", fontFamily: "'Orbitron', monospace",
                textAlign: "center", transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: "16px", marginBottom: "2px" }}>{p.icon}</div>
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Section label="SAFETY & CLEARANCE">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <span style={{ color: "#888", fontSize: "10px" }}>Safety Score</span>
          <span style={{ color: getSafetyColor(weather.safetyScore), fontWeight: "bold", fontFamily: "'Orbitron', monospace", fontSize: "13px" }}>
            {weather.safetyScore}/100
          </span>
        </div>
        <div style={{ background: "#333333", borderRadius: "2px", height: "5px", marginBottom: "8px" }}>
          <div style={{ background: getSafetyColor(weather.safetyScore), width: `${weather.safetyScore}%`, height: "100%", borderRadius: "2px", transition: "width 0.3s" }} />
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", padding: "6px 10px",
          background: weather.clearForFlight ? "rgba(0,255,0,0.1)" : "rgba(255,0,0,0.15)",
          border: `1px solid ${weather.clearForFlight ? "#00ff0066" : "#ff444466"}`, borderRadius: "4px",
        }}>
          <span style={{ color: "#888", fontSize: "10px" }}>Flight Status</span>
          <span style={{ color: weather.clearForFlight ? "#00ff00" : "#ff4444", fontWeight: "bold", fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>
            {weather.clearForFlight ? "CLEAR" : "GROUNDED"}
          </span>
        </div>
      </Section>

      <Section label="CURRENT CONDITIONS">
        <CondRow label="Visibility" value={weather.visibility >= 1000 ? `${(weather.visibility / 1000).toFixed(1)} km` : `${weather.visibility} m`} valueColor={weather.visibility < 5000 ? "#ffaa00" : "#00ff00"} />
        <CondRow label="Wind" value={`${weather.windSpeed} m/s @ ${weather.windDirection}°`} valueColor={weather.windSpeed > 15 ? "#ff4444" : weather.windSpeed > 10 ? "#ffaa00" : "#00ff00"} />
        <CondRow label="Temperature" value={`${weather.temperature}°C`} />
        <CondRow label="Cloud Cover" value={`${weather.cloudCover}%`} />
        <CondRow label="Precipitation" value={weather.precipitation > 0 ? `${weather.precipitation} mm/h (${weather.precipitationType})` : "None"} valueColor={weather.precipitation > 0 ? "#4488ff" : "#666"} />
        <CondRow label="Turbulence" value={weather.turbulence} valueColor={weather.turbulence === "SEVERE" ? "#ff4444" : weather.turbulence === "MODERATE" ? "#ffaa00" : weather.turbulence === "LIGHT" ? "#ffff00" : "#00ff00"} />
        {weather.thunderstorm && (
          <div style={{ marginTop: "8px", padding: "5px 8px", background: "rgba(255,0,0,0.2)", border: "1px solid #ff4444", borderRadius: "4px", color: "#ff6666", textAlign: "center", fontFamily: "'Orbitron', monospace", fontSize: "10px", animation: "pulse 1s infinite" }}>
            THUNDERSTORM ACTIVE
          </div>
        )}
      </Section>
    </div>
  );
}

function CondRow({ label, value, valueColor = "#fff" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
      <span style={{ color: "#888", fontSize: "10px" }}>{label}:</span>
      <span style={{ color: valueColor, fontSize: "10px" }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────
function Section({ label, children, accentColor = "#00ffff" }: { label: string; children: React.ReactNode; accentColor?: string }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ color: accentColor, fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "1px", marginBottom: "6px", borderBottom: `1px solid ${accentColor}22`, paddingBottom: "4px" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────
function Footer() {
  const aircraft = useSimulation((state) => state.aircraft);
  const isPlaying = useSimulation((state) => state.isPlaying);
  const speed = useSimulation((state) => state.speed);
  return (
    <div className="footer">
      <div className="footer-stats">
        <span>Aircraft: {aircraft.length}</span>
        <span>Status: {isPlaying ? "Running" : "Paused"}</span>
        <span>Speed: {speed}x</span>
      </div>
      <div className="footer-controls">
        <span>Drag to rotate · Scroll to zoom · Shift+Drag to pan</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN HUD — Tabbed Sidebar
// ─────────────────────────────────────────────
type TabId = "airspace" | "ops" | "finance" | "weather";

const TABS: { id: TabId; label: string; icon: string; color: string }[] = [
  { id: "airspace", label: "AIRSPACE", icon: "◎", color: "#00ffff" },
  { id: "ops",      label: "OPS",      icon: "⚡", color: "#ffaa00" },
  { id: "finance",  label: "FINANCE",  icon: "◈", color: "#00ff88" },
  { id: "weather",  label: "WEATHER",  icon: "≋", color: "#4488ff" },
];

export function HUD() {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);

  return (
    <div className="hud">
      <Header />
      <ScenarioAlert />
      <CapacityWarnings />
      <ControlPanel />
      <GateInfoModal />

      {/* ── Right Sidebar ── */}
      <div style={{
        position: "fixed",
        top: "55px",
        right: 0,
        bottom: "55px",
        display: "flex",
        zIndex: 1000,
        pointerEvents: "auto",
      }}>
        {/* Content panel — slides in when a tab is active */}
        {activeTab && (
          <div style={{
            width: "300px",
            background: "rgba(0, 4, 12, 0.96)",
            borderLeft: `2px solid ${TABS.find(t => t.id === activeTab)?.color ?? "#00ffff"}33`,
            borderTop: "1px solid #ffffff11",
            borderBottom: "1px solid #ffffff11",
            overflowY: "auto",
            padding: "14px 12px",
            fontSize: "11px",
          }}>
            {activeTab === "airspace" && <AirspaceTab />}
            {activeTab === "ops"      && <OpsTab />}
            {activeTab === "finance"  && <FinanceTab />}
            {activeTab === "weather"  && <WeatherTab />}
          </div>
        )}

        {/* Tab strip */}
        <div style={{
          width: "52px",
          background: "rgba(0, 4, 12, 0.97)",
          borderLeft: "1px solid #ffffff18",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "8px",
          gap: "4px",
        }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(isActive ? null : tab.id)}
                title={tab.label}
                style={{
                  width: "44px",
                  height: "64px",
                  background: isActive ? `${tab.color}18` : "transparent",
                  border: isActive ? `1px solid ${tab.color}66` : "1px solid transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  transition: "all 0.15s",
                  color: isActive ? tab.color : "#444",
                }}
              >
                <span style={{ fontSize: "18px", lineHeight: 1 }}>{tab.icon}</span>
                <span style={{
                  fontSize: "7px",
                  fontFamily: "'Orbitron', monospace",
                  letterSpacing: "0.5px",
                  color: isActive ? tab.color : "#444",
                }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Footer />
    </div>
  );
}
