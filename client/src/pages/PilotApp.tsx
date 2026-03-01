import { useState } from "react";
import { useLocation } from "wouter";
import { RequestFlight } from "./pilot/RequestFlight";
import { AirspaceStatus } from "./pilot/AirspaceStatus";
import { MyFlights } from "./pilot/MyFlights";
import { WeatherBrief } from "./pilot/WeatherBrief";
import { useSimulation } from "@/lib/stores/useSimulation";
import { useWeather } from "@/lib/stores/useWeather";

type TabId = "request" | "status" | "flights" | "weather";

interface Tab {
  id: TabId;
  icon: string;
  label: string;
}

const TABS: Tab[] = [
  { id: "request", icon: "✈", label: "REQUEST" },
  { id: "status",  icon: "◎", label: "STATUS"  },
  { id: "flights", icon: "◈", label: "FLIGHTS"  },
  { id: "weather", icon: "≋", label: "WEATHER"  },
];

export function PilotApp() {
  const [activeTab, setActiveTab] = useState<TabId>("request");
  const [, navigate] = useLocation();

  const isPlaying = useSimulation((s) => s.isPlaying);
  const weatherGrounded = useSimulation((s) => s.weatherGrounded);
  const blockchain = useSimulation((s) => s.blockchain);
  const weather = useWeather();
  const safetyScore = weather.safetyScore;

  // Tab badge counts
  const badges: Partial<Record<TabId, string>> = {
    flights: blockchain.length > 0 ? String(blockchain.length) : undefined,
    weather: !weather.clearForFlight ? "!" : undefined,
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#000d1a",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', sans-serif",
      maxWidth: "480px",
      margin: "0 auto",
      // Subtle side borders on wide screens
      boxShadow: "0 0 0 1px #0a0a1a",
    }}>

      {/* ── TOP BAR ──────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px 10px",
        borderBottom: "1px solid #0d0d1a",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ color: "#00ffff", fontFamily: "'Orbitron', monospace", fontSize: "12px", letterSpacing: "2px" }}>
            MERIDIAN PILOT
          </div>
          <div style={{ color: "#334", fontSize: "9px", marginTop: "1px", letterSpacing: "1px" }}>
            eVTOL OPERATIONS · MRSS
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Sim status dot */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{
              width: "7px", height: "7px", borderRadius: "50%",
              background: isPlaying ? "#00ff88" : "#444",
              boxShadow: isPlaying ? "0 0 6px #00ff88" : "none",
            }} />
            <span style={{ color: "#444", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>
              {isPlaying ? "LIVE" : "PAUSED"}
            </span>
          </div>

          {/* Back to simulator */}
          <button
            onClick={() => navigate("/")}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid #1a1a2e",
              color: "#555",
              padding: "5px 10px",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "9px",
              fontFamily: "'Orbitron', monospace",
            }}
          >
            ✕ EXIT
          </button>
        </div>
      </div>

      {/* ── SAFETY SCORE STRIP ───────────────────────────────────── */}
      <div style={{
        padding: "8px 16px",
        borderBottom: "1px solid #0d0d1a",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexShrink: 0,
        background: weatherGrounded ? "rgba(255,80,0,0.06)" : "transparent",
      }}>
        <div style={{ flex: 1, height: "3px", background: "#0d0d1a", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${safetyScore}%`,
            background: safetyScore >= 80 ? "#00ff88" : safetyScore >= 50 ? "#ffaa00" : "#ff4444",
            borderRadius: "2px",
            transition: "width 0.4s ease",
          }} />
        </div>
        <span style={{
          color: safetyScore >= 80 ? "#00ff88" : safetyScore >= 50 ? "#ffaa00" : "#ff4444",
          fontFamily: "'Orbitron', monospace",
          fontSize: "9px",
          flexShrink: 0,
        }}>
          {weatherGrounded ? "⚠ HOLD" : `SAFETY ${safetyScore}`}
        </span>
      </div>

      {/* ── CONTENT AREA ─────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        WebkitOverflowScrolling: "touch" as any,
      }}>
        {activeTab === "request" && <RequestFlight />}
        {activeTab === "status"  && <AirspaceStatus />}
        {activeTab === "flights" && <MyFlights />}
        {activeTab === "weather" && <WeatherBrief />}
      </div>

      {/* ── BOTTOM TAB BAR ───────────────────────────────────────── */}
      <div style={{
        display: "flex",
        borderTop: "1px solid #0d0d1a",
        background: "#000812",
        flexShrink: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const badge = badges[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "12px 4px 10px",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "3px",
                position: "relative",
              }}
            >
              {/* Active indicator line */}
              <div style={{
                position: "absolute",
                top: 0,
                left: "20%",
                right: "20%",
                height: "2px",
                borderRadius: "0 0 2px 2px",
                background: active ? "#00ffff" : "transparent",
                transition: "background 0.2s",
              }} />

              {/* Badge */}
              {badge && (
                <div style={{
                  position: "absolute",
                  top: "8px",
                  right: "calc(50% - 14px)",
                  background: badge === "!" ? "#ff4444" : "#00ffff",
                  color: "#000",
                  borderRadius: "8px",
                  fontSize: "7px",
                  fontWeight: "bold",
                  padding: "1px 4px",
                  minWidth: "12px",
                  textAlign: "center",
                }}>
                  {badge}
                </div>
              )}

              <span style={{ fontSize: "18px", lineHeight: 1, color: active ? "#00ffff" : "#444" }}>
                {tab.icon}
              </span>
              <span style={{
                fontSize: "8px",
                fontFamily: "'Orbitron', monospace",
                letterSpacing: "1px",
                color: active ? "#00ffff" : "#444",
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
