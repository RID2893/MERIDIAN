import { useSimulation } from "@/lib/stores/useSimulation";

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
      
      <div className="control-group">
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
  return (
    <div className="hud">
      <Header />
      <ControlPanel />
      <div className="hud-bottom">
        <MetricsPanel />
        <EventLog />
      </div>
      <Footer />
    </div>
  );
}
