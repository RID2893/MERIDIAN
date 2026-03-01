import { useSimulation, RING_CONFIGS, type RingLevel } from "@/lib/stores/useSimulation";

const RING_CAPACITY: Record<RingLevel, number> = { 1: 75, 2: 150, 3: 100 };

function getBarColor(pct: number) {
  return pct >= 80 ? "#ff4444" : pct >= 60 ? "#ffaa00" : "#00ff88";
}

function RingGauge({ ringLevel, count, capacity, cityColor }: { ringLevel: RingLevel; count: number; capacity: number; cityColor: string }) {
  const pct = capacity > 0 ? (count / capacity) * 100 : 0;
  const cfg = RING_CONFIGS[ringLevel];
  const ringColor = `#${cfg.color.toString(16).padStart(6, "0")}`;
  const radius = 28 + ringLevel * 14;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(pct / 100, 1));

  return (
    <g>
      {/* Track */}
      <circle cx={80} cy={80} r={radius} fill="none" stroke="#1a1a2e" strokeWidth={6} />
      {/* Fill */}
      <circle
        cx={80} cy={80} r={radius} fill="none"
        stroke={getBarColor(pct)} strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 80 80)"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      {/* Label outside */}
      <text x={80 + radius + 10} y={80} fill={ringColor} fontSize="8" fontFamily="'Orbitron', monospace" dominantBaseline="middle">
        R{ringLevel}
      </text>
      <text x={80 + radius + 10} y={90} fill={getBarColor(pct)} fontSize="7" fontFamily="monospace" dominantBaseline="middle">
        {pct.toFixed(0)}%
      </text>
    </g>
  );
}

function CityStatus({ cityId, color }: { cityId: string; color: string }) {
  const aircraft = useSimulation((s) => s.aircraft);
  const pipelines = useSimulation((s) => s.pipelines);

  const ringCounts = ([1, 2, 3] as RingLevel[]).map(r => ({
    ring: r,
    count: aircraft.filter(a => (a.cityId === cityId || a.originCity === cityId) && a.status !== "in_pipeline" && a.ringLevel === r && (a.status === "in_ring" || a.status === "ascending")).length,
    capacity: RING_CAPACITY[r],
  }));
  const totalInCity = aircraft.filter(a => a.cityId === cityId && a.status !== "in_pipeline").length;
  const shortName = cityId === "San Diego" ? "SAN DIEGO" : "ORANGE CO";

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}22`, borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ color, fontFamily: "'Orbitron', monospace", fontSize: "11px", letterSpacing: "1px" }}>{shortName}</span>
        <span style={{ color: "#888", fontSize: "10px" }}>{totalInCity} aircraft</span>
      </div>

      {/* Concentric ring SVG */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
        <svg width={160} height={160} viewBox="0 0 160 160">
          <circle cx={80} cy={80} r={8} fill={color} opacity={0.3} />
          <text x={80} y={83} fill={color} fontSize="7" fontFamily="'Orbitron', monospace" textAnchor="middle" dominantBaseline="middle">
            {shortName.slice(0, 2)}
          </text>
          {ringCounts.map(({ ring, count, capacity }) => (
            <RingGauge key={ring} ringLevel={ring} count={count} capacity={capacity} cityColor={color} />
          ))}
        </svg>
      </div>

      {/* Ring bars */}
      {ringCounts.map(({ ring, count, capacity }) => {
        const pct = capacity > 0 ? (count / capacity) * 100 : 0;
        const cfg = RING_CONFIGS[ring];
        const ringColor = `#${cfg.color.toString(16).padStart(6, "0")}`;
        return (
          <div key={ring} style={{ marginBottom: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginBottom: "2px" }}>
              <span style={{ color: ringColor }}>Ring {ring} · {cfg.altitude}ft</span>
              <span style={{ color: getBarColor(pct) }}>{count}/{capacity} ({pct.toFixed(0)}%)</span>
            </div>
            <div style={{ background: "#1a1a2e", borderRadius: "2px", height: "3px" }}>
              <div style={{ background: getBarColor(pct), width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: "2px", transition: "width 0.5s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AirspaceStatus() {
  const aircraft = useSimulation((s) => s.aircraft);
  const pipelines = useSimulation((s) => s.pipelines);
  const centerPct = useSimulation((s) => s.centerPipelineUtilizationPct);
  const overflow = useSimulation((s) => s.topPipelineOverflowActive);
  const weatherGrounded = useSimulation((s) => s.weatherGrounded);

  const nsCount = pipelines.filter(p => p.id.startsWith("N-S")).reduce((s, p) => s + p.currentCount, 0);
  const ewCount = pipelines.filter(p => p.id.startsWith("E-W")).reduce((s, p) => s + p.currentCount, 0);
  const inTransit = aircraft.filter(a => a.status === "in_pipeline").length;

  return (
    <div>
      {/* Global status banner */}
      <div style={{
        background: weatherGrounded ? "rgba(255,80,0,0.1)" : "rgba(0,255,136,0.06)",
        border: `1px solid ${weatherGrounded ? "#ff550044" : "#00ff8833"}`,
        borderRadius: "8px",
        padding: "10px 14px",
        marginBottom: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ color: weatherGrounded ? "#ff7722" : "#00ff88", fontFamily: "'Orbitron', monospace", fontSize: "10px", letterSpacing: "1px" }}>
          {weatherGrounded ? "⚠ WEATHER HOLD" : "✓ AIRSPACE OPEN"}
        </span>
        <span style={{ color: "#555", fontSize: "10px" }}>{aircraft.length} total aircraft</span>
      </div>

      <CityStatus cityId="San Diego" color="#00ffff" />
      <CityStatus cityId="Orange County" color="#8866ff" />

      {/* Corridor status */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #ff00ff22", borderRadius: "12px", padding: "16px" }}>
        <div style={{ color: "#ff00ff", fontFamily: "'Orbitron', monospace", fontSize: "11px", letterSpacing: "1px", marginBottom: "12px" }}>
          INTER-CITY CORRIDORS
        </div>
        {[
          { label: "N-S PIPELINE", count: nsCount, cap: 60, color: "#ff00ff" },
          { label: "E-W PIPELINE", count: ewCount, cap: 45, color: "#00ffff" },
        ].map(({ label, count, cap, color }) => {
          const pct = (count / cap) * 100;
          return (
            <div key={label} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginBottom: "3px" }}>
                <span style={{ color }}>{label}</span>
                <span style={{ color: getBarColor(pct) }}>{count}/{cap} · {pct.toFixed(0)}%</span>
              </div>
              <div style={{ background: "#1a1a2e", borderRadius: "2px", height: "4px" }}>
                <div style={{ background: color, width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: "2px", transition: "width 0.5s" }} />
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <span style={{ color: "#555", fontSize: "9px" }}>CENTER PIPELINE: {centerPct}%</span>
          {overflow && (
            <span style={{ background: "rgba(255,170,0,0.15)", border: "1px solid #ffaa0055", color: "#ffcc00", padding: "1px 6px", borderRadius: "3px", fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>
              OVERFLOW
            </span>
          )}
        </div>
        <div style={{ marginTop: "8px", color: "#555", fontSize: "9px" }}>{inTransit} aircraft in transit</div>
      </div>
    </div>
  );
}
