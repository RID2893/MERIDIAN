import { useState } from "react";
import { useSimulation, SCENARIO_CONFIGS, ScenarioName } from "@/lib/stores/useSimulation";

function GateInfoModal() {
  const selectedGateId = useSimulation((state) => state.selectedGateId);
  const selectGate = useSimulation((state) => state.selectGate);
  const gates = useSimulation((state) => state.gates);
  const aircraft = useSimulation((state) => state.aircraft);
  
  const selectedGate = gates.find((g) => g.id === selectedGateId);
  
  if (!selectedGate) return null;
  
  const assignedAircraft = aircraft.find(
    (a) => a.targetGate === selectedGate.id && 
           (a.status === "descending" || a.status === "landed")
  );
  
  const nearbyAircraft = aircraft.filter(
    (a) => a.status === "in_ring" &&
           (a.cityId === selectedGate.cityId || a.originCity === selectedGate.cityId) &&
           Math.abs(((a.angleOnRing - selectedGate.angle + 180) % 360) - 180) < 30
  );
  
  const queuedAircraft = aircraft.filter(
    (a) => a.status === "in_ring" &&
           (a.cityId === selectedGate.cityId || a.originCity === selectedGate.cityId) &&
           Math.abs(((a.angleOnRing - selectedGate.angle + 180) % 360) - 180) < 15
  );
  
  const getStatusColor = () => {
    switch (selectedGate.status) {
      case "GREEN": return "#00ff00";
      case "YELLOW": return "#ffff00";
      case "RED": return "#ff0000";
      default: return "#ffffff";
    }
  };
  
  const getStatusText = () => {
    if (selectedGate.assignedAircraft === "MAINTENANCE") return "MAINTENANCE";
    switch (selectedGate.status) {
      case "GREEN": return "AVAILABLE";
      case "YELLOW": return "CONGESTED";
      case "RED": return "OCCUPIED";
      default: return "UNKNOWN";
    }
  };
  
  return (
    <div
      className="gate-info-modal"
      style={{
        position: "absolute",
        top: "50%",
        right: "20px",
        transform: "translateY(-50%)",
        background: "rgba(0, 0, 0, 0.95)",
        border: "2px solid #00ffff",
        borderRadius: "8px",
        padding: "16px",
        minWidth: "280px",
        maxWidth: "320px",
        zIndex: 1000,
        pointerEvents: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ color: "#00ffff", fontSize: "16px", margin: 0, fontFamily: "'Orbitron', monospace" }}>
          GATE {selectedGate.id}
        </h3>
        <button
          onClick={() => selectGate(null)}
          style={{
            background: "transparent",
            border: "1px solid #ff4444",
            color: "#ff4444",
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          CLOSE
        </button>
      </div>
      
      <div style={{ borderBottom: "1px solid rgba(0, 255, 255, 0.3)", paddingBottom: "12px", marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ color: "#888888", fontSize: "12px" }}>Status:</span>
          <span style={{ color: getStatusColor(), fontWeight: "bold", fontSize: "12px" }}>
            {getStatusText()}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ color: "#888888", fontSize: "12px" }}>City:</span>
          <span style={{ color: "#ffffff", fontSize: "12px" }}>{selectedGate.cityId}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ color: "#888888", fontSize: "12px" }}>Quadrant:</span>
          <span style={{ color: "#ffffff", fontSize: "12px" }}>{selectedGate.quadrant}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#888888", fontSize: "12px" }}>Position:</span>
          <span style={{ color: "#ffffff", fontSize: "12px" }}>{selectedGate.angle.toFixed(1)}° / {selectedGate.distance.toFixed(1)} units</span>
        </div>
      </div>
      
      {assignedAircraft && (
        <div style={{ borderBottom: "1px solid rgba(0, 255, 255, 0.3)", paddingBottom: "12px", marginBottom: "12px" }}>
          <h4 style={{ color: "#ffff00", fontSize: "13px", margin: "0 0 8px 0" }}>
            ASSIGNED AIRCRAFT
          </h4>
          <div style={{ background: "rgba(255, 255, 0, 0.1)", padding: "8px", borderRadius: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: "#ffff00", fontWeight: "bold", fontSize: "12px" }}>{assignedAircraft.id}</span>
              <span style={{ color: "#888888", fontSize: "11px" }}>{assignedAircraft.status.toUpperCase()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#888888", fontSize: "11px" }}>Altitude:</span>
              <span style={{ color: "#ffffff", fontSize: "11px" }}>{assignedAircraft.altitude.toFixed(0)}m</span>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <h4 style={{ color: "#00ffff", fontSize: "13px", margin: "0 0 8px 0" }}>
          QUEUE STATUS
        </h4>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ color: "#888888", fontSize: "12px" }}>Nearby Aircraft (30°):</span>
          <span style={{ color: nearbyAircraft.length > 3 ? "#ffff00" : "#00ff00", fontWeight: "bold", fontSize: "12px" }}>
            {nearbyAircraft.length}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ color: "#888888", fontSize: "12px" }}>In Queue (15°):</span>
          <span style={{ color: queuedAircraft.length > 2 ? "#ff0000" : "#00ff00", fontWeight: "bold", fontSize: "12px" }}>
            {queuedAircraft.length}
          </span>
        </div>
        
        {queuedAircraft.length > 0 && (
          <div style={{ maxHeight: "100px", overflowY: "auto" }}>
            {queuedAircraft.slice(0, 5).map((ac) => (
              <div
                key={ac.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 8px",
                  background: "rgba(0, 255, 255, 0.05)",
                  marginBottom: "2px",
                  borderRadius: "2px",
                  fontSize: "11px",
                }}
              >
                <span style={{ color: "#00ffff" }}>{ac.id}</span>
                <span style={{ color: "#666666" }}>{ac.angleOnRing.toFixed(1)}°</span>
              </div>
            ))}
            {queuedAircraft.length > 5 && (
              <div style={{ color: "#666666", fontSize: "10px", textAlign: "center", marginTop: "4px" }}>
                +{queuedAircraft.length - 5} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CapacityWarnings() {
  const pipelines = useSimulation((state) => state.pipelines);
  const gates = useSimulation((state) => state.gates);
  
  const warnings: { id: string; message: string; severity: "warning" | "critical" }[] = [];
  
  pipelines.forEach((p) => {
    const utilization = (p.currentCount / p.capacity) * 100;
    if (utilization >= 90) {
      warnings.push({
        id: `pipeline-${p.id}`,
        message: `${p.id} Pipeline at ${utilization.toFixed(0)}% capacity - CRITICAL`,
        severity: "critical",
      });
    } else if (utilization >= 75) {
      warnings.push({
        id: `pipeline-${p.id}`,
        message: `${p.id} Pipeline at ${utilization.toFixed(0)}% capacity`,
        severity: "warning",
      });
    }
  });
  
  const cityGateStats = ["San Diego", "Los Angeles"].map((city) => {
    const cityGates = gates.filter((g) => g.cityId === city);
    const occupiedGates = cityGates.filter((g) => g.status === "RED").length;
    const congestedGates = cityGates.filter((g) => g.status === "YELLOW").length;
    const occupiedPercent = (occupiedGates / cityGates.length) * 100;
    
    if (occupiedPercent >= 50) {
      warnings.push({
        id: `city-${city}`,
        message: `${city}: ${occupiedPercent.toFixed(0)}% gates occupied - CRITICAL`,
        severity: "critical",
      });
    } else if (occupiedPercent >= 30 || congestedGates > 20) {
      warnings.push({
        id: `city-${city}`,
        message: `${city}: High gate congestion detected`,
        severity: "warning",
      });
    }
    
    return { city, occupiedPercent, congestedGates };
  });
  
  if (warnings.length === 0) return null;
  
  return (
    <div
      style={{
        position: "absolute",
        top: "70px",
        left: "10px",
        maxWidth: "300px",
        zIndex: 1000,
        pointerEvents: "auto",
      }}
    >
      {warnings.map((warning) => (
        <div
          key={warning.id}
          style={{
            background: warning.severity === "critical"
              ? "rgba(255, 0, 0, 0.2)"
              : "rgba(255, 200, 0, 0.2)",
            border: warning.severity === "critical"
              ? "1px solid #ff4444"
              : "1px solid #ffaa00",
            color: warning.severity === "critical" ? "#ff6666" : "#ffcc00",
            padding: "6px 12px",
            borderRadius: "4px",
            marginBottom: "4px",
            fontSize: "11px",
            fontFamily: "'Orbitron', monospace",
            animation: warning.severity === "critical" ? "pulse 1s infinite" : "none",
          }}
        >
          {warning.message}
        </div>
      ))}
    </div>
  );
}

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
        position: "absolute",
        top: "70px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 20px",
        borderRadius: "4px",
        fontFamily: "'Orbitron', monospace",
        fontSize: "12px",
        fontWeight: "bold",
        letterSpacing: "1px",
        zIndex: 1000,
        animation: isEmergency ? "pulse 1s infinite" : "none",
        background: isEmergency
          ? "linear-gradient(90deg, rgba(255, 0, 0, 0.3), rgba(255, 100, 0, 0.3))"
          : isMaintenance
          ? "linear-gradient(90deg, rgba(255, 200, 0, 0.3), rgba(255, 150, 0, 0.3))"
          : "rgba(0, 255, 255, 0.2)",
        border: isEmergency
          ? "1px solid #ff4444"
          : isMaintenance
          ? "1px solid #ffaa00"
          : "1px solid #00ffff",
        color: isEmergency ? "#ff6666" : isMaintenance ? "#ffcc00" : "#00ffff",
      }}
    >
      {config.alertMessage}
    </div>
  );
}

function Header() {
  const simulationTime = useSimulation((state) => state.simulationTime);
  
  const formattedTime = simulationTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const formattedDate = simulationTime.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  
  return (
    <div className="header">
      <h1>RINGS MULTI-CITY NETWORK SIMULATOR</h1>
      <div className="time-display">
        <span>{formattedDate}</span>
        <span style={{ marginLeft: "12px" }}>{formattedTime}</span>
      </div>
    </div>
  );
}

function ControlPanel() {
  const { isPlaying, speed, play, pause, reset, setSpeed, selectedScenario, setScenario } = useSimulation();
  const config = SCENARIO_CONFIGS[selectedScenario as ScenarioName];
  
  return (
    <div className="control-panel">
      <div className="control-group">
        {isPlaying ? (
          <button onClick={pause}>Pause</button>
        ) : (
          <button onClick={play}>Play</button>
        )}
        <button onClick={reset}>Reset</button>
      </div>
      
      <div className="control-group">
        <span className="control-label">Speed:</span>
        {[1, 2, 4, 10].map((s) => (
          <button
            key={s}
            className={`speed-btn ${speed === s ? "active" : ""}`}
            onClick={() => setSpeed(s)}
          >
            {s}x
          </button>
        ))}
      </div>
      
      <div className="control-group scenario-group">
        <span className="control-label">Scenario:</span>
        <select
          value={selectedScenario}
          onChange={(e) => setScenario(e.target.value)}
        >
          <option value="normal">Normal Operations</option>
          <option value="rush_hour">Rush Hour</option>
          <option value="maintenance">Scheduled Maintenance</option>
          <option value="emergency">Emergency Response</option>
        </select>
        <span className="scenario-description">{config?.description}</span>
      </div>
    </div>
  );
}

function MetricsPanel() {
  const aircraft = useSimulation((state) => state.aircraft);
  const gates = useSimulation((state) => state.gates);
  const pipelines = useSimulation((state) => state.pipelines);
  
  const sdAircraft = aircraft.filter((a) => a.cityId === "San Diego");
  const laAircraft = aircraft.filter((a) => a.cityId === "Los Angeles");
  const pipelineAircraft = aircraft.filter((a) => a.status === "in_pipeline");
  
  const sdGates = gates.filter((g) => g.cityId === "San Diego");
  const laGates = gates.filter((g) => g.cityId === "Los Angeles");
  
  const countByStatus = (gatesArr: typeof gates, status: string) =>
    gatesArr.filter((g) => g.status === status).length;
  
  return (
    <div className="metrics-panel">
      <div className="city-metrics">
        <h3>SAN DIEGO</h3>
        <div className="metric">
          Aircraft in Ring: <span>{sdAircraft.filter((a) => a.status === "in_ring").length}</span>
        </div>
        <div className="metric">
          Descending: <span>{sdAircraft.filter((a) => a.status === "descending").length}</span>
        </div>
        <div className="metric">
          Landed: <span>{sdAircraft.filter((a) => a.status === "landed").length}</span>
        </div>
        <div className="metric">
          Gates (G/Y/R):{" "}
          <span className="gate-green">{countByStatus(sdGates, "GREEN")}</span>/
          <span className="gate-yellow">{countByStatus(sdGates, "YELLOW")}</span>/
          <span className="gate-red">{countByStatus(sdGates, "RED")}</span>
        </div>
      </div>
      
      <div className="pipeline-metrics">
        <h3>PIPELINES</h3>
        {pipelines.map((p) => {
          const utilization = (p.currentCount / p.capacity) * 100;
          let utilizationClass = "green";
          if (utilization > 85) utilizationClass = "red";
          else if (utilization > 70) utilizationClass = "yellow";
          
          return (
            <div key={p.id} className="metric">
              {p.id} Route:{" "}
              <span className={`utilization-${utilizationClass}`}>
                {p.currentCount}/{p.capacity}
              </span>{" "}
              ({utilization.toFixed(0)}%)
            </div>
          );
        })}
        <div className="metric">
          Total in Transit: <span>{pipelineAircraft.length}</span>
        </div>
      </div>
      
      <div className="city-metrics">
        <h3>LOS ANGELES</h3>
        <div className="metric">
          Aircraft in Ring: <span>{laAircraft.filter((a) => a.status === "in_ring").length}</span>
        </div>
        <div className="metric">
          Descending: <span>{laAircraft.filter((a) => a.status === "descending").length}</span>
        </div>
        <div className="metric">
          Landed: <span>{laAircraft.filter((a) => a.status === "landed").length}</span>
        </div>
        <div className="metric">
          Gates (G/Y/R):{" "}
          <span className="gate-green">{countByStatus(laGates, "GREEN")}</span>/
          <span className="gate-yellow">{countByStatus(laGates, "YELLOW")}</span>/
          <span className="gate-red">{countByStatus(laGates, "RED")}</span>
        </div>
      </div>
    </div>
  );
}

function EventLog() {
  const events = useSimulation((state) => state.events);
  
  const getEventColor = (type: string) => {
    switch (type) {
      case "success": return "#00ff00";
      case "warning": return "#ffff00";
      case "error": return "#ff0000";
      default: return "#ffffff";
    }
  };
  
  return (
    <div className="event-log">
      <h3>EVENT LOG</h3>
      <div className="event-list">
        {events.slice(0, 20).map((event) => (
          <div
            key={event.id}
            className="event-item"
            style={{ color: getEventColor(event.type) }}
          >
            <span className="event-time">
              {event.timestamp.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </span>
            <span className="event-message">{event.message}</span>
          </div>
        ))}
        {events.length === 0 && (
          <div className="event-item" style={{ color: "#666666" }}>
            No events yet. Press Play to start simulation.
          </div>
        )}
      </div>
    </div>
  );
}

function StatisticsPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const aircraft = useSimulation((state) => state.aircraft);
  const gates = useSimulation((state) => state.gates);
  const pipelines = useSimulation((state) => state.pipelines);
  const currentStats = useSimulation((state) => state.currentStats);
  
  const inRing = aircraft.filter((a) => a.status === "in_ring").length;
  const descending = aircraft.filter((a) => a.status === "descending").length;
  const landed = aircraft.filter((a) => a.status === "landed").length;
  const ascending = aircraft.filter((a) => a.status === "ascending").length;
  const inPipeline = aircraft.filter((a) => a.status === "in_pipeline").length;
  
  const sdGates = gates.filter((g) => g.cityId === "San Diego");
  const laGates = gates.filter((g) => g.cityId === "Los Angeles");
  const sdOccupied = sdGates.filter((g) => g.status === "RED").length;
  const laOccupied = laGates.filter((g) => g.status === "RED").length;
  const sdUtilization = (sdOccupied / sdGates.length) * 100;
  const laUtilization = (laOccupied / laGates.length) * 100;
  
  const nsUtilization = pipelines.find((p) => p.id === "N-S");
  const ewUtilization = pipelines.find((p) => p.id === "E-W");
  const nsPercent = nsUtilization ? (nsUtilization.currentCount / nsUtilization.capacity) * 100 : 0;
  const ewPercent = ewUtilization ? (ewUtilization.currentCount / ewUtilization.capacity) * 100 : 0;
  
  const totalLandings = currentStats.landingsSD + currentStats.landingsLA;
  const totalDepartures = currentStats.departuresSD + currentStats.departuresLA;
  const throughput = totalLandings + totalDepartures + currentStats.pipelineTransfers;
  
  const getBarColor = (percent: number) => {
    if (percent >= 80) return "#ff4444";
    if (percent >= 60) return "#ffaa00";
    return "#00ff00";
  };
  
  return (
    <div
      style={{
        position: "fixed",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0, 0, 0, 0.9)",
        border: "1px solid #00ffff",
        borderRadius: "8px",
        padding: "12px",
        width: "200px",
        zIndex: 1000,
        pointerEvents: "auto",
        fontSize: "11px",
        maxHeight: collapsed ? "30px" : "600px",
        overflow: collapsed ? "hidden" : "auto",
        transition: "max-height 0.3s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <h3 style={{ color: "#00ffff", fontSize: "13px", margin: 0, borderBottom: "1px solid #00ffff33", paddingBottom: "6px" }}>
          LIVE STATISTICS
        </h3>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "transparent",
            border: "none",
            color: "#00ffff",
            cursor: "pointer",
            fontSize: "12px",
            padding: 0,
          }}
        >
          {collapsed ? "▼" : "▲"}
        </button>
      </div>
      {!collapsed && (
        <>
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: "#888888", marginBottom: "4px" }}>Aircraft Status</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#ffffff" }}>In Ring:</span>
          <span style={{ color: "#00ff00" }}>{inRing}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#ffffff" }}>Descending:</span>
          <span style={{ color: "#ffff00" }}>{descending}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#ffffff" }}>Landed:</span>
          <span style={{ color: "#ff8800" }}>{landed}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#ffffff" }}>Ascending:</span>
          <span style={{ color: "#88ff00" }}>{ascending}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#ffffff" }}>In Pipeline:</span>
          <span style={{ color: "#ff00ff" }}>{inPipeline}</span>
        </div>
      </div>
      
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: "#888888", marginBottom: "4px" }}>Gate Utilization</div>
        <div style={{ marginBottom: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ color: "#ffffff" }}>San Diego:</span>
            <span style={{ color: getBarColor(sdUtilization) }}>{sdUtilization.toFixed(0)}%</span>
          </div>
          <div style={{ background: "#333333", borderRadius: "2px", height: "4px" }}>
            <div style={{ background: getBarColor(sdUtilization), width: `${sdUtilization}%`, height: "100%", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ color: "#ffffff" }}>Los Angeles:</span>
            <span style={{ color: getBarColor(laUtilization) }}>{laUtilization.toFixed(0)}%</span>
          </div>
          <div style={{ background: "#333333", borderRadius: "2px", height: "4px" }}>
            <div style={{ background: getBarColor(laUtilization), width: `${laUtilization}%`, height: "100%", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: "#888888", marginBottom: "4px" }}>Pipeline Load</div>
        <div style={{ marginBottom: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ color: "#ffffff" }}>N-S Route:</span>
            <span style={{ color: getBarColor(nsPercent) }}>{nsPercent.toFixed(0)}%</span>
          </div>
          <div style={{ background: "#333333", borderRadius: "2px", height: "4px" }}>
            <div style={{ background: getBarColor(nsPercent), width: `${nsPercent}%`, height: "100%", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
            <span style={{ color: "#ffffff" }}>E-W Route:</span>
            <span style={{ color: getBarColor(ewPercent) }}>{ewPercent.toFixed(0)}%</span>
          </div>
          <div style={{ background: "#333333", borderRadius: "2px", height: "4px" }}>
            <div style={{ background: getBarColor(ewPercent), width: `${ewPercent}%`, height: "100%", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>
        </div>
      </div>
      
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: "#888888", marginBottom: "4px" }}>Cumulative Statistics</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#ffffff" }}>Total Landings:</span>
          <span style={{ color: "#00ff00" }}>{totalLandings}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#ffffff" }}>Total Departures:</span>
          <span style={{ color: "#ffff00" }}>{totalDepartures}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#ffffff" }}>Pipeline Transfers:</span>
          <span style={{ color: "#ff8800" }}>{currentStats.pipelineTransfers}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#ffffff" }}>Smart Reroutings:</span>
          <span style={{ color: currentStats.reroutings > 0 ? "#ff00ff" : "#666666" }}>{currentStats.reroutings}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #333", paddingTop: "4px", marginTop: "4px" }}>
          <span style={{ color: "#ffffff" }}>Total Throughput:</span>
          <span style={{ color: "#00ffff" }}>{throughput}</span>
        </div>
      </div>
      
      <div>
        <div style={{ color: "#888888", marginBottom: "4px" }}>By City</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#ffffff" }}>SD Landings:</span>
          <span style={{ color: "#00aaff" }}>{currentStats.landingsSD}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#ffffff" }}>LA Landings:</span>
          <span style={{ color: "#00aaff" }}>{currentStats.landingsLA}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
          <span style={{ color: "#ffffff" }}>SD Departures:</span>
          <span style={{ color: "#ffaa00" }}>{currentStats.departuresSD}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#ffffff" }}>LA Departures:</span>
          <span style={{ color: "#ffaa00" }}>{currentStats.departuresLA}</span>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function Footer() {
  const aircraft = useSimulation((state) => state.aircraft);
  const isPlaying = useSimulation((state) => state.isPlaying);
  const speed = useSimulation((state) => state.speed);
  
  return (
    <div className="footer">
      <div className="footer-stats">
        <span>Total Aircraft: {aircraft.length}</span>
        <span>Status: {isPlaying ? "Running" : "Paused"}</span>
        <span>Speed: {speed}x</span>
      </div>
      <div className="footer-controls">
        <span>Controls: Drag to rotate | Scroll to zoom | Shift+Drag to pan</span>
      </div>
    </div>
  );
}

export function HUD() {
  const [showMetrics, setShowMetrics] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  
  return (
    <div className="hud">
      <Header />
      <ScenarioAlert />
      <CapacityWarnings />
      <ControlPanel />
      <StatisticsPanel />
      <GateInfoModal />
      <div className="hud-bottom">
        {showMetrics && <MetricsPanel />}
        {showEvents && <EventLog />}
        
        <div style={{ display: "flex", gap: "8px", padding: "8px", pointerEvents: "auto" }}>
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            style={{ background: showMetrics ? "#00ffff" : "#1a4d4d", border: "1px solid #00ffff", color: showMetrics ? "#000" : "#00ffff" }}
          >
            {showMetrics ? "Hide" : "Show"} Metrics
          </button>
          <button
            onClick={() => setShowEvents(!showEvents)}
            style={{ background: showEvents ? "#00ffff" : "#1a4d4d", border: "1px solid #00ffff", color: showEvents ? "#000" : "#00ffff" }}
          >
            {showEvents ? "Hide" : "Show"} Events
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
