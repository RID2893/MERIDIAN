import { useSimulation, OPERATOR_CONFIGS, type BlockchainTransaction, type OperatorCode } from "@/lib/stores/useSimulation";
import { useState } from "react";

const fmt = (n: number) => `$${n.toFixed(2)}`;

function TxRow({ tx, expanded, onToggle }: { tx: BlockchainTransaction; expanded: boolean; onToggle: () => void }) {
  const opCfg = OPERATOR_CONFIGS[tx.operator];
  const typeColor = tx.type === "LANDING_FEE" ? "#00ff88" : tx.type === "DEPARTURE_FEE" ? "#00ffff" : "#ffaa00";
  const typeLabel = tx.type === "LANDING_FEE" ? "LAND" : tx.type === "DEPARTURE_FEE" ? "DEPART" : "TOLL";

  return (
    <div
      onClick={onToggle}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid #1a1a2e",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "8px",
        cursor: "pointer",
      }}
    >
      {/* Row summary */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: opCfg.hex, flexShrink: 0 }} />
          <span style={{ color: opCfg.hex, fontFamily: "'Orbitron', monospace", fontSize: "10px" }}>{tx.operator}</span>
          <span style={{ color: typeColor, fontSize: "9px", border: `1px solid ${typeColor}44`, padding: "1px 5px", borderRadius: "3px", fontFamily: "'Orbitron', monospace" }}>
            {typeLabel}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#00ff88", fontFamily: "'Orbitron', monospace", fontSize: "12px" }}>{fmt(tx.operatorPay)}</span>
          <span style={{ color: "#444", fontSize: "12px" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      <div style={{ color: "#555", fontSize: "9px", marginTop: "4px" }}>
        {tx.city} · {tx.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #1a1a2e" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px" }}>
            {[
              ["BASE FARE", fmt(tx.baseFare), "#aaa"],
              ["ENERGY", fmt(tx.energySurcharge), "#aaa"],
              ["MULTIPLIER", `${tx.demandMultiplier.toFixed(2)}x`, "#ffcc00"],
              ["TOTAL", fmt(tx.amount), "#00ff88"],
            ].map(([l, v, c]) => (
              <div key={String(l)} style={{ background: "#0a0a1a", borderRadius: "4px", padding: "6px" }}>
                <div style={{ color: "#555", fontSize: "8px", marginBottom: "2px", fontFamily: "'Orbitron', monospace" }}>{l}</div>
                <div style={{ color: c as string, fontSize: "11px", fontFamily: "'Orbitron', monospace" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", marginBottom: "4px" }}>
            {[["YOUR 70%", fmt(tx.operatorPay), "#00ff88"], ["MRSS 20%", fmt(tx.aamPay), "#00ffff"], ["CITY 10%", fmt(tx.cityPay), "#ffaa00"]].map(([l, v, c]) => (
              <div key={String(l)} style={{ textAlign: "center" }}>
                <div style={{ color: "#555" }}>{l}</div>
                <div style={{ color: c as string, fontFamily: "'Orbitron', monospace" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ color: "#333", fontSize: "8px", fontFamily: "'Courier New', monospace", marginTop: "6px", wordBreak: "break-all" }}>
            {tx.blockHash}
          </div>
        </div>
      )}
    </div>
  );
}

export function MyFlights() {
  const blockchain = useSimulation((s) => s.blockchain);
  const revenue = useSimulation((s) => s.revenue);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [filterOp, setFilterOp] = useState<OperatorCode | "ALL">("ALL");

  const filtered = blockchain.filter(tx => filterOp === "ALL" || tx.operator === filterOp);
  const totalEarned = filtered.reduce((s, tx) => s + tx.operatorPay, 0);
  const totalFlights = filtered.length;

  return (
    <div>
      {/* Earnings summary card */}
      <div style={{
        background: "rgba(0,255,136,0.06)",
        border: "1px solid #00ff8833",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "16px",
      }}>
        <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "6px" }}>TOTAL EARNINGS (70% SHARE)</div>
        <div style={{ color: "#00ff88", fontSize: "28px", fontFamily: "'Orbitron', monospace", marginBottom: "4px" }}>
          ${totalEarned.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <div>
            <div style={{ color: "#555", fontSize: "9px" }}>FLIGHTS</div>
            <div style={{ color: "#00ffff", fontFamily: "'Orbitron', monospace", fontSize: "14px" }}>{totalFlights}</div>
          </div>
          <div>
            <div style={{ color: "#555", fontSize: "9px" }}>AVG / FLIGHT</div>
            <div style={{ color: "#00ffff", fontFamily: "'Orbitron', monospace", fontSize: "14px" }}>
              {totalFlights > 0 ? `$${(totalEarned / totalFlights).toFixed(0)}` : "—"}
            </div>
          </div>
          <div>
            <div style={{ color: "#555", fontSize: "9px" }}>MRSS SHARE</div>
            <div style={{ color: "#00ffff", fontFamily: "'Orbitron', monospace", fontSize: "14px" }}>
              ${filtered.reduce((s, tx) => s + tx.aamPay, 0).toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Operator filter chips */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px", flexWrap: "wrap" }}>
        {(["ALL", ...Object.keys(OPERATOR_CONFIGS)] as (OperatorCode | "ALL")[]).map(op => {
          const sel = filterOp === op;
          const color = op === "ALL" ? "#888" : OPERATOR_CONFIGS[op as OperatorCode].hex;
          return (
            <button
              key={op}
              onClick={() => setFilterOp(op)}
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                background: sel ? color + "22" : "transparent",
                border: `1px solid ${sel ? color : "#333"}`,
                color: sel ? color : "#555",
                cursor: "pointer",
                fontSize: "9px",
                fontFamily: "'Orbitron', monospace",
              }}
            >
              {op}
            </button>
          );
        })}
      </div>

      {/* Transactions */}
      {filtered.length === 0 ? (
        <div style={{ color: "#444", fontSize: "12px", textAlign: "center", padding: "40px 0", fontFamily: "'Orbitron', monospace" }}>
          NO FLIGHTS YET
          <div style={{ color: "#333", fontSize: "10px", marginTop: "8px", fontFamily: "'Inter', sans-serif" }}>
            Start the simulation and approve flights to see earnings here
          </div>
        </div>
      ) : (
        filtered.map(tx => (
          <TxRow
            key={tx.id}
            tx={tx}
            expanded={expandedTx === tx.id}
            onToggle={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
          />
        ))
      )}
    </div>
  );
}
