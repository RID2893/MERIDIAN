import { useState } from "react";
import { useSimulation, SCENARIO_CONFIGS, RING_CONFIGS, OPERATOR_CONFIGS, REVENUE_SPLIT, ScenarioName, type OperatorCode, type RingLevel, type FlightRequest, type BlockchainTransaction } from "@/lib/stores/useSimulation";
import { useWeather, type WeatherPreset } from "@/lib/stores/useWeather";

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
  
  const nsPipelines = pipelines.filter((p) => p.id.startsWith("N-S"));
  const ewPipelines = pipelines.filter((p) => p.id.startsWith("E-W"));
  const nsTotalCount = nsPipelines.reduce((sum, p) => sum + p.currentCount, 0);
  const nsTotalCapacity = nsPipelines.reduce((sum, p) => sum + p.capacity, 0);
  const ewTotalCount = ewPipelines.reduce((sum, p) => sum + p.currentCount, 0);
  const ewTotalCapacity = ewPipelines.reduce((sum, p) => sum + p.capacity, 0);
  const nsPercent = nsTotalCapacity ? (nsTotalCount / nsTotalCapacity) * 100 : 0;
  const ewPercent = ewTotalCapacity ? (ewTotalCount / ewTotalCapacity) * 100 : 0;
  
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

function WeatherPanel() {
  const weather = useWeather();
  const [expanded, setExpanded] = useState(false);

  const presets: { key: WeatherPreset; label: string; icon: string; color: string }[] = [
    { key: "clear", label: "CLEAR", icon: "☀", color: "#00ff00" },
    { key: "cloudy", label: "CLOUDY", icon: "☁", color: "#aaaaaa" },
    { key: "rain", label: "RAIN", icon: "🌧", color: "#4488ff" },
    { key: "storm", label: "STORM", icon: "⛈", color: "#ff4444" },
    { key: "snow", label: "SNOW", icon: "❄", color: "#ccddff" },
    { key: "fog", label: "FOG", icon: "🌫", color: "#888888" },
  ];

  const getSafetyColor = (score: number) => {
    if (score >= 80) return "#00ff00";
    if (score >= 50) return "#ffaa00";
    return "#ff4444";
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "120px",
        right: "10px",
        background: "rgba(0, 0, 0, 0.9)",
        border: "1px solid #00ffff",
        borderRadius: "8px",
        padding: "12px",
        width: "220px",
        zIndex: 1000,
        pointerEvents: "auto",
        fontSize: "11px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h3 style={{ color: "#00ffff", fontSize: "13px", margin: 0, fontFamily: "'Orbitron', monospace" }}>
          WEATHER
        </h3>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => weather.setEnabled(!weather.enabled)}
            style={{
              background: weather.enabled ? "rgba(0, 255, 255, 0.2)" : "rgba(255, 0, 0, 0.2)",
              border: `1px solid ${weather.enabled ? "#00ffff" : "#ff4444"}`,
              color: weather.enabled ? "#00ffff" : "#ff4444",
              padding: "2px 8px",
              cursor: "pointer",
              fontSize: "10px",
              borderRadius: "3px",
              fontFamily: "'Orbitron', monospace",
            }}
          >
            {weather.enabled ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "transparent",
              border: "none",
              color: "#00ffff",
              cursor: "pointer",
              fontSize: "12px",
              padding: 0,
            }}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Preset selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", marginBottom: "10px" }}>
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => weather.setPreset(p.key)}
            style={{
              background: weather.activePreset === p.key
                ? "rgba(0, 255, 255, 0.25)"
                : "rgba(255, 255, 255, 0.05)",
              border: weather.activePreset === p.key
                ? "1px solid #00ffff"
                : "1px solid #333355",
              color: weather.activePreset === p.key ? p.color : "#666666",
              padding: "6px 4px",
              cursor: "pointer",
              fontSize: "9px",
              borderRadius: "4px",
              fontFamily: "'Orbitron', monospace",
              textAlign: "center",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: "14px", marginBottom: "2px" }}>{p.icon}</div>
            {p.label}
          </button>
        ))}
      </div>

      {/* Safety score */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ color: "#888888" }}>Safety Score:</span>
        <span style={{ color: getSafetyColor(weather.safetyScore), fontWeight: "bold", fontFamily: "'Orbitron', monospace" }}>
          {weather.safetyScore}/100
        </span>
      </div>
      <div style={{ background: "#333333", borderRadius: "2px", height: "4px", marginBottom: "8px" }}>
        <div style={{
          background: getSafetyColor(weather.safetyScore),
          width: `${weather.safetyScore}%`,
          height: "100%",
          borderRadius: "2px",
          transition: "width 0.3s, background 0.3s",
        }} />
      </div>

      {/* Flight clearance */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 8px",
        background: weather.clearForFlight
          ? "rgba(0, 255, 0, 0.1)"
          : "rgba(255, 0, 0, 0.15)",
        border: `1px solid ${weather.clearForFlight ? "#00ff0066" : "#ff444466"}`,
        borderRadius: "4px",
        marginBottom: expanded ? "10px" : "0",
      }}>
        <span style={{ color: "#888888" }}>Flight Status:</span>
        <span style={{
          color: weather.clearForFlight ? "#00ff00" : "#ff4444",
          fontWeight: "bold",
          fontFamily: "'Orbitron', monospace",
          fontSize: "10px",
        }}>
          {weather.clearForFlight ? "CLEAR" : "GROUNDED"}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: "1px solid #00ffff33", paddingTop: "8px" }}>
          <div style={{ color: "#888888", marginBottom: "6px" }}>Current Conditions</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <span style={{ color: "#ffffff" }}>Visibility:</span>
            <span style={{ color: weather.visibility < 5000 ? "#ffaa00" : "#00ff00" }}>
              {weather.visibility >= 1000 ? `${(weather.visibility / 1000).toFixed(1)} km` : `${weather.visibility} m`}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <span style={{ color: "#ffffff" }}>Wind:</span>
            <span style={{ color: weather.windSpeed > 15 ? "#ff4444" : weather.windSpeed > 10 ? "#ffaa00" : "#00ff00" }}>
              {weather.windSpeed} m/s @ {weather.windDirection}°
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <span style={{ color: "#ffffff" }}>Temperature:</span>
            <span style={{ color: "#ffffff" }}>{weather.temperature}°C</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <span style={{ color: "#ffffff" }}>Cloud Cover:</span>
            <span style={{ color: "#ffffff" }}>{weather.cloudCover}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <span style={{ color: "#ffffff" }}>Precipitation:</span>
            <span style={{ color: weather.precipitation > 0 ? "#4488ff" : "#666666" }}>
              {weather.precipitation > 0 ? `${weather.precipitation} mm/h (${weather.precipitationType})` : "None"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <span style={{ color: "#ffffff" }}>Turbulence:</span>
            <span style={{
              color: weather.turbulence === "SEVERE" ? "#ff4444"
                : weather.turbulence === "MODERATE" ? "#ffaa00"
                : weather.turbulence === "LIGHT" ? "#ffff00"
                : "#00ff00"
            }}>
              {weather.turbulence}
            </span>
          </div>
          {weather.thunderstorm && (
            <div style={{
              marginTop: "6px",
              padding: "4px 8px",
              background: "rgba(255, 0, 0, 0.2)",
              border: "1px solid #ff4444",
              borderRadius: "4px",
              color: "#ff6666",
              textAlign: "center",
              fontFamily: "'Orbitron', monospace",
              fontSize: "10px",
              animation: "pulse 1s infinite",
            }}>
              THUNDERSTORM ACTIVE
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmergencyOverridePanel() {
  const weatherGrounded = useSimulation((state) => state.weatherGrounded);
  const emergencyOverride = useSimulation((state) => state.emergencyOverride);
  const toggleEmergencyOverride = useSimulation((state) => state.toggleEmergencyOverride);

  return (
    <div style={{
      position: 'absolute',
      top: '70px',
      right: '10px',
      zIndex: 1001,
      pointerEvents: 'auto',
    }}>
      {/* Weather grounded indicator */}
      {weatherGrounded && !emergencyOverride && (
        <div style={{
          background: 'rgba(255, 0, 0, 0.25)',
          border: '2px solid #ff4444',
          borderRadius: '6px',
          padding: '8px 14px',
          marginBottom: '8px',
          textAlign: 'center',
          animation: 'pulse 1s infinite',
        }}>
          <div style={{ color: '#ff6666', fontFamily: "'Orbitron', monospace", fontSize: '12px', fontWeight: 'bold' }}>
            WEATHER HOLD ACTIVE
          </div>
          <div style={{ color: '#ff9999', fontSize: '10px', marginTop: '2px' }}>
            Departures & transfers suspended
          </div>
        </div>
      )}

      {/* Emergency override active */}
      {emergencyOverride && (
        <div style={{
          background: 'rgba(255, 100, 0, 0.3)',
          border: '2px solid #ff8800',
          borderRadius: '6px',
          padding: '8px 14px',
          marginBottom: '8px',
          textAlign: 'center',
          animation: 'pulse 0.5s infinite',
        }}>
          <div style={{ color: '#ffaa00', fontFamily: "'Orbitron', monospace", fontSize: '12px', fontWeight: 'bold' }}>
            FAA OVERRIDE ACTIVE
          </div>
          <div style={{ color: '#ffcc66', fontSize: '10px', marginTop: '2px' }}>
            Operations resumed despite weather
          </div>
        </div>
      )}

      {/* Override button */}
      <button
        onClick={toggleEmergencyOverride}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: emergencyOverride
            ? 'linear-gradient(180deg, rgba(255,100,0,0.4), rgba(255,50,0,0.6))'
            : weatherGrounded
            ? 'linear-gradient(180deg, rgba(255,0,0,0.3), rgba(200,0,0,0.5))'
            : 'rgba(40,40,60,0.8)',
          border: emergencyOverride
            ? '2px solid #ff8800'
            : weatherGrounded
            ? '2px solid #ff4444'
            : '1px solid #444466',
          borderRadius: '6px',
          color: emergencyOverride ? '#ffaa00' : weatherGrounded ? '#ff6666' : '#666',
          fontFamily: "'Orbitron', monospace",
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'pointer',
          letterSpacing: '1px',
        }}
      >
        {emergencyOverride ? 'DEACTIVATE OVERRIDE' : 'FAA EMERGENCY OVERRIDE'}
      </button>
    </div>
  );
}

function FlightQueuePanel() {
  const [collapsed, setCollapsed] = useState(true);
  const flightQueue = useSimulation((state) => state.flightQueue);
  const approveFlightRequest = useSimulation((state) => state.approveFlightRequest);
  const denyFlightRequest = useSimulation((state) => state.denyFlightRequest);
  const weatherGrounded = useSimulation((state) => state.weatherGrounded);

  const pendingRequests = flightQueue.filter(r => r.status === 'HOLD' || r.status === 'PENDING');

  if (pendingRequests.length === 0 && !weatherGrounded) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return '#ff4444';
      case 'PRIORITY': return '#ffaa00';
      default: return '#00ffcc';
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '120px',
      right: '10px',
      background: 'rgba(0,0,0,0.92)',
      border: '1px solid #ffaa00',
      borderRadius: '8px',
      padding: '12px',
      width: '260px',
      zIndex: 1000,
      pointerEvents: 'auto',
      fontSize: '11px',
      maxHeight: collapsed ? '30px' : '350px',
      overflow: collapsed ? 'hidden' : 'auto',
      transition: 'max-height 0.3s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ color: '#ffaa00', fontSize: '12px', margin: 0, fontFamily: "'Orbitron', monospace" }}>
          FLIGHT QUEUE ({pendingRequests.length})
        </h3>
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'transparent', border: 'none', color: '#ffaa00', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {!collapsed && (
        <>
          {pendingRequests.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: '10px 0', fontSize: '10px' }}>
              No pending flight requests
            </div>
          ) : (
            pendingRequests.map(req => (
              <div key={req.id} style={{
                background: 'rgba(255,170,0,0.08)',
                border: `1px solid ${getPriorityColor(req.priority)}33`,
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '6px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: OPERATOR_CONFIGS[req.operator].hex, fontWeight: 'bold', fontFamily: "'Courier New', monospace" }}>
                    {req.operator}-{req.aircraftId.slice(-3)}
                  </span>
                  <span style={{
                    color: getPriorityColor(req.priority),
                    fontSize: '9px',
                    fontFamily: "'Orbitron', monospace",
                    border: `1px solid ${getPriorityColor(req.priority)}`,
                    padding: '1px 6px',
                    borderRadius: '3px',
                  }}>
                    {req.priority}
                  </span>
                </div>
                <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '4px' }}>
                  {req.origin === 'San Diego' ? 'SD' : 'LA'} → {req.destination === 'San Diego' ? 'SD' : 'LA'}
                </div>
                <div style={{ color: '#888', fontSize: '9px', marginBottom: '6px' }}>
                  {req.reason}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => approveFlightRequest(req.id)}
                    style={{
                      flex: 1,
                      padding: '4px',
                      background: 'rgba(0,255,0,0.15)',
                      border: '1px solid #00ff00',
                      color: '#00ff00',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px',
                      fontFamily: "'Orbitron', monospace",
                    }}
                  >
                    APPROVE
                  </button>
                  <button
                    onClick={() => denyFlightRequest(req.id)}
                    style={{
                      flex: 1,
                      padding: '4px',
                      background: 'rgba(255,0,0,0.15)',
                      border: '1px solid #ff4444',
                      color: '#ff4444',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '9px',
                      fontFamily: "'Orbitron', monospace",
                    }}
                  >
                    DENY
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

// Per-ring capacity limits from RFI: Ring 1: 50-75, Ring 2: 100-150, Ring 3: 75-100
const RING_CAPACITY: Record<RingLevel, number> = { 1: 75, 2: 150, 3: 100 };
const CORRIDOR_THROUGHPUT: Record<string, number> = { 'N-S': 60, 'E-W': 45 }; // flights/hr

function AirspaceUtilizationPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const aircraft = useSimulation((state) => state.aircraft);
  const pipelines = useSimulation((state) => state.pipelines);

  // Per-ring counts per city
  const ringCounts = (city: string) => {
    const cityAc = aircraft.filter(a => (a.cityId === city || a.originCity === city) && a.status !== 'in_pipeline');
    return ([1, 2, 3] as RingLevel[]).map(r => ({
      ring: r,
      count: cityAc.filter(a => a.ringLevel === r && (a.status === 'in_ring' || a.status === 'ascending')).length,
      capacity: RING_CAPACITY[r],
    }));
  };

  const sdRings = ringCounts("San Diego");
  const laRings = ringCounts("Los Angeles");

  // Corridor throughput
  const nsPipelines = pipelines.filter(p => p.id.startsWith("N-S"));
  const ewPipelines = pipelines.filter(p => p.id.startsWith("E-W"));
  const nsCount = nsPipelines.reduce((s, p) => s + p.currentCount, 0);
  const ewCount = ewPipelines.reduce((s, p) => s + p.currentCount, 0);

  // Fleet mix
  const opCounts: Record<string, number> = {};
  aircraft.forEach(a => { opCounts[a.operator] = (opCounts[a.operator] || 0) + 1; });

  const getBarColor = (pct: number) => pct >= 80 ? '#ff4444' : pct >= 60 ? '#ffaa00' : '#00ff00';

  const RingBar = ({ ring, count, capacity }: { ring: RingLevel; count: number; capacity: number }) => {
    const pct = capacity > 0 ? (count / capacity) * 100 : 0;
    const cfg = RING_CONFIGS[ring];
    const colorHex = `#${cfg.color.toString(16).padStart(6, '0')}`;
    return (
      <div style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
          <span style={{ color: colorHex }}>R{ring}</span>
          <span style={{ color: getBarColor(pct) }}>{count}/{capacity} ({pct.toFixed(0)}%)</span>
        </div>
        <div style={{ background: '#333', borderRadius: '2px', height: '3px' }}>
          <div style={{ background: getBarColor(pct), width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: '2px' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'absolute',
      top: '120px',
      left: '10px',
      background: 'rgba(0,0,0,0.9)',
      border: '1px solid #00ffff',
      borderRadius: '8px',
      padding: '12px',
      width: '240px',
      zIndex: 1000,
      pointerEvents: 'auto',
      fontSize: '11px',
      maxHeight: collapsed ? '30px' : '600px',
      overflow: collapsed ? 'hidden' : 'auto',
      transition: 'max-height 0.3s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ color: '#00ffff', fontSize: '12px', margin: 0, fontFamily: "'Orbitron', monospace" }}>
          AIRSPACE UTILIZATION
        </h3>
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'transparent', border: 'none', color: '#00ffff', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* San Diego Rings */}
          <div style={{ color: '#888', marginBottom: '4px', fontSize: '10px' }}>SAN DIEGO — Ring Occupancy</div>
          {sdRings.map(r => <RingBar key={`sd-${r.ring}`} ring={r.ring} count={r.count} capacity={r.capacity} />)}

          <div style={{ height: '8px' }} />

          {/* LA Rings */}
          <div style={{ color: '#888', marginBottom: '4px', fontSize: '10px' }}>LOS ANGELES — Ring Occupancy</div>
          {laRings.map(r => <RingBar key={`la-${r.ring}`} ring={r.ring} count={r.count} capacity={r.capacity} />)}

          <div style={{ height: '8px' }} />

          {/* Corridor Throughput */}
          <div style={{ color: '#888', marginBottom: '4px', fontSize: '10px' }}>CORRIDOR THROUGHPUT</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ color: '#fff' }}>N-S Corridor:</span>
            <span style={{ color: getBarColor((nsCount / CORRIDOR_THROUGHPUT['N-S']) * 100) }}>
              {nsCount} / {CORRIDOR_THROUGHPUT['N-S']} cap
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#fff' }}>E-W Corridor:</span>
            <span style={{ color: getBarColor((ewCount / CORRIDOR_THROUGHPUT['E-W']) * 100) }}>
              {ewCount} / {CORRIDOR_THROUGHPUT['E-W']} cap
            </span>
          </div>

          <div style={{ height: '8px' }} />

          {/* Fleet Mix */}
          <div style={{ color: '#888', marginBottom: '4px', fontSize: '10px' }}>FLEET MIX — Operator Distribution</div>
          {(Object.keys(OPERATOR_CONFIGS) as OperatorCode[]).map(op => {
            const count = opCounts[op] || 0;
            const pct = aircraft.length > 0 ? (count / aircraft.length) * 100 : 0;
            return (
              <div key={op} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: OPERATOR_CONFIGS[op].hex }} />
                  <span style={{ color: OPERATOR_CONFIGS[op].hex, fontSize: '10px', fontFamily: "'Courier New', monospace" }}>{op}</span>
                </div>
                <span style={{ color: '#aaa', fontSize: '10px' }}>{count} ({pct.toFixed(0)}%)</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function RevenueTicker() {
  const [collapsed, setCollapsed] = useState(true);
  const revenue = useSimulation((state) => state.revenue);

  const fmt = (n: number) => `$${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  return (
    <div style={{
      position: 'absolute',
      bottom: '120px',
      left: '10px',
      background: 'rgba(0,0,0,0.92)',
      border: '1px solid #00ff88',
      borderRadius: '8px',
      padding: '12px',
      width: '240px',
      zIndex: 1000,
      pointerEvents: 'auto',
      fontSize: '11px',
      maxHeight: collapsed ? '30px' : '400px',
      overflow: collapsed ? 'hidden' : 'auto',
      transition: 'max-height 0.3s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ color: '#00ff88', fontSize: '12px', margin: 0, fontFamily: "'Orbitron', monospace" }}>
          REVENUE {fmt(revenue.totalRevenue)}
        </h3>
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'transparent', border: 'none', color: '#00ff88', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Split breakdown */}
          <div style={{ color: '#888', marginBottom: '6px', fontSize: '10px' }}>REVENUE SPLIT MODEL</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ color: '#00ff88' }}>Operators (70%):</span>
            <span style={{ color: '#00ff88', fontFamily: "'Courier New', monospace" }}>{fmt(revenue.operatorShare)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ color: '#4488ff' }}>AAM Institute (20%):</span>
            <span style={{ color: '#4488ff', fontFamily: "'Courier New', monospace" }}>{fmt(revenue.aamShare)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#ffaa00' }}>City Revenue (10%):</span>
            <span style={{ color: '#ffaa00', fontFamily: "'Courier New', monospace" }}>{fmt(revenue.cityShare)}</span>
          </div>

          {/* Split bar visualization */}
          <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ width: '70%', background: '#00ff88' }} />
            <div style={{ width: '20%', background: '#4488ff' }} />
            <div style={{ width: '10%', background: '#ffaa00' }} />
          </div>

          {/* Per-operator revenue */}
          <div style={{ color: '#888', marginBottom: '4px', fontSize: '10px' }}>OPERATOR EARNINGS</div>
          {(Object.keys(OPERATOR_CONFIGS) as OperatorCode[]).map(op => (
            <div key={op} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: OPERATOR_CONFIGS[op].hex }} />
                <span style={{ color: OPERATOR_CONFIGS[op].hex, fontSize: '10px' }}>{op}</span>
              </div>
              <span style={{ color: '#aaa', fontSize: '10px', fontFamily: "'Courier New', monospace" }}>
                {fmt(revenue.byOperator[op] || 0)}
              </span>
            </div>
          ))}

          <div style={{ height: '8px' }} />

          {/* Per-city revenue */}
          <div style={{ color: '#888', marginBottom: '4px', fontSize: '10px' }}>CITY REVENUE</div>
          {Object.entries(revenue.byCity).map(([city, amount]) => (
            <div key={city} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: '#fff', fontSize: '10px' }}>{city === 'San Diego' ? 'SD' : 'LA'}</span>
              <span style={{ color: '#ffaa00', fontSize: '10px', fontFamily: "'Courier New', monospace" }}>
                {fmt(amount)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function BlockchainLedger() {
  const [collapsed, setCollapsed] = useState(true);
  const blockchain = useSimulation((state) => state.blockchain);

  const getTypeLabel = (type: BlockchainTransaction['type']) => {
    switch (type) {
      case 'LANDING_FEE': return 'LND';
      case 'DEPARTURE_FEE': return 'DEP';
      case 'CORRIDOR_TOLL': return 'COR';
    }
  };

  const getTypeColor = (type: BlockchainTransaction['type']) => {
    switch (type) {
      case 'LANDING_FEE': return '#00ff00';
      case 'DEPARTURE_FEE': return '#ffaa00';
      case 'CORRIDOR_TOLL': return '#ff00ff';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '10px',
      background: 'rgba(0,0,0,0.92)',
      border: '1px solid #aa66ff',
      borderRadius: '8px',
      padding: '12px',
      width: '280px',
      zIndex: 1000,
      pointerEvents: 'auto',
      fontSize: '11px',
      maxHeight: collapsed ? '30px' : '350px',
      overflow: collapsed ? 'hidden' : 'auto',
      transition: 'max-height 0.3s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ color: '#aa66ff', fontSize: '12px', margin: 0, fontFamily: "'Orbitron', monospace" }}>
          BLOCKCHAIN LEDGER ({blockchain.length})
        </h3>
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'transparent', border: 'none', color: '#aa66ff', cursor: 'pointer', fontSize: '12px', padding: 0 }}>
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {!collapsed && (
        <>
          {blockchain.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: '10px 0', fontSize: '10px' }}>
              No transactions yet — start simulation
            </div>
          ) : (
            blockchain.slice(0, 20).map(tx => (
              <div key={tx.id} style={{
                background: 'rgba(170,102,255,0.06)',
                border: '1px solid #aa66ff22',
                borderRadius: '4px',
                padding: '6px 8px',
                marginBottom: '4px',
                fontSize: '9px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ color: '#aa66ff', fontFamily: "'Courier New', monospace" }}>
                    {tx.blockHash}
                  </span>
                  <span style={{
                    color: getTypeColor(tx.type),
                    border: `1px solid ${getTypeColor(tx.type)}`,
                    padding: '0 4px',
                    borderRadius: '2px',
                    fontSize: '8px',
                    fontFamily: "'Orbitron', monospace",
                  }}>
                    {getTypeLabel(tx.type)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: OPERATOR_CONFIGS[tx.operator].hex }} />
                    <span style={{ color: OPERATOR_CONFIGS[tx.operator].hex }}>{tx.operator}-{tx.aircraftId.slice(-3)}</span>
                    <span style={{ color: '#666' }}>@</span>
                    <span style={{ color: '#aaa' }}>{tx.city === 'San Diego' ? 'SD' : 'LA'}</span>
                  </div>
                  <span style={{ color: '#00ff88', fontFamily: "'Courier New', monospace", fontWeight: 'bold' }}>
                    ${tx.amount}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', color: '#555', fontSize: '8px' }}>
                  <span>Op: ${tx.operatorPay.toFixed(0)}</span>
                  <span>AAM: ${tx.aamPay.toFixed(0)}</span>
                  <span>City: ${tx.cityPay.toFixed(0)}</span>
                </div>
              </div>
            ))
          )}
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
      <EmergencyOverridePanel />
      <AirspaceUtilizationPanel />
      <WeatherPanel />
      <FlightQueuePanel />
      <RevenueTicker />
      <BlockchainLedger />
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
