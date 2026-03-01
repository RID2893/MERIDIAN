import { useWeather } from "@/lib/stores/useWeather";
import { useSimulation } from "@/lib/stores/useSimulation";

function ScoreRing({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - score / 100);
  const color = score >= 80 ? "#00ff88" : score >= 50 ? "#ffaa00" : "#ff4444";

  return (
    <svg width={110} height={110} viewBox="0 0 110 110" style={{ display: "block", margin: "0 auto" }}>
      <circle cx={55} cy={55} r={radius} fill="none" stroke="#1a1a2e" strokeWidth={8} />
      <circle
        cx={55} cy={55} r={radius} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={55} y={50} fill={color} fontSize="22" fontFamily="'Orbitron', monospace" textAnchor="middle" dominantBaseline="middle" fontWeight="bold">
        {score}
      </text>
      <text x={55} y={68} fill="#555" fontSize="8" fontFamily="'Orbitron', monospace" textAnchor="middle" dominantBaseline="middle">
        SAFETY
      </text>
    </svg>
  );
}

function CondRow({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #0d0d1a" }}>
      <span style={{ color: "#555", fontSize: "10px", fontFamily: "'Orbitron', monospace" }}>{label}</span>
      <span style={{ color: warn ? "#ffaa00" : "#ccc", fontSize: "10px", fontFamily: "'Courier New', monospace" }}>{value}</span>
    </div>
  );
}

const PRESET_NAMES: Record<string, string> = {
  clear: "CLEAR", cloudy: "CLOUDY", rain: "RAIN", storm: "STORM", snow: "SNOW", fog: "FOG",
};

export function WeatherBrief() {
  const weather = useWeather();
  const { setPreset, toggleWeather } = useWeather();
  const weatherGrounded = useSimulation((s) => s.weatherGrounded);
  const emergencyOverride = useSimulation((s) => s.emergencyOverride);

  const clearanceColor = weather.clearForFlight || emergencyOverride ? "#00ff88" : "#ff4444";
  const clearanceLabel = emergencyOverride ? "OVERRIDE — CLEARED" : weather.clearForFlight ? "CLEAR FOR FLIGHT" : "GROUNDED";

  return (
    <div>
      {/* Clearance status */}
      <div style={{
        background: `${clearanceColor}11`,
        border: `2px solid ${clearanceColor}44`,
        borderRadius: "12px",
        padding: "16px",
        textAlign: "center",
        marginBottom: "16px",
      }}>
        <div style={{ color: clearanceColor, fontFamily: "'Orbitron', monospace", fontSize: "16px", letterSpacing: "2px", marginBottom: "4px" }}>
          {clearanceLabel}
        </div>
        <div style={{ color: "#555", fontSize: "10px" }}>
          {weatherGrounded && !emergencyOverride ? "New departures suspended" : "Operations normal"}
        </div>
      </div>

      {/* Safety score ring */}
      <div style={{ marginBottom: "16px" }}>
        <ScoreRing score={weather.safetyScore} />
        <div style={{ textAlign: "center", marginTop: "6px", color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>
          SAFETY SCORE
        </div>
      </div>

      {/* Conditions */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1a1a2e", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
        <CondRow label="VISIBILITY" value={`${weather.visibility.toFixed(1)} mi`} warn={weather.visibility < 3} />
        <CondRow label="WIND SPEED" value={`${weather.windSpeed.toFixed(0)} kts`} warn={weather.windSpeed > 25} />
        <CondRow label="WIND DIR" value={`${weather.windDirection}°`} />
        <CondRow label="CLOUD COVER" value={`${weather.cloudCover.toFixed(0)}%`} warn={weather.cloudCover > 80} />
        <CondRow label="PRECIPITATION" value={`${weather.precipitation.toFixed(0)}%`} warn={weather.precipitation > 60} />
        <CondRow label="PRECIP TYPE" value={weather.precipitationType.toUpperCase()} />
        {weather.thunderstorm && (
          <CondRow label="THUNDERSTORM" value="ACTIVE" warn />
        )}
      </div>

      {/* Weather presets */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "2px", marginBottom: "8px" }}>
          QUICK SET
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
          {["clear", "cloudy", "rain", "storm", "snow", "fog"].map(preset => {
            const colors: Record<string, string> = { clear: "#00ff88", cloudy: "#888888", rain: "#4488ff", storm: "#ff4444", snow: "#88ddff", fog: "#aaaaaa" };
            const icons: Record<string, string> = { clear: "☀", cloudy: "☁", rain: "🌧", storm: "⛈", snow: "❄", fog: "🌫" };
            const col = colors[preset];
            return (
              <button
                key={preset}
                onClick={() => setPreset(preset as any)}
                style={{
                  padding: "10px 6px",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${col}44`,
                  borderRadius: "8px",
                  color: col,
                  cursor: "pointer",
                  fontSize: "9px",
                  fontFamily: "'Orbitron', monospace",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span style={{ fontSize: "16px" }}>{icons[preset]}</span>
                <span>{PRESET_NAMES[preset]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Enable/disable toggle */}
      <button
        onClick={toggleWeather}
        style={{
          width: "100%",
          padding: "12px",
          background: weather.enabled ? "rgba(255,68,68,0.08)" : "rgba(0,255,136,0.08)",
          border: `1px solid ${weather.enabled ? "#ff4444" : "#00ff88"}55`,
          borderRadius: "8px",
          color: weather.enabled ? "#ff6666" : "#00ff88",
          cursor: "pointer",
          fontSize: "10px",
          fontFamily: "'Orbitron', monospace",
          letterSpacing: "1px",
        }}
      >
        {weather.enabled ? "DISABLE WEATHER SYSTEM" : "ENABLE WEATHER SYSTEM"}
      </button>
    </div>
  );
}
