import { useState, useEffect } from "react";
import { useSimulation, OPERATOR_CONFIGS, calculateFare, type OperatorCode, type CityName } from "@/lib/stores/useSimulation";

type Step = "operator" | "route" | "time" | "confirm" | "result";
type TimeOption = "now" | "+30min" | "+1hr";
type ResultStatus = "APPROVED" | "QUEUED" | "DENIED";

const CITIES: CityName[] = ["San Diego", "Orange County"];
const TIME_OPTIONS: TimeOption[] = ["now", "+30min", "+1hr"];

const BTN = (onClick: () => void, label: string, color = "#00ffff", disabled = false) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      width: "100%",
      padding: "14px",
      background: disabled ? "rgba(255,255,255,0.04)" : `${color}18`,
      border: `1px solid ${disabled ? "#333" : color + "66"}`,
      color: disabled ? "#444" : color,
      borderRadius: "8px",
      cursor: disabled ? "default" : "pointer",
      fontSize: "12px",
      letterSpacing: "2px",
      fontFamily: "'Orbitron', monospace",
      marginBottom: "8px",
      transition: "all 0.2s",
    }}
  >
    {label}
  </button>
);

export function RequestFlight() {
  const [step, setStep] = useState<Step>("operator");
  const [selectedOp, setSelectedOp] = useState<OperatorCode | null>(null);
  const [origin, setOrigin] = useState<CityName>("San Diego");
  const [destination, setDestination] = useState<CityName>("Orange County");
  const [timeOption, setTimeOption] = useState<TimeOption>("now");
  const [result, setResult] = useState<ResultStatus | null>(null);
  const [reqId, setReqId] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  const requestFlight = useSimulation((s) => s.requestFlight);
  const flightQueue = useSimulation((s) => s.flightQueue);
  const selectedScenario = useSimulation((s) => s.selectedScenario as any);
  const weatherGrounded = useSimulation((s) => s.weatherGrounded);
  const emergencyOverride = useSimulation((s) => s.emergencyOverride);

  const fare = calculateFare(selectedScenario);

  // Watch for approval/denial of our submitted request
  useEffect(() => {
    if (!reqId) return;
    const req = flightQueue.find(r => r.id === reqId);
    if (req && (req.status === "APPROVED" || req.status === "DENIED")) {
      setResult(req.status as ResultStatus);
      setProcessing(false);
    }
  }, [flightQueue, reqId]);

  const handleConfirm = () => {
    if (!selectedOp) return;
    setProcessing(true);
    const id = requestFlight(selectedOp, origin, destination);
    setReqId(id);
    setStep("result");

    // Simulate 4.5-sec processing — auto-approve unless weather grounded
    setTimeout(() => {
      const isGrounded = weatherGrounded && !emergencyOverride;
      setResult(isGrounded ? "QUEUED" : "APPROVED");
      setProcessing(false);
    }, 4500);
  };

  const handleReset = () => {
    setStep("operator");
    setSelectedOp(null);
    setOrigin("San Diego");
    setDestination("Orange County");
    setTimeOption("now");
    setResult(null);
    setReqId("");
    setProcessing(false);
  };

  // ─── Step: OPERATOR SELECT ───────────────────────────────────
  if (step === "operator") {
    return (
      <div>
        <StepHeader label="SELECT OPERATOR" step={1} total={4} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {(Object.entries(OPERATOR_CONFIGS) as [OperatorCode, typeof OPERATOR_CONFIGS[OperatorCode]][]).map(([code, cfg]) => (
            <button
              key={code}
              onClick={() => { setSelectedOp(code); setStep("route"); }}
              style={{
                padding: "18px 10px",
                background: "rgba(255,255,255,0.04)",
                border: `2px solid ${cfg.hex}44`,
                borderRadius: "10px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s",
              }}
            >
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: cfg.hex + "33", border: `2px solid ${cfg.hex}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: cfg.hex, fontFamily: "'Orbitron', monospace", fontSize: "11px", fontWeight: 700 }}>{code}</span>
              </div>
              <span style={{ color: "#ccc", fontSize: "9px", textAlign: "center", lineHeight: 1.3, fontFamily: "'Inter', sans-serif" }}>
                {cfg.name.split(" ").slice(0, 2).join("\n")}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Step: ROUTE SELECT ──────────────────────────────────────
  if (step === "route") {
    return (
      <div>
        <StepHeader label="SELECT ROUTE" step={2} total={4} onBack={() => setStep("operator")} />
        <div style={{ marginBottom: "20px" }}>
          <Label>ORIGIN</Label>
          <div style={{ display: "flex", gap: "8px" }}>
            {CITIES.map(c => (
              <CityChip key={c} city={c} selected={origin === c} onSelect={() => {
                setOrigin(c);
                setDestination(c === "San Diego" ? "Orange County" : "San Diego");
              }} />
            ))}
          </div>
        </div>
        <div style={{ textAlign: "center", color: "#00ffff", fontSize: "20px", margin: "8px 0" }}>↓</div>
        <div style={{ marginBottom: "24px" }}>
          <Label>DESTINATION</Label>
          <div style={{ display: "flex", gap: "8px" }}>
            {CITIES.map(c => (
              <CityChip key={c} city={c} selected={destination === c} onSelect={() => {
                setDestination(c);
                setOrigin(c === "San Diego" ? "Orange County" : "San Diego");
              }} />
            ))}
          </div>
        </div>
        <div style={{ background: "rgba(0,255,255,0.06)", border: "1px solid #00ffff22", borderRadius: "8px", padding: "12px", marginBottom: "20px" }}>
          <div style={{ color: "#888", fontSize: "10px", marginBottom: "4px" }}>ESTIMATED FARE</div>
          <div style={{ color: "#00ff88", fontSize: "22px", fontFamily: "'Orbitron', monospace" }}>${fare.total.toFixed(2)}</div>
          <div style={{ color: "#555", fontSize: "9px" }}>${fare.baseFare.toFixed(2)} base + ${fare.energySurcharge.toFixed(2)} energy × {fare.demandMultiplier.toFixed(2)}x</div>
        </div>
        {BTN(() => setStep("time"), "CONTINUE →", "#00ffff", origin === destination)}
      </div>
    );
  }

  // ─── Step: TIME SELECT ───────────────────────────────────────
  if (step === "time") {
    return (
      <div>
        <StepHeader label="DEPARTURE TIME" step={3} total={4} onBack={() => setStep("route")} />
        {TIME_OPTIONS.map(t => (
          <button
            key={t}
            onClick={() => setTimeOption(t)}
            style={{
              width: "100%",
              padding: "16px",
              marginBottom: "10px",
              background: timeOption === t ? "rgba(0,255,255,0.12)" : "rgba(255,255,255,0.04)",
              border: `2px solid ${timeOption === t ? "#00ffff" : "#333"}`,
              borderRadius: "8px",
              cursor: "pointer",
              color: timeOption === t ? "#00ffff" : "#888",
              fontSize: "14px",
              fontFamily: "'Orbitron', monospace",
              letterSpacing: "1px",
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{t === "now" ? "DEPART NOW" : `DEPART IN ${t.replace("+", "")}`}</span>
            {timeOption === t && <span style={{ fontSize: "16px" }}>✓</span>}
          </button>
        ))}
        <div style={{ height: "12px" }} />
        {BTN(() => setStep("confirm"), "REVIEW REQUEST →", "#00ffff")}
      </div>
    );
  }

  // ─── Step: CONFIRM ───────────────────────────────────────────
  if (step === "confirm") {
    const opCfg = OPERATOR_CONFIGS[selectedOp!];
    return (
      <div>
        <StepHeader label="CONFIRM FLIGHT" step={4} total={4} onBack={() => setStep("time")} />
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #333", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
          {[
            ["OPERATOR", <span style={{ color: opCfg.hex, fontWeight: "bold" }}>{selectedOp} — {opCfg.name}</span>],
            ["ROUTE", `${origin === "San Diego" ? "SD" : "OC"} → ${destination === "San Diego" ? "SD" : "OC"}`],
            ["DEPARTURE", timeOption === "now" ? "Immediate" : timeOption],
            ["CORRIDOR", origin === "San Diego" ? "N-S Pipeline" : "E-W Pipeline"],
            ["PRIORITY", "NORMAL"],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1a1a2e" }}>
              <span style={{ color: "#666", fontSize: "10px", fontFamily: "'Orbitron', monospace" }}>{label}</span>
              <span style={{ color: "#ccc", fontSize: "11px" }}>{value as any}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 0" }}>
            <span style={{ color: "#00ff88", fontSize: "12px", fontFamily: "'Orbitron', monospace" }}>TOTAL FARE</span>
            <span style={{ color: "#00ff88", fontSize: "20px", fontFamily: "'Orbitron', monospace" }}>${fare.total.toFixed(2)}</span>
          </div>
        </div>
        <button
          onClick={handleConfirm}
          style={{
            width: "100%",
            padding: "18px",
            background: "rgba(0,255,136,0.15)",
            border: "2px solid #00ff88",
            borderRadius: "10px",
            cursor: "pointer",
            color: "#00ff88",
            fontSize: "14px",
            letterSpacing: "3px",
            fontFamily: "'Orbitron', monospace",
            boxShadow: "0 0 20px #00ff8833",
          }}
        >
          ✈ SUBMIT FLIGHT REQUEST
        </button>
      </div>
    );
  }

  // ─── Step: RESULT ────────────────────────────────────────────
  if (step === "result") {
    const statusColor = result === "APPROVED" ? "#00ff88" : result === "QUEUED" ? "#ffaa00" : "#ff4444";
    const statusIcon = result === "APPROVED" ? "✓" : result === "QUEUED" ? "⏳" : "✕";

    return (
      <div style={{ textAlign: "center", paddingTop: "20px" }}>
        {processing ? (
          <>
            <div style={{ fontSize: "40px", marginBottom: "16px", animation: "spin 1.5s linear infinite" }}>⟳</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ color: "#00ffff", fontFamily: "'Orbitron', monospace", fontSize: "14px", letterSpacing: "2px" }}>
              PROCESSING REQUEST
            </div>
            <div style={{ color: "#555", fontSize: "11px", marginTop: "8px" }}>Blockchain clearance — 4.5 sec</div>
          </>
        ) : (
          <>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: statusColor + "22", border: `3px solid ${statusColor}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: "36px", color: statusColor,
              boxShadow: `0 0 30px ${statusColor}44`,
            }}>
              {statusIcon}
            </div>
            <div style={{ color: statusColor, fontFamily: "'Orbitron', monospace", fontSize: "18px", letterSpacing: "3px", marginBottom: "8px" }}>
              {result}
            </div>
            {result === "APPROVED" && (
              <>
                <div style={{ color: "#888", fontSize: "11px", marginBottom: "16px" }}>
                  Flight cleared. Estimated fare: <span style={{ color: "#00ff88" }}>${fare.total.toFixed(2)}</span>
                </div>
                <div style={{ background: "rgba(0,255,136,0.06)", border: "1px solid #00ff8833", borderRadius: "8px", padding: "12px", marginBottom: "20px" }}>
                  <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", marginBottom: "6px" }}>REVENUE SPLIT</div>
                  {[["YOUR SHARE (70%)", `$${(fare.total * 0.7).toFixed(2)}`, "#00ff88"], ["MRSS (20%)", `$${(fare.total * 0.2).toFixed(2)}`, "#00ffff"], ["CITY (10%)", `$${(fare.total * 0.1).toFixed(2)}`, "#ffaa00"]].map(([l, v, c]) => (
                    <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ color: "#666", fontSize: "10px" }}>{l}</span>
                      <span style={{ color: c as string, fontSize: "10px", fontFamily: "'Orbitron', monospace" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {result === "QUEUED" && (
              <div style={{ color: "#888", fontSize: "11px", marginBottom: "20px" }}>
                Weather hold active. Request queued — ATC will approve when conditions clear.
              </div>
            )}
            {result === "DENIED" && (
              <div style={{ color: "#888", fontSize: "11px", marginBottom: "20px" }}>
                Request denied. Please try a different route or time.
              </div>
            )}
            {BTN(handleReset, "NEW REQUEST", "#00ffff")}
          </>
        )}
      </div>
    );
  }

  return null;
}

// ─── Shared sub-components ───────────────────────────────────
function StepHeader({ label, step, total, onBack }: { label: string; step: number; total: number; onBack?: () => void }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      {onBack && (
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "12px", padding: "0 0 8px", fontFamily: "'Orbitron', monospace" }}>
          ← BACK
        </button>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#00ffff", fontFamily: "'Orbitron', monospace", fontSize: "11px", letterSpacing: "2px" }}>{label}</span>
        <span style={{ color: "#444", fontSize: "10px" }}>{step} / {total}</span>
      </div>
      <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ flex: 1, height: "2px", borderRadius: "1px", background: i < step ? "#00ffff" : "#222" }} />
        ))}
      </div>
    </div>
  );
}

function Label({ children }: { children: string }) {
  return <div style={{ color: "#555", fontSize: "9px", fontFamily: "'Orbitron', monospace", letterSpacing: "2px", marginBottom: "8px" }}>{children}</div>;
}

function CityChip({ city, selected, onSelect }: { city: CityName; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{
        flex: 1, padding: "12px", borderRadius: "8px",
        background: selected ? "rgba(0,255,255,0.12)" : "rgba(255,255,255,0.04)",
        border: `2px solid ${selected ? "#00ffff" : "#333"}`,
        color: selected ? "#00ffff" : "#666",
        cursor: "pointer", fontSize: "11px", fontFamily: "'Orbitron', monospace",
      }}
    >
      {city === "San Diego" ? "SAN DIEGO" : "ORANGE CO"}
    </button>
  );
}
