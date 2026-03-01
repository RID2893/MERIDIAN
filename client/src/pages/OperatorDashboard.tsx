import { useState } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "wouter";
import {
  useSimulation, OPERATOR_CONFIGS,
  type OperatorCode, type DAOProposal,
} from "@/lib/stores/useSimulation";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type TabId = "fleet" | "revenue" | "forecast" | "governance" | "compliance";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "fleet",      label: "FLEET",      icon: "◈" },
  { id: "revenue",    label: "REVENUE",    icon: "＄" },
  { id: "forecast",   label: "FORECAST",   icon: "≋" },
  { id: "governance", label: "GOVERNANCE", icon: "⊡" },
  { id: "compliance", label: "COMPLIANCE", icon: "✓" },
];

// Hourly demand multipliers from DemandGenerator.ts
const HOURLY_FORECAST = [
  { hour: "00", flights: 3 },   { hour: "01", flights: 2 },
  { hour: "02", flights: 2 },   { hour: "03", flights: 1 },
  { hour: "04", flights: 1 },   { hour: "05", flights: 1 },
  { hour: "06", flights: 9 },   { hour: "07", flights: 30 },
  { hour: "08", flights: 168 }, { hour: "09", flights: 192 },
  { hour: "10", flights: 120 }, { hour: "11", flights: 108 },
  { hour: "12", flights: 90 },  { hour: "13", flights: 84 },
  { hour: "14", flights: 72 },  { hour: "15", flights: 90 },
  { hour: "16", flights: 150 }, { hour: "17", flights: 246 },
  { hour: "18", flights: 240 }, { hour: "19", flights: 192 },
  { hour: "20", flights: 150 }, { hour: "21", flights: 108 },
  { hour: "22", flights: 48 },  { hour: "23", flights: 12 },
];

const FUEL_ICONS: Record<string, string> = { electric: "⚡", hydrogen: "H₂", jetFuel: "⛽" };
const FUEL_COLORS: Record<string, string> = { electric: "#00ff88", hydrogen: "#44aaff", jetFuel: "#ffaa00" };
const STATUS_COLORS: Record<string, string> = {
  in_ring: "#00ffff", descending: "#ffaa00", landed: "#00ff88",
  in_pipeline: "#aa44ff", ascending: "#ffcc00",
};

const MOCK_PILOTS = [
  { id: "PLT-001", name: "J. Romero",   type: "ATP-eVTOL", medical: "CLASS-I",  expires: "2026-08-15", status: "CURRENT"  },
  { id: "PLT-002", name: "A. Chen",     type: "ATP-eVTOL", medical: "CLASS-I",  expires: "2026-04-22", status: "CURRENT"  },
  { id: "PLT-003", name: "M. Torres",   type: "CPL-eVTOL", medical: "CLASS-II", expires: "2025-12-01", status: "EXPIRED"  },
  { id: "PLT-004", name: "S. Park",     type: "ATP-eVTOL", medical: "CLASS-I",  expires: "2026-11-30", status: "CURRENT"  },
  { id: "PLT-005", name: "R. Patel",    type: "ATP-eVTOL", medical: "CLASS-I",  expires: "2026-03-10", status: "EXPIRING" },
];

const MOCK_MAINTENANCE = [
  { id: "AC-0001", lastMaint: "2026-02-10", nextMaint: "2026-05-10", component: "Battery Pack",   status: "OK"       },
  { id: "AC-0002", lastMaint: "2026-01-25", nextMaint: "2026-04-25", component: "Rotor Assembly", status: "DUE SOON" },
  { id: "AC-0003", lastMaint: "2026-02-15", nextMaint: "2026-05-15", component: "Avionics Suite", status: "OK"       },
  { id: "AC-0004", lastMaint: "2025-12-01", nextMaint: "2026-03-01", component: "Power Train",    status: "OVERDUE"  },
  { id: "AC-0005", lastMaint: "2026-02-20", nextMaint: "2026-05-20", component: "Battery Pack",   status: "OK"       },
];

const card = (color: string): CSSProperties => ({
  background: "rgba(255,255,255,0.03)",
  border: `1px solid ${color}33`,
  borderRadius: "10px",
  padding: "16px",
});

const tableHeader: CSSProperties = {
  padding: "10px 16px",
  background: "rgba(0,255,255,0.05)",
  borderBottom: "1px solid #1a1a2e",
};

const tableRow: CSSProperties = {
  padding: "10px 16px",
  borderBottom: "1px solid #0d0d1a",
  alignItems: "center",
};

// ─── FLEET TAB ────────────────────────────────────────────────────────────────
function FleetTab({ operator }: { operator: OperatorCode | "ALL" }) {
  const aircraft = useSimulation((s) => s.aircraft);
  const filtered = operator === "ALL" ? aircraft : aircraft.filter(a => a.operator === operator);

  const stats = {
    total:      filtered.length,
    airborne:   filtered.filter(a => a.status === "in_ring" || a.status === "ascending" || a.status === "descending").length,
    transit:    filtered.filter(a => a.status === "in_pipeline").length,
    landed:     filtered.filter(a => a.status === "landed").length,
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "TOTAL FLEET",  value: stats.total,    color: "#00ffff" },
          { label: "AIRBORNE",     value: stats.airborne, color: "#00ff88" },
          { label: "IN TRANSIT",   value: stats.transit,  color: "#aa44ff" },
          { label: "LANDED",       value: stats.landed,   color: "#ffaa00" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...card(color), textAlign: "center" }}>
            <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "6px" }}>{label}</div>
            <div style={{ color, fontSize: "28px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "130px 120px 160px 70px 80px 110px 90px", ...tableHeader }}>
          {["AIRCRAFT ID", "STATUS", "LOCATION", "RING", "FUEL", "SOC", "ALT (ft)"].map(h => (
            <div key={h} style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>{h}</div>
          ))}
        </div>
        <div style={{ maxHeight: "460px", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ color: "#444", textAlign: "center", padding: "40px", fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>
              NO AIRCRAFT
            </div>
          ) : filtered.map(ac => {
            const opCfg = OPERATOR_CONFIGS[ac.operator];
            const statusColor = STATUS_COLORS[ac.status] ?? "#555";
            const fuelColor = FUEL_COLORS[ac.fuelType] ?? "#888";
            const location = ac.cityId ?? ac.pipelineId ?? "—";
            const altFt = ac.status === "landed" ? 0 : Math.round(ac.altitude * 625);
            return (
              <div key={ac.id} style={{ display: "grid", gridTemplateColumns: "130px 120px 160px 70px 80px 110px 90px", ...tableRow }}>
                <span style={{ color: opCfg.hex, fontFamily: "'Orbitron', monospace", fontSize: "9px" }}>
                  {ac.id.length > 14 ? ac.id.slice(0, 12) + "…" : ac.id}
                </span>
                <span style={{
                  background: `${statusColor}22`, border: `1px solid ${statusColor}44`,
                  color: statusColor, borderRadius: "4px", padding: "2px 5px",
                  fontSize: "7px", fontFamily: "'Orbitron', monospace", textAlign: "center", display: "inline-block",
                }}>
                  {ac.status.replace("_", " ").toUpperCase()}
                </span>
                <span style={{ color: "#777", fontSize: "9px" }}>
                  {location.length > 18 ? location.slice(0, 16) + "…" : location}
                </span>
                <span style={{ color: "#aaa", fontFamily: "'Orbitron', monospace", fontSize: "11px" }}>R{ac.ringLevel}</span>
                <span style={{ color: fuelColor, fontSize: "11px" }}>{FUEL_ICONS[ac.fuelType]}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ flex: 1, height: "4px", background: "#1a1a2e", borderRadius: "2px" }}>
                    <div style={{ width: `${ac.batterySOC}%`, height: "100%", background: fuelColor, borderRadius: "2px" }} />
                  </div>
                  <span style={{ color: fuelColor, fontSize: "8px", minWidth: "28px" }}>{ac.batterySOC}%</span>
                </div>
                <span style={{ color: "#aaa", fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>
                  {altFt === 0 ? "GRD" : altFt.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── REVENUE TAB ──────────────────────────────────────────────────────────────
function RevenueTab({ operator }: { operator: OperatorCode | "ALL" }) {
  const blockchain = useSimulation((s) => s.blockchain);
  const txs = operator === "ALL" ? blockchain : blockchain.filter(tx => tx.operator === operator);

  const totalEarned = txs.reduce((s, tx) => s + tx.operatorPay, 0);
  const totalMRSS   = txs.reduce((s, tx) => s + tx.aamPay, 0);
  const totalCity   = txs.reduce((s, tx) => s + tx.cityPay, 0);
  const totalGross  = txs.reduce((s, tx) => s + tx.amount, 0);

  const byHourMap = txs.reduce((acc, tx) => {
    const h = tx.timestamp.getHours();
    acc[h] = (acc[h] || 0) + tx.operatorPay;
    return acc;
  }, {} as Record<number, number>);

  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}h`,
    earnings: parseFloat((byHourMap[h] || 0).toFixed(2)),
  })).filter(d => d.earnings > 0);

  const operatorData = Object.entries(
    blockchain.reduce((acc, tx) => {
      acc[tx.operator] = (acc[tx.operator] || 0) + tx.operatorPay;
      return acc;
    }, {} as Record<string, number>)
  ).map(([op, amt]) => ({
    name: op,
    value: parseFloat(amt.toFixed(2)),
    color: OPERATOR_CONFIGS[op as OperatorCode]?.hex ?? "#888",
  })).sort((a, b) => b.value - a.value);

  const splitData = [
    { name: "Operator 70%", value: parseFloat(totalEarned.toFixed(2)), color: "#00ff88" },
    { name: "MRSS 20%",     value: parseFloat(totalMRSS.toFixed(2)),   color: "#00ffff" },
    { name: "City 10%",     value: parseFloat(totalCity.toFixed(2)),    color: "#ffaa00" },
  ];

  const fmt = (n: number) => `$${n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "GROSS REVENUE",         value: totalGross,  color: "#00ffff" },
          { label: "OPERATOR SHARE (70%)",  value: totalEarned, color: "#00ff88" },
          { label: "MRSS SHARE (20%)",      value: totalMRSS,   color: "#4488ff" },
          { label: "CITY SHARE (10%)",      value: totalCity,   color: "#ffaa00" },
        ].map(({ label, value, color }) => (
          <div key={label} style={card(color)}>
            <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "6px" }}>{label}</div>
            <div style={{ color, fontSize: "22px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>{fmt(value)}</div>
            <div style={{ color: "#444", fontSize: "9px", marginTop: "4px" }}>{txs.length} txns</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        {/* Hourly earnings */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", padding: "16px" }}>
          <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "12px" }}>EARNINGS BY HOUR</div>
          {hourlyData.length === 0 ? (
            <div style={{ color: "#333", textAlign: "center", padding: "60px 0", fontSize: "11px" }}>No transactions yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                <XAxis dataKey="hour" tick={{ fill: "#555", fontSize: 8 }} />
                <YAxis tick={{ fill: "#555", fontSize: 8 }} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "#000d1a", border: "1px solid #1a1a2e", borderRadius: "6px" }}
                  labelStyle={{ color: "#00ffff", fontFamily: "'Orbitron', monospace", fontSize: "10px" }}
                  formatter={(v: number) => [`$${v.toFixed(2)}`, "Operator earnings"]}
                />
                <Bar dataKey="earnings" fill="#00ff88" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue split donut */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", padding: "16px" }}>
          <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "12px" }}>REVENUE SPLIT</div>
          {totalGross === 0 ? (
            <div style={{ color: "#333", textAlign: "center", padding: "60px 0", fontSize: "11px" }}>No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={splitData} cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={3} dataKey="value">
                    {splitData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#000d1a", border: "1px solid #1a1a2e", borderRadius: "6px" }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
                {splitData.map(d => (
                  <div key={d.name} style={{ textAlign: "center" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: d.color, margin: "0 auto 4px" }} />
                    <div style={{ color: "#555", fontSize: "8px" }}>{d.name}</div>
                    <div style={{ color: d.color, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>{fmt(d.value)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Operator breakdown — only in ALL view */}
      {operator === "ALL" && operatorData.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", padding: "16px" }}>
          <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "14px" }}>OPERATOR REVENUE BREAKDOWN</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {operatorData.map(({ name, value, color }) => {
              const pct = totalEarned > 0 ? (value / totalEarned) * 100 : 0;
              return (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "32px", color, fontFamily: "'Orbitron', monospace", fontSize: "10px", textAlign: "right" }}>{name}</span>
                  <div style={{ flex: 1, height: "12px", background: "#0d0d1a", borderRadius: "6px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "6px", transition: "width 0.4s" }} />
                  </div>
                  <span style={{ width: "72px", color: "#888", fontSize: "10px", textAlign: "right", fontFamily: "'Orbitron', monospace" }}>{fmt(value)}</span>
                  <span style={{ width: "40px", color: "#555", fontSize: "9px", textAlign: "right" }}>{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FORECAST TAB ─────────────────────────────────────────────────────────────
function ForecastTab() {
  const simulationTime = useSimulation((s) => s.simulationTime);
  const currentHour = simulationTime.getHours();

  const revenueData = HOURLY_FORECAST.map(d => ({
    hour: d.hour,
    flights: d.flights,
    normal:    parseFloat((d.flights * 157.25).toFixed(0)),
    rushHour:  parseFloat((d.flights * 1.77 * 157.25).toFixed(0)),
  }));

  const kpi = [
    { label: "AM PEAK (9 AM)",    value: "192 flt/hr",   sub: "3.20× multiplier",   color: "#ffaa00" },
    { label: "PM PEAK (5 PM)",    value: "246 flt/hr",   sub: "4.10× multiplier",   color: "#ff4444" },
    { label: "DAILY TOTAL (EST)", value: "2,432 flt",    sub: "Normal weekday",      color: "#00ffff" },
    { label: "RUSH FARE",         value: "$278/flt",     sub: "at 1.77× demand",    color: "#00ff88" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {kpi.map(({ label, value, sub, color }) => (
          <div key={label} style={card(color)}>
            <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "4px" }}>{label}</div>
            <div style={{ color, fontSize: "18px", fontFamily: "'Orbitron', monospace", fontWeight: "bold" }}>{value}</div>
            <div style={{ color: "#444", fontSize: "9px", marginTop: "2px" }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
        <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "12px" }}>
          24-HOUR DEMAND CURVE{" "}
          <span style={{ color: "#00ffff" }}>
            — CURRENT: {String(currentHour).padStart(2, "0")}:00
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={HOURLY_FORECAST} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
            <XAxis dataKey="hour" tick={{ fill: "#555", fontSize: 8 }} />
            <YAxis tick={{ fill: "#555", fontSize: 8 }} />
            <Tooltip
              contentStyle={{ background: "#000d1a", border: "1px solid #1a1a2e", borderRadius: "6px" }}
              labelStyle={{ color: "#00ffff", fontFamily: "'Orbitron', monospace", fontSize: "10px" }}
              formatter={(v: number) => [`${v} flt/hr`, "Demand"]}
            />
            <Line type="monotone" dataKey="flights" stroke="#00ffff" strokeWidth={2} dot={false}
              activeDot={{ r: 5, fill: "#00ffff", stroke: "#000d1a", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", padding: "16px" }}>
        <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "12px" }}>PROJECTED HOURLY REVENUE (06:00–23:00)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={revenueData.filter(d => parseInt(d.hour) >= 6)} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
            <XAxis dataKey="hour" tick={{ fill: "#555", fontSize: 8 }} />
            <YAxis tick={{ fill: "#555", fontSize: 8 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#000d1a", border: "1px solid #1a1a2e", borderRadius: "6px" }}
              labelStyle={{ color: "#00ffff", fontFamily: "'Orbitron', monospace", fontSize: "10px" }}
              formatter={(v: number, name: string) => [
                `$${Number(v).toLocaleString()}`,
                name === "normal" ? "Normal" : "Rush Hour",
              ]}
            />
            <Legend wrapperStyle={{ fontSize: "8px", color: "#555", fontFamily: "'Orbitron', monospace" }} />
            <Bar dataKey="normal"   name="Normal"    fill="#00ff88" radius={[2, 2, 0, 0]} opacity={0.85} />
            <Bar dataKey="rushHour" name="Rush Hour" fill="#ffaa00" radius={[2, 2, 0, 0]} opacity={0.65} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── GOVERNANCE TAB ───────────────────────────────────────────────────────────
function ProposalCard({ proposal, onVote }: { proposal: DAOProposal; onVote: (id: string, vote: "yes" | "no") => void }) {
  const total = proposal.yesVotes + proposal.noVotes;
  const yesPct = total > 0 ? (proposal.yesVotes / total) * 100 : 50;
  const isActive = proposal.status === "active";
  const statusColor = proposal.status === "passed" ? "#00ff88" : proposal.status === "failed" ? "#ff4444" : "#00ffff";
  const timerColor = proposal.timeRemaining < 5 ? "#ff4444" : proposal.timeRemaining < 10 ? "#ffaa00" : "#555";

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${isActive ? (proposal.emergencyVote ? "#ff880044" : "#1a1a2e") : statusColor + "33"}`,
      borderRadius: "10px", padding: "16px", marginBottom: "12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>{proposal.id}</span>
            {proposal.emergencyVote && (
              <span style={{ background: "#ff4444", color: "#fff", fontSize: "7px", fontFamily: "'Orbitron', monospace", padding: "1px 5px", borderRadius: "3px" }}>EMERGENCY</span>
            )}
          </div>
          <div style={{ color: "#ccc", fontSize: "13px", fontWeight: "500", marginBottom: "4px" }}>{proposal.title}</div>
          <div style={{ color: "#555", fontSize: "10px" }}>{proposal.description}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "20px" }}>
          {isActive ? (
            <div style={{ color: timerColor, fontFamily: "'Orbitron', monospace", fontSize: "16px", fontWeight: "bold" }}>
              {proposal.timeRemaining}s
            </div>
          ) : (
            <div style={{
              background: `${statusColor}22`, border: `1px solid ${statusColor}44`,
              color: statusColor, fontSize: "9px", fontFamily: "'Orbitron', monospace",
              padding: "3px 10px", borderRadius: "4px",
            }}>
              {proposal.status.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: isActive ? "12px" : 0 }}>
        <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", marginBottom: "5px" }}>
          <div style={{ width: `${yesPct}%`, background: "#00ff88" }} />
          <div style={{ flex: 1, background: "#ff4444" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
          <span style={{ color: "#00ff88" }}>FOR: {proposal.yesVotes} ({yesPct.toFixed(0)}%)</span>
          <span style={{ color: "#ff4444" }}>AGAINST: {proposal.noVotes} ({(100 - yesPct).toFixed(0)}%)</span>
        </div>
      </div>

      {isActive && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => onVote(proposal.id, "yes")}
            style={{
              flex: 1, padding: "9px",
              background: "rgba(0,255,136,0.1)", border: "1px solid #00ff8855",
              color: "#00ff88", borderRadius: "6px", cursor: "pointer",
              fontFamily: "'Orbitron', monospace", fontSize: "9px", letterSpacing: "1px",
            }}
          >▲ FOR</button>
          <button
            onClick={() => onVote(proposal.id, "no")}
            style={{
              flex: 1, padding: "9px",
              background: "rgba(255,68,68,0.1)", border: "1px solid #ff444455",
              color: "#ff6666", borderRadius: "6px", cursor: "pointer",
              fontFamily: "'Orbitron', monospace", fontSize: "9px", letterSpacing: "1px",
            }}
          >▼ AGAINST</button>
        </div>
      )}
    </div>
  );
}

function GovernanceTab() {
  const daoProposals = useSimulation((s) => s.daoProposals);
  const voteOnProposal = useSimulation((s) => s.voteOnProposal);

  const active   = daoProposals.filter(p => p.status === "active");
  const resolved = daoProposals.filter(p => p.status !== "active");

  return (
    <div>
      <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "16px" }}>
        DEMO-COMPRESSED TIMERS: 14s = "14-DAY STANDARD VOTE" · 30s = "30-MIN EMERGENCY VOTE"
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div>
          <div style={{ color: "#aa44ff", fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "2px", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #1a1a2e" }}>
            ACTIVE PROPOSALS ({active.length})
          </div>
          {active.length === 0 ? (
            <div style={{ color: "#333", textAlign: "center", padding: "40px 20px", fontFamily: "'Orbitron', monospace", fontSize: "11px", background: "rgba(255,255,255,0.02)", borderRadius: "10px" }}>
              NO ACTIVE PROPOSALS
            </div>
          ) : active.map(p => <ProposalCard key={p.id} proposal={p} onVote={voteOnProposal} />)}
        </div>

        <div>
          <div style={{ color: "#555", fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "2px", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #1a1a2e" }}>
            RESOLUTION LOG ({resolved.length})
          </div>
          {resolved.length === 0 ? (
            <div style={{ color: "#333", textAlign: "center", padding: "40px 20px", fontFamily: "'Orbitron', monospace", fontSize: "11px", background: "rgba(255,255,255,0.02)", borderRadius: "10px" }}>
              NO RESOLVED PROPOSALS
            </div>
          ) : resolved.map(p => <ProposalCard key={p.id} proposal={p} onVote={voteOnProposal} />)}
        </div>
      </div>
    </div>
  );
}

// ─── COMPLIANCE TAB ───────────────────────────────────────────────────────────
function ComplianceTab() {
  return (
    <div>
      {/* Pilot certifications */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ color: "#00ffff", fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "2px", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #1a1a2e" }}>
          PILOT CERTIFICATIONS
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "90px 140px 120px 110px 120px 100px", ...tableHeader }}>
            {["ID", "PILOT", "CERT TYPE", "MEDICAL", "EXPIRES", "STATUS"].map(h => (
              <div key={h} style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>{h}</div>
            ))}
          </div>
          {MOCK_PILOTS.map(pilot => {
            const sc = pilot.status === "CURRENT" ? "#00ff88" : pilot.status === "EXPIRING" ? "#ffaa00" : "#ff4444";
            return (
              <div key={pilot.id} style={{ display: "grid", gridTemplateColumns: "90px 140px 120px 110px 120px 100px", ...tableRow }}>
                <span style={{ color: "#555", fontFamily: "'Orbitron', monospace", fontSize: "9px" }}>{pilot.id}</span>
                <span style={{ color: "#ccc", fontSize: "11px" }}>{pilot.name}</span>
                <span style={{ color: "#888", fontSize: "10px", fontFamily: "'Orbitron', monospace" }}>{pilot.type}</span>
                <span style={{ color: "#888", fontSize: "10px" }}>{pilot.medical}</span>
                <span style={{ color: sc === "#ff4444" ? "#ff6666" : "#888", fontSize: "10px" }}>{pilot.expires}</span>
                <span style={{
                  background: `${sc}22`, border: `1px solid ${sc}44`, color: sc,
                  fontSize: "8px", fontFamily: "'Orbitron', monospace", padding: "2px 6px",
                  borderRadius: "4px", textAlign: "center", display: "inline-block",
                }}>{pilot.status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Maintenance schedule */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ color: "#00ffff", fontSize: "10px", fontFamily: "'Orbitron', monospace", letterSpacing: "2px", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid #1a1a2e" }}>
          MAINTENANCE SCHEDULE
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1a2e", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "110px 130px 130px 160px 110px", ...tableHeader }}>
            {["AIRCRAFT", "LAST MAINT", "NEXT MAINT", "COMPONENT", "STATUS"].map(h => (
              <div key={h} style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>{h}</div>
            ))}
          </div>
          {MOCK_MAINTENANCE.map(m => {
            const sc = m.status === "OK" ? "#00ff88" : m.status === "DUE SOON" ? "#ffaa00" : "#ff4444";
            return (
              <div key={m.id} style={{ display: "grid", gridTemplateColumns: "110px 130px 130px 160px 110px", ...tableRow }}>
                <span style={{ color: "#00ffff", fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>{m.id}</span>
                <span style={{ color: "#777", fontSize: "10px" }}>{m.lastMaint}</span>
                <span style={{ color: sc === "#ff4444" ? "#ff6666" : "#777", fontSize: "10px" }}>{m.nextMaint}</span>
                <span style={{ color: "#aaa", fontSize: "10px" }}>{m.component}</span>
                <span style={{
                  background: `${sc}22`, border: `1px solid ${sc}44`, color: sc,
                  fontSize: "8px", fontFamily: "'Orbitron', monospace", padding: "2px 6px",
                  borderRadius: "4px", textAlign: "center", display: "inline-block",
                }}>{m.status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAA compliance status */}
      <div style={{
        background: "rgba(0,255,136,0.04)", border: "1px solid #00ff8822",
        borderRadius: "10px", padding: "20px",
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px",
      }}>
        {[
          { label: "FAA 14 CFR PART 135",    value: "COMPLIANT", color: "#00ff88" },
          { label: "MRSS BLOCKCHAIN AUDIT",  value: "CURRENT",   color: "#00ffff" },
          { label: "LIABILITY INSURANCE",    value: "ACTIVE",    color: "#00ff88" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "8px" }}>{label}</div>
            <div style={{
              color, fontFamily: "'Orbitron', monospace", fontSize: "14px",
              background: `${color}11`, border: `1px solid ${color}33`,
              padding: "8px 0", borderRadius: "6px",
            }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export function OperatorDashboard() {
  const [activeTab, setActiveTab]     = useState<TabId>("fleet");
  const [selectedOp, setSelectedOp]   = useState<OperatorCode | "ALL">("ALL");
  const [, navigate]                  = useLocation();
  const isPlaying = useSimulation((s) => s.isPlaying);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#000d1a",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
    }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: "1px solid #0d0d1a",
        background: "#000812", flexShrink: 0,
      }}>
        <div>
          <div style={{ color: "#aa44ff", fontFamily: "'Orbitron', monospace", fontSize: "13px", letterSpacing: "3px" }}>
            MERIDIAN OPS
          </div>
          <div style={{ color: "#334", fontSize: "9px", marginTop: "1px", letterSpacing: "1px" }}>
            OPERATOR PORTAL · MRSS RINGS NETWORK
          </div>
        </div>

        {/* Operator filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace" }}>FILTER</span>
          <div style={{ display: "flex", gap: "4px" }}>
            {(["ALL", "AR", "JB", "WK", "BT", "LL", "VL"] as (OperatorCode | "ALL")[]).map(op => {
              const sel = selectedOp === op;
              const color = op === "ALL" ? "#888" : OPERATOR_CONFIGS[op as OperatorCode].hex;
              return (
                <button
                  key={op}
                  onClick={() => setSelectedOp(op)}
                  style={{
                    padding: "4px 10px", borderRadius: "4px",
                    background: sel ? color + "22" : "transparent",
                    border: `1px solid ${sel ? color : "#333"}`,
                    color: sel ? color : "#555",
                    cursor: "pointer", fontSize: "9px",
                    fontFamily: "'Orbitron', monospace",
                  }}
                >{op}</button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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

      {/* ── TAB BAR ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: "1px solid #0d0d1a", background: "#000812", flexShrink: 0 }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 28px", background: "none", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                borderBottom: `2px solid ${active ? "#aa44ff" : "transparent"}`,
                color: active ? "#aa44ff" : "#444",
                fontFamily: "'Orbitron', monospace", fontSize: "10px", letterSpacing: "1px",
                transition: "color 0.2s",
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {activeTab === "fleet"      && <FleetTab      operator={selectedOp} />}
        {activeTab === "revenue"    && <RevenueTab    operator={selectedOp} />}
        {activeTab === "forecast"   && <ForecastTab   />}
        {activeTab === "governance" && <GovernanceTab />}
        {activeTab === "compliance" && <ComplianceTab />}
      </div>
    </div>
  );
}
