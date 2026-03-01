import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "wouter";
import {
  useSimulation, OPERATOR_CONFIGS,
  type OperatorCode, type CityName, type EventLogItem,
} from "@/lib/stores/useSimulation";
import { useWeather } from "@/lib/stores/useWeather";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

type TabId = "heatmap" | "ledger" | "incidents" | "audit" | "override" | "safety";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "heatmap",   label: "HEATMAP",   icon: "◉" },
  { id: "ledger",    label: "LEDGER",    icon: "＄" },
  { id: "incidents", label: "INCIDENTS", icon: "⚠" },
  { id: "audit",     label: "AUDIT",     icon: "◫" },
  { id: "override",  label: "OVERRIDE",  icon: "⛨" },
  { id: "safety",    label: "SAFETY",    icon: "✦" },
];

const ACCENT = "#ff8800";

const card = (color = ACCENT): CSSProperties => ({
  background: "rgba(255,255,255,0.03)",
  border: `1px solid ${color}33`,
  borderRadius: "10px",
  padding: "16px",
});

const th: CSSProperties = {
  padding: "10px 16px",
  background: "rgba(255,136,0,0.06)",
  borderBottom: "1px solid #1a1a2e",
};

const tr: CSSProperties = {
  padding: "10px 16px",
  borderBottom: "1px solid #0d0d1a",
  alignItems: "center",
};

// ─── HEATMAP TAB ──────────────────────────────────────────────────────────────
function HeatmapTab() {
  const aircraft  = useSimulation((s) => s.aircraft);
  const gates     = useSimulation((s) => s.gates);
  const pipelines = useSimulation((s) => s.pipelines);
  const centerPct = useSimulation((s) => s.centerPipelineUtilizationPct);
  const overflow  = useSimulation((s) => s.topPipelineOverflowActive);

  const cities: CityName[] = ["San Diego", "Orange County"];
  const rings = [1, 2, 3] as const;

  function ringCount(city: CityName, ring: number) {
    return aircraft.filter(a => a.cityId === city && a.ringLevel === ring).length;
  }

  function heatColor(count: number, max = 20) {
    const pct = Math.min(count / max, 1);
    if (pct < 0.35) return "#00ff88";
    if (pct < 0.70) return "#ffaa00";
    return "#ff4444";
  }

  function gateStats(city: CityName) {
    const cg = gates.filter(g => g.cityId === city);
    return {
      total:  cg.length,
      green:  cg.filter(g => g.status === "GREEN").length,
      yellow: cg.filter(g => g.status === "YELLOW").length,
      red:    cg.filter(g => g.status === "RED").length,
    };
  }

  return (
    <div>
      {/* Ring heat grid */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "12px" }}>
          RING OCCUPANCY · LIVE AIRCRAFT DENSITY
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {cities.map(city => {
            const gs = gateStats(city);
            const gateUsedPct = gs.total > 0 ? Math.round(((gs.yellow + gs.red) / gs.total) * 100) : 0;
            return (
              <div key={city} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "12px", padding: "16px" }}>
                <div style={{ color: ACCENT, fontFamily: "'Orbitron', monospace", fontSize: "10px", letterSpacing: "2px", marginBottom: "12px" }}>
                  {city.toUpperCase()}
                </div>
                <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                  {rings.map(r => {
                    const n = ringCount(city, r);
                    const col = heatColor(n);
                    const ringLabel = r === 1 ? "CORE" : r === 2 ? "CORRIDOR" : "REGIONAL";
                    return (
                      <div key={r} style={{
                        flex: 1, textAlign: "center",
                        background: `${col}11`, border: `1px solid ${col}44`,
                        borderRadius: "8px", padding: "12px 6px",
                      }}>
                        <div style={{ color: col, fontFamily: "'Orbitron', monospace", fontSize: "22px", fontWeight: "bold" }}>{n}</div>
                        <div style={{ color: "#555", fontSize: "8px", marginTop: "4px" }}>R{r}</div>
                        <div style={{ color: "#444", fontSize: "7px" }}>{ringLabel}</div>
                      </div>
                    );
                  })}
                </div>
                {/* Gate utilization bar */}
                <div style={{ marginBottom: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "#555", fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>GATE UTILIZATION</span>
                    <span style={{ color: "#888", fontSize: "8px" }}>{gateUsedPct}%</span>
                  </div>
                  <div style={{ height: "6px", background: "#0d0d1a", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${(gs.green / gs.total) * 100}%`, background: "#00ff88" }} />
                    <div style={{ width: `${(gs.yellow / gs.total) * 100}%`, background: "#ffaa00" }} />
                    <div style={{ width: `${(gs.red / gs.total) * 100}%`, background: "#ff4444" }} />
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                    {[["GREEN", gs.green, "#00ff88"], ["YELLOW", gs.yellow, "#ffaa00"], ["RED", gs.red, "#ff4444"]].map(([l, v, c]) => (
                      <span key={String(l)} style={{ color: c as string, fontSize: "7px" }}>{l}: {v}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pipeline flow */}
      <div>
        <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "12px" }}>
          INTER-CITY CORRIDOR STATUS
          {overflow && <span style={{ color: "#ff4444", marginLeft: "12px", animation: "pulse 1s infinite" }}>⚠ TOP OVERFLOW ACTIVE</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {pipelines.map(pl => {
            const pct = pl.capacity > 0 ? Math.round((pl.currentCount / pl.capacity) * 100) : 0;
            const col = pct < 60 ? "#00ff88" : pct < 85 ? "#ffaa00" : "#ff4444";
            const isCenterActive = pl.id.includes("CENTER") && pct >= 85;
            return (
              <div key={pl.id} style={{
                display: "flex", alignItems: "center", gap: "10px",
                background: isCenterActive ? "rgba(255,68,68,0.06)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${isCenterActive ? "#ff444433" : "#1a1a2e"}`,
                borderRadius: "8px", padding: "10px 14px",
              }}>
                <span style={{ width: "140px", color: "#666", fontFamily: "'Orbitron', monospace", fontSize: "9px" }}>{pl.id}</span>
                <div style={{ flex: 1, height: "8px", background: "#0d0d1a", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: col, transition: "width 0.4s", borderRadius: "4px" }} />
                </div>
                <span style={{ width: "80px", color: col, fontFamily: "'Orbitron', monospace", fontSize: "9px", textAlign: "right" }}>
                  {pl.currentCount}/{pl.capacity} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "10px", color: "#333", fontSize: "9px", fontFamily: "'Orbitron', monospace", textAlign: "center" }}>
          CENTER UTILIZATION: <span style={{ color: centerPct >= 85 ? "#ff4444" : "#00ff88" }}>{centerPct.toFixed(1)}%</span>
          {centerPct >= 85 && <span style={{ color: "#ff4444" }}> — TOP PIPELINE AUTO-ACTIVATED</span>}
        </div>
      </div>
    </div>
  );
}

// ─── LEDGER TAB ───────────────────────────────────────────────────────────────
function LedgerTab() {
  const blockchain = useSimulation((s) => s.blockchain);
  const revenue    = useSimulation((s) => s.revenue);

  const cities: CityName[] = ["San Diego", "Orange County"];

  const cityTotals = cities.map(city => ({
    city,
    share: blockchain.filter(tx => tx.city === city).reduce((s, tx) => s + tx.cityPay, 0),
    txCount: blockchain.filter(tx => tx.city === city).length,
  }));

  const grandTotal = cityTotals.reduce((s, c) => s + c.share, 0);
  const fmt = (n: number) => `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  // By-operator city pay breakdown for chart
  const chartData = Object.entries(OPERATOR_CONFIGS).map(([op, cfg]) => ({
    name: op,
    SD: parseFloat(blockchain.filter(tx => tx.operator === op && tx.city === "San Diego").reduce((s, tx) => s + tx.cityPay, 0).toFixed(2)),
    OC: parseFloat(blockchain.filter(tx => tx.operator === op && tx.city === "Orange County").reduce((s, tx) => s + tx.cityPay, 0).toFixed(2)),
    color: cfg.hex,
  }));

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
        <div style={{ ...card(), gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "6px" }}>TOTAL MUNICIPAL REVENUE (10% SHARE)</div>
            <div style={{ color: ACCENT, fontSize: "32px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>{fmt(grandTotal)}</div>
          </div>
          <div style={{ color: "#1a1a2e", fontSize: "60px" }}>⛳</div>
        </div>
        {cityTotals.map(({ city, share, txCount }) => (
          <div key={city} style={card()}>
            <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "6px" }}>{city.toUpperCase()}</div>
            <div style={{ color: ACCENT, fontSize: "22px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>{fmt(share)}</div>
            <div style={{ color: "#444", fontSize: "9px", marginTop: "4px" }}>{txCount} transactions</div>
          </div>
        ))}
        <div style={card("#00ffff")}>
          <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "6px" }}>MRSS PLATFORM FEE (20%)</div>
          <div style={{ color: "#00ffff", fontSize: "22px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>
            {fmt(revenue.aamShare)}
          </div>
          <div style={{ color: "#444", fontSize: "9px", marginTop: "4px" }}>MRSS Institute</div>
        </div>
      </div>

      {/* City share by operator chart */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
        <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "12px" }}>CITY SHARE BY OPERATOR</div>
        {blockchain.length === 0 ? (
          <div style={{ color: "#333", textAlign: "center", padding: "40px", fontSize: "11px" }}>No transactions yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 9 }} />
              <YAxis tick={{ fill: "#555", fontSize: 8 }} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#000d1a", border: "1px solid #1a1a2e", borderRadius: "6px" }}
                labelStyle={{ color: ACCENT, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}
                formatter={(v: number, name: string) => [`$${v.toFixed(2)}`, name]}
              />
              <Bar dataKey="SD" name="San Diego" fill="#00ffff" radius={[2, 2, 0, 0]} />
              <Bar dataKey="OC" name="Orange County" fill="#aa44ff" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent city-share transactions */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 120px 100px 100px 120px", ...th }}>
          {["TIMESTAMP", "CITY", "OPERATOR", "CITY SHARE", "TYPE"].map(h => (
            <div key={h} style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>{h}</div>
          ))}
        </div>
        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
          {blockchain.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", padding: "30px", fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>NO TRANSACTIONS</div>
          ) : [...blockchain].reverse().slice(0, 50).map(tx => {
            const typeColor = tx.type === "LANDING_FEE" ? "#00ff88" : tx.type === "DEPARTURE_FEE" ? "#00ffff" : "#ffaa00";
            return (
              <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "160px 120px 100px 100px 120px", ...tr }}>
                <span style={{ color: "#555", fontSize: "9px" }}>{tx.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                <span style={{ color: "#888", fontSize: "9px" }}>{tx.city}</span>
                <span style={{ color: OPERATOR_CONFIGS[tx.operator].hex, fontFamily: "'Orbitron', monospace", fontSize: "9px" }}>{tx.operator}</span>
                <span style={{ color: ACCENT, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>${tx.cityPay.toFixed(2)}</span>
                <span style={{ color: typeColor, fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>{tx.type.replace("_", " ")}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── INCIDENTS TAB ────────────────────────────────────────────────────────────
function IncidentsTab() {
  const events = useSimulation((s) => s.events);
  const [filter, setFilter] = useState<"all" | "warning" | "error">("all");
  const [search, setSearch] = useState("");

  const severityEvents = events.filter(e => e.type === "warning" || e.type === "error");
  const filtered = severityEvents
    .filter(e => filter === "all" || e.type === filter)
    .filter(e => search === "" || e.message.toLowerCase().includes(search.toLowerCase()));

  const typeColor: Record<EventLogItem["type"], string> = {
    info: "#00ffff", success: "#00ff88", warning: "#ffaa00", error: "#ff4444",
  };

  const bySeverity = {
    error:   severityEvents.filter(e => e.type === "error").length,
    warning: severityEvents.filter(e => e.type === "warning").length,
  };

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "TOTAL INCIDENTS", value: severityEvents.length, color: ACCENT },
          { label: "HIGH SEVERITY",   value: bySeverity.error,   color: "#ff4444" },
          { label: "WARNINGS",        value: bySeverity.warning,  color: "#ffaa00" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card(color), textAlign: "center" }}>
            <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "6px" }}>{label}</div>
            <div style={{ color, fontSize: "28px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter + search */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", alignItems: "center" }}>
        {(["all", "warning", "error"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 14px", borderRadius: "4px",
              background: filter === f ? ACCENT + "22" : "transparent",
              border: `1px solid ${filter === f ? ACCENT : "#333"}`,
              color: filter === f ? ACCENT : "#555",
              cursor: "pointer", fontSize: "9px",
              fontFamily: "'Orbitron', monospace",
            }}
          >{f.toUpperCase()}</button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search incidents…"
          style={{
            flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid #1a1a2e",
            borderRadius: "6px", padding: "6px 12px", color: "#aaa",
            fontSize: "10px", outline: "none",
          }}
        />
      </div>

      {/* Incident log */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 90px 1fr", ...th }}>
          {["TIMESTAMP", "SEVERITY", "DESCRIPTION"].map(h => (
            <div key={h} style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>{h}</div>
          ))}
        </div>
        <div style={{ maxHeight: "460px", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", padding: "40px", fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>
              {severityEvents.length === 0 ? "NO INCIDENTS RECORDED" : "NO MATCHES"}
            </div>
          ) : [...filtered].reverse().map(ev => {
            const col = typeColor[ev.type];
            return (
              <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "160px 90px 1fr", ...tr }}>
                <span style={{ color: "#555", fontSize: "9px" }}>
                  {ev.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span style={{
                  background: `${col}22`, border: `1px solid ${col}44`, color: col,
                  fontSize: "7px", fontFamily: "'Orbitron', monospace", padding: "2px 5px",
                  borderRadius: "3px", textAlign: "center", display: "inline-block",
                }}>
                  {ev.type.toUpperCase()}
                </span>
                <span style={{ color: "#888", fontSize: "10px" }}>{ev.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── AUDIT TAB ────────────────────────────────────────────────────────────────
function AuditTab() {
  const blockchain = useSimulation((s) => s.blockchain);
  const [opFilter, setOpFilter] = useState<OperatorCode | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "LANDING_FEE" | "DEPARTURE_FEE" | "CORRIDOR_TOLL">("ALL");

  const filtered = blockchain
    .filter(tx => opFilter === "ALL" || tx.operator === opFilter)
    .filter(tx => typeFilter === "ALL" || tx.type === typeFilter);

  const gross = filtered.reduce((s, tx) => s + tx.amount, 0);
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>OPERATOR</span>
        {(["ALL", "AR", "JB", "WK", "BT", "LL", "VL"] as (OperatorCode | "ALL")[]).map(op => {
          const sel = opFilter === op;
          const color = op === "ALL" ? "#888" : OPERATOR_CONFIGS[op as OperatorCode].hex;
          return (
            <button key={op} onClick={() => setOpFilter(op)} style={{
              padding: "3px 9px", borderRadius: "4px",
              background: sel ? color + "22" : "transparent",
              border: `1px solid ${sel ? color : "#333"}`,
              color: sel ? color : "#555", cursor: "pointer",
              fontSize: "8px", fontFamily: "'Orbitron', monospace",
            }}>{op}</button>
          );
        })}
        <span style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginLeft: "8px" }}>TYPE</span>
        {(["ALL", "LANDING_FEE", "DEPARTURE_FEE", "CORRIDOR_TOLL"] as const).map(t => {
          const sel = typeFilter === t;
          return (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: "3px 9px", borderRadius: "4px",
              background: sel ? ACCENT + "22" : "transparent",
              border: `1px solid ${sel ? ACCENT : "#333"}`,
              color: sel ? ACCENT : "#555", cursor: "pointer",
              fontSize: "8px", fontFamily: "'Orbitron', monospace",
            }}>{t === "ALL" ? "ALL" : t.replace("_", " ")}</button>
          );
        })}
      </div>

      <div style={{ color: "#555", fontSize: "9px", marginBottom: "12px" }}>
        <span style={{ color: ACCENT, fontFamily: "'Orbitron', monospace" }}>{filtered.length}</span> records · gross{" "}
        <span style={{ color: ACCENT, fontFamily: "'Orbitron', monospace" }}>${gross.toFixed(2)}</span>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 60px 100px 80px 70px 70px 70px 1fr", ...th }}>
          {["TIMESTAMP", "OP", "CITY", "TYPE", "GROSS", "OP 70%", "CITY 10%", "BLOCK HASH"].map(h => (
            <div key={h} style={{ color: "#555", fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>{h}</div>
          ))}
        </div>
        <div style={{ maxHeight: "480px", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", padding: "40px", fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>NO RECORDS</div>
          ) : [...filtered].reverse().map(tx => {
            const typeColor = tx.type === "LANDING_FEE" ? "#00ff88" : tx.type === "DEPARTURE_FEE" ? "#00ffff" : "#ffaa00";
            return (
              <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "140px 60px 100px 80px 70px 70px 70px 1fr", ...tr }}>
                <span style={{ color: "#555", fontSize: "8px" }}>
                  {tx.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span style={{ color: OPERATOR_CONFIGS[tx.operator].hex, fontFamily: "'Orbitron', monospace", fontSize: "9px" }}>{tx.operator}</span>
                <span style={{ color: "#777", fontSize: "9px" }}>{tx.city === "San Diego" ? "SD" : "OC"}</span>
                <span style={{ color: typeColor, fontSize: "7px", fontFamily: "'Orbitron', monospace" }}>{tx.type.replace("_", " ")}</span>
                <span style={{ color: "#aaa", fontFamily: "'Orbitron', monospace", fontSize: "9px" }}>{fmt(tx.amount)}</span>
                <span style={{ color: "#00ff88", fontFamily: "'Orbitron', monospace", fontSize: "9px" }}>{fmt(tx.operatorPay)}</span>
                <span style={{ color: ACCENT, fontFamily: "'Orbitron', monospace", fontSize: "9px" }}>{fmt(tx.cityPay)}</span>
                <span style={{ color: "#222", fontSize: "8px", fontFamily: "'Courier New', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tx.blockHash}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── OVERRIDE TAB ─────────────────────────────────────────────────────────────
interface OverrideLogEntry {
  action: "ACTIVATED" | "DEACTIVATED";
  timestamp: Date;
  by: string;
}

const MOCK_OVERRIDE_HISTORY: OverrideLogEntry[] = [
  { action: "ACTIVATED",   timestamp: new Date(Date.now() - 86400000 * 3), by: "FAA-OPS-001" },
  { action: "DEACTIVATED", timestamp: new Date(Date.now() - 86400000 * 3 + 900000), by: "FAA-OPS-001" },
  { action: "ACTIVATED",   timestamp: new Date(Date.now() - 86400000),     by: "FAA-OPS-002" },
  { action: "DEACTIVATED", timestamp: new Date(Date.now() - 86400000 + 1800000), by: "FAA-OPS-002" },
];

function OverrideTab() {
  const emergencyOverride    = useSimulation((s) => s.emergencyOverride);
  const toggleOverride       = useSimulation((s) => s.toggleEmergencyOverride);
  const weatherGrounded      = useSimulation((s) => s.weatherGrounded);
  const [log, setLog]        = useState<OverrideLogEntry[]>(MOCK_OVERRIDE_HISTORY);
  const prevOverride         = useRef(emergencyOverride);

  useEffect(() => {
    if (prevOverride.current !== emergencyOverride) {
      setLog(prev => [...prev, {
        action: emergencyOverride ? "ACTIVATED" : "DEACTIVATED",
        timestamp: new Date(),
        by: "FAA-OPS-LIVE",
      }]);
      prevOverride.current = emergencyOverride;
    }
  }, [emergencyOverride]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Circuit breaker panel */}
        <div style={{
          background: emergencyOverride ? "rgba(255,136,0,0.08)" : "rgba(255,255,255,0.03)",
          border: `2px solid ${emergencyOverride ? "#ff8800" : "#1a1a2e"}`,
          borderRadius: "16px", padding: "32px", textAlign: "center",
        }}>
          <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "2px", marginBottom: "24px" }}>
            FAA EMERGENCY AUTHORITY
          </div>

          {/* Status indicator */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: emergencyOverride ? "#ff8800" : "#0d0d1a",
              border: `4px solid ${emergencyOverride ? "#ff8800" : "#333"}`,
              margin: "0 auto 12px",
              boxShadow: emergencyOverride ? "0 0 30px #ff8800, 0 0 60px #ff880066" : "none",
              transition: "all 0.4s ease",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "30px",
            }}>
              {emergencyOverride ? "⛨" : "○"}
            </div>
            <div style={{
              color: emergencyOverride ? "#ff8800" : "#555",
              fontFamily: "'Orbitron', monospace", fontSize: "13px", letterSpacing: "3px",
            }}>
              {emergencyOverride ? "OVERRIDE ACTIVE" : "STANDBY"}
            </div>
            {weatherGrounded && !emergencyOverride && (
              <div style={{ color: "#ff4444", fontSize: "9px", marginTop: "8px", animation: "pulse 1s infinite" }}>
                ⚠ WEATHER HOLD IN EFFECT
              </div>
            )}
          </div>

          {/* Circuit breaker button */}
          <button
            onClick={toggleOverride}
            style={{
              width: "100%", padding: "18px",
              background: emergencyOverride ? "rgba(255,68,68,0.15)" : "rgba(255,136,0,0.12)",
              border: `2px solid ${emergencyOverride ? "#ff4444" : "#ff8800"}`,
              borderRadius: "10px",
              color: emergencyOverride ? "#ff4444" : "#ff8800",
              cursor: "pointer", fontSize: "12px",
              fontFamily: "'Orbitron', monospace", letterSpacing: "2px",
              transition: "all 0.2s",
            }}
          >
            {emergencyOverride ? "⬛ DEACTIVATE OVERRIDE" : "⚡ ACTIVATE FAA OVERRIDE"}
          </button>

          <div style={{ color: "#333", fontSize: "8px", marginTop: "12px", lineHeight: 1.5 }}>
            Overrides weather grounding and all operator holds.{"\n"}
            All activations are logged to the immutable audit trail.
          </div>
        </div>

        {/* Override authority info */}
        <div>
          <div style={{ ...card(), marginBottom: "16px" }}>
            <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "10px" }}>FAA AUTHORITY BASIS</div>
            {[
              ["Regulation", "14 CFR Part 91.139"],
              ["Authority", "National Airspace System"],
              ["Scope", "SD + OC MRSS Corridor"],
              ["Response Time", "<4.5 seconds"],
              ["Audit Trail", "Blockchain-immutable"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #0d0d1a" }}>
                <span style={{ color: "#444", fontSize: "9px" }}>{k}</span>
                <span style={{ color: "#888", fontSize: "9px", fontFamily: "'Courier New', monospace" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Current conditions */}
          <div style={card("#ff4444")}>
            <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "10px" }}>CURRENT CONDITIONS</div>
            {[
              ["Weather Grounded", weatherGrounded ? "YES" : "NO", weatherGrounded ? "#ff4444" : "#00ff88"],
              ["Override Active", emergencyOverride ? "YES" : "NO", emergencyOverride ? "#ff8800" : "#555"],
            ].map(([k, v, c]) => (
              <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #0d0d1a" }}>
                <span style={{ color: "#444", fontSize: "9px" }}>{k}</span>
                <span style={{ color: c as string, fontFamily: "'Orbitron', monospace", fontSize: "9px", fontWeight: "bold" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Override history log */}
      <div style={{ marginTop: "24px" }}>
        <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "2px", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #1a1a2e" }}>
          OVERRIDE HISTORY LOG ({log.length} entries)
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "220px 140px 1fr", ...th }}>
            {["TIMESTAMP", "ACTION", "AUTHORITY"].map(h => (
              <div key={h} style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>{h}</div>
            ))}
          </div>
          {[...log].reverse().map((entry, i) => {
            const col = entry.action === "ACTIVATED" ? "#ff8800" : "#00ff88";
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "220px 140px 1fr", ...tr }}>
                <span style={{ color: "#555", fontSize: "9px" }}>
                  {entry.timestamp.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span style={{
                  background: `${col}22`, border: `1px solid ${col}44`, color: col,
                  fontSize: "8px", fontFamily: "'Orbitron', monospace", padding: "2px 6px",
                  borderRadius: "3px", textAlign: "center", display: "inline-block",
                }}>{entry.action}</span>
                <span style={{ color: "#666", fontFamily: "'Courier New', monospace", fontSize: "9px" }}>{entry.by}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SAFETY TAB ───────────────────────────────────────────────────────────────
function SafetyTab() {
  const currentStats   = useSimulation((s) => s.currentStats);
  const blockchain     = useSimulation((s) => s.blockchain);
  const aircraft       = useSimulation((s) => s.aircraft);
  const events         = useSimulation((s) => s.events);
  const isPlaying      = useSimulation((s) => s.isPlaying);
  const overflow       = useSimulation((s) => s.topPipelineOverflowActive);
  const weather        = useWeather();

  const totalFlights   = blockchain.length;
  const errorEvents    = events.filter(e => e.type === "error").length;
  const warningEvents  = events.filter(e => e.type === "warning").length;
  const activeAircraft = aircraft.filter(a => a.status !== "landed").length;

  const kpis = [
    { label: "TOTAL FLIGHTS",       value: totalFlights,              color: "#00ffff",   sub: "blockchain-verified" },
    { label: "ACTIVE AIRCRAFT",     value: activeAircraft,            color: "#00ff88",   sub: "airborne + transit" },
    { label: "SEPARATION EVENTS",   value: errorEvents,               color: errorEvents > 0 ? "#ff4444" : "#00ff88", sub: "high-severity alerts" },
    { label: "WARNINGS",            value: warningEvents,             color: warningEvents > 5 ? "#ffaa00" : "#00ff88", sub: "operational warnings" },
    { label: "REROUTINGS",          value: currentStats.reroutings,   color: "#aa44ff",   sub: "conflict resolutions" },
    { label: "PIPELINE OVERFLOWS",  value: overflow ? 1 : 0,          color: overflow ? "#ff4444" : "#00ff88", sub: "center >85% events" },
  ];

  // Severity breakdown pie
  const severityData = [
    { name: "Nominal",   value: events.filter(e => e.type === "info" || e.type === "success").length, color: "#00ff88" },
    { name: "Warning",   value: warningEvents, color: "#ffaa00" },
    { name: "Critical",  value: errorEvents,   color: "#ff4444" },
  ].filter(d => d.value > 0);

  // Traffic by city
  const cityTraffic = [
    { name: "SD Land",   value: currentStats.landingsSD   },
    { name: "SD Dep",    value: currentStats.departuresSD },
    { name: "OC Land",   value: currentStats.landingsLA   },
    { name: "OC Dep",    value: currentStats.departuresLA },
    { name: "Transfers", value: currentStats.pipelineTransfers },
  ];

  return (
    <div>
      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {kpis.map(({ label, value, color, sub }) => (
          <div key={label} style={{ ...card(color), textAlign: "center" }}>
            <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "6px" }}>{label}</div>
            <div style={{ color, fontSize: "26px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>{value}</div>
            <div style={{ color: "#444", fontSize: "8px", marginTop: "4px" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* System status strip */}
      <div style={{
        background: isPlaying ? "rgba(0,255,136,0.05)" : "rgba(255,68,68,0.05)",
        border: `1px solid ${isPlaying ? "#00ff8833" : "#ff444433"}`,
        borderRadius: "10px", padding: "14px 20px", marginBottom: "24px",
        display: "flex", alignItems: "center", gap: "16px",
      }}>
        <div style={{
          width: "10px", height: "10px", borderRadius: "50%",
          background: isPlaying ? "#00ff88" : "#ff4444",
          boxShadow: isPlaying ? "0 0 8px #00ff88" : "none",
          flexShrink: 0,
        }} />
        <div>
          <div style={{ color: isPlaying ? "#00ff88" : "#ff4444", fontFamily: "'Orbitron', monospace", fontSize: "11px", letterSpacing: "2px" }}>
            SYSTEM {isPlaying ? "OPERATIONAL" : "PAUSED"}
          </div>
          <div style={{ color: "#444", fontSize: "9px", marginTop: "2px" }}>
            {isPlaying ? "All rings active · FAA monitoring · MRSS blockchain recording" : "Simulation paused — no new operations"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ color: "#555", fontSize: "8px", fontFamily: "'Orbitron', monospace" }}>WEATHER</div>
          <div style={{ color: weather.safetyScore >= 80 ? "#00ff88" : weather.safetyScore >= 50 ? "#ffaa00" : "#ff4444", fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>
            {weather.clearForFlight ? "CLEAR" : "HOLD"} · {weather.safetyScore}/100
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Traffic breakdown bar chart */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", padding: "16px" }}>
          <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "12px" }}>TRAFFIC OPERATIONS (SESSION)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityTraffic} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 8 }} />
              <YAxis tick={{ fill: "#555", fontSize: 8 }} />
              <Tooltip
                contentStyle={{ background: "#000d1a", border: "1px solid #1a1a2e", borderRadius: "6px" }}
                labelStyle={{ color: ACCENT, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}
              />
              <Bar dataKey="value" name="Operations" fill={ACCENT} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Event severity pie */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", padding: "16px" }}>
          <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "12px" }}>EVENT SEVERITY BREAKDOWN</div>
          {severityData.length === 0 ? (
            <div style={{ color: "#333", textAlign: "center", padding: "60px 0", fontSize: "11px" }}>No events recorded</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={severityData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                    {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#000d1a", border: "1px solid #1a1a2e", borderRadius: "6px" }}
                    formatter={(v: number, name: string) => [v, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
                {severityData.map(d => (
                  <div key={d.name} style={{ textAlign: "center" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: d.color, margin: "0 auto 4px" }} />
                    <div style={{ color: "#555", fontSize: "8px" }}>{d.name}</div>
                    <div style={{ color: d.color, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>{d.value}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function AdminPortal() {
  const [activeTab, setActiveTab] = useState<TabId>("heatmap");
  const [, navigate]              = useLocation();
  const isPlaying                 = useSimulation((s) => s.isPlaying);
  const emergencyOverride         = useSimulation((s) => s.emergencyOverride);
  const events                    = useSimulation((s) => s.events);
  const incidentCount             = events.filter(e => e.type === "warning" || e.type === "error").length;

  const badges: Partial<Record<TabId, string>> = {
    incidents: incidentCount > 0 ? String(incidentCount) : undefined,
    override:  emergencyOverride ? "!" : undefined,
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#000d1a",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
    }}>

      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: "1px solid #0d0d1a",
        background: "#000812", flexShrink: 0,
      }}>
        <div>
          <div style={{ color: ACCENT, fontFamily: "'Orbitron', monospace", fontSize: "13px", letterSpacing: "3px" }}>
            MERIDIAN CONTROL
          </div>
          <div style={{ color: "#334", fontSize: "9px", marginTop: "1px", letterSpacing: "1px" }}>
            CITY / FAA ADMINISTRATION · MRSS RINGS NETWORK
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {emergencyOverride && (
            <span style={{
              background: "rgba(255,136,0,0.2)", border: "1px solid #ff8800",
              color: "#ff8800", padding: "3px 10px", borderRadius: "4px",
              fontSize: "9px", fontFamily: "'Orbitron', monospace",
              animation: "pulse 0.8s infinite",
            }}>
              ⛨ FAA OVERRIDE ACTIVE
            </span>
          )}
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
          <button
            onClick={() => navigate("/")}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid #1a1a2e",
              color: "#555", padding: "5px 12px", borderRadius: "5px",
              cursor: "pointer", fontSize: "9px", fontFamily: "'Orbitron', monospace",
            }}
          >✕ EXIT</button>
        </div>
      </div>

      {/* ── TAB BAR ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: "1px solid #0d0d1a", background: "#000812", flexShrink: 0 }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const badge  = badges[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 24px", background: "none", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                borderBottom: `2px solid ${active ? ACCENT : "transparent"}`,
                color: active ? ACCENT : "#444",
                fontFamily: "'Orbitron', monospace", fontSize: "10px", letterSpacing: "1px",
                transition: "color 0.2s", position: "relative",
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {badge && (
                <span style={{
                  background: badge === "!" ? "#ff4444" : ACCENT,
                  color: "#000", borderRadius: "8px",
                  fontSize: "7px", fontWeight: "bold",
                  padding: "1px 4px", minWidth: "12px", textAlign: "center",
                }}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {activeTab === "heatmap"   && <HeatmapTab   />}
        {activeTab === "ledger"    && <LedgerTab    />}
        {activeTab === "incidents" && <IncidentsTab />}
        {activeTab === "audit"     && <AuditTab     />}
        {activeTab === "override"  && <OverrideTab  />}
        {activeTab === "safety"    && <SafetyTab    />}
      </div>
    </div>
  );
}
