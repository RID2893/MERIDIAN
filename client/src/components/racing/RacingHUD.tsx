import { type CSSProperties, useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useShallow } from "zustand/react/shallow";
import { useRacing, CHALLENGE_ROUTES } from "@/lib/stores/useRacing";

// ─── Colour helpers ────────────────────────────────────────────────────────
function scoreColor(v: number): string {
  if (v >= 85) return '#00FF88';
  if (v >= 70) return '#FFB800';
  return '#FF3B5C';
}

function fmtTime(s: number): string {
  const m  = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

function fmtHMS(s: number): string {
  const h  = Math.floor(s / 3600).toString().padStart(2, '0');
  const m  = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${ss}`;
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// ─── Shared styles — glassmorphism panels ─────────────────────────────────
const CARD: CSSProperties = {
  background: 'rgba(4, 12, 28, 0.82)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(0, 212, 255, 0.12)',
  borderRadius: '6px',
  padding: '10px 12px',
  marginBottom: '8px',
};

const SECTION_TITLE: CSSProperties = {
  color: '#00D4FF',
  fontSize: '9px',
  letterSpacing: '2px',
  fontFamily: "'Orbitron', monospace",
  marginBottom: '8px',
  textTransform: 'uppercase' as const,
};

// ─── Scores Panel ─────────────────────────────────────────────────────────
function ScoresPanel() {
  const vehicles = useRacing(s => s.vehicles);

  function fmtLapDelta(t: number | null): string {
    if (t === null) return '—';
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  }

  return (
    <div style={CARD}>
      <div style={SECTION_TITLE}>MRSSP Live Scores</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', fontFamily: "'Courier New', monospace" }}>
        <thead>
          <tr style={{ color: '#666' }}>
            <th style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 'normal' }}>Vehicle</th>
            <th style={{ padding: '2px 2px', fontWeight: 'normal' }}>Spd</th>
            <th style={{ padding: '2px 2px', fontWeight: 'normal' }}>Prc</th>
            <th style={{ padding: '2px 2px', fontWeight: 'normal' }}>Eff</th>
            <th style={{ padding: '2px 2px', fontWeight: 'normal' }}>Dec</th>
            <th style={{ padding: '2px 2px', fontWeight: 'normal' }}>Rec</th>
            <th style={{ padding: '2px 2px', fontWeight: 'normal', color: '#00D4FF' }}>∑</th>
            <th style={{ padding: '2px 2px', fontWeight: 'normal', color: '#8A9BB5' }}>Δ</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map(v => {
            const inChallenge = v.mode === 'CHALLENGE' && v.challengeGk;
            const cr = inChallenge ? CHALLENGE_ROUTES[v.challengeGk!] : null;
            return (
              <tr
                key={v.id}
                style={{
                  opacity: v.aborted ? 0.5 : 1,
                  background: inChallenge
                    ? 'rgba(255, 184, 0, 0.10)'
                    : 'transparent',
                  transition: 'background 0.3s',
                }}
              >
                <td style={{ padding: '3px 4px', color: v.vehicleClass === 'A' ? '#FF6B00' : '#00D4FF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{v.vehicleClass === 'A' ? '🟠' : '🔵'} {v.id}</span>
                    {inChallenge && cr && (
                      <span style={{
                        color: '#FFB800',
                        fontSize: '7px',
                        fontFamily: "'Orbitron', monospace",
                        letterSpacing: '0.5px',
                        animation: 'pulse 0.8s infinite',
                      }}>
                        ⚡{v.challengeGk}
                      </span>
                    )}
                    {!inChallenge && v.nextGateId && (
                      <span style={{ color: '#333', marginLeft: '2px', fontSize: '8px' }}>→{v.nextGateId}</span>
                    )}
                  </div>
                  {/* Battery bar */}
                  <div style={{ marginTop: '2px', height: '2px', background: '#0a1525', borderRadius: '1px' }}>
                    <div style={{
                      width: `${v.battery}%`,
                      height: '100%',
                      background: v.battery > 50 ? '#00FF88' : v.battery > 20 ? '#FFB800' : '#FF3B5C',
                      borderRadius: '1px',
                      transition: 'width 0.5s',
                    }} />
                  </div>
                  {/* Challenge progress bar */}
                  {inChallenge && (
                    <div style={{ marginTop: '2px', height: '2px', background: 'rgba(255,184,0,0.15)', borderRadius: '1px' }}>
                      <div style={{
                        width: `${v.challengeT * 100}%`,
                        height: '100%',
                        background: '#FFB800',
                        borderRadius: '1px',
                        transition: 'width 0.1s',
                      }} />
                    </div>
                  )}
                </td>
                <td style={{ padding: '3px 2px', textAlign: 'center', color: '#ccc' }}>{v.scores.gateTime.toFixed(0)}</td>
                <td style={{ padding: '3px 2px', textAlign: 'center', color: '#ccc' }}>{v.scores.precision.toFixed(0)}</td>
                <td style={{ padding: '3px 2px', textAlign: 'center', color: '#ccc' }}>{v.scores.efficiency.toFixed(0)}</td>
                <td style={{ padding: '3px 2px', textAlign: 'center', color: '#ccc' }}>{v.scores.decision.toFixed(0)}</td>
                <td style={{ padding: '3px 2px', textAlign: 'center', color: scoreColor(v.scores.recovery) }}>{v.scores.recovery.toFixed(0)}</td>
                <td style={{ padding: '3px 2px', textAlign: 'center', fontWeight: 'bold', color: scoreColor(v.scores.composite) }}>
                  {v.aborted ? 'ABRT' : v.scores.composite.toFixed(1)}
                </td>
                <td style={{ padding: '3px 2px', textAlign: 'center', color: '#8A9BB5', fontSize: '8px' }}>
                  {fmtLapDelta(v.lastLapTime)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Gate Status Panel ────────────────────────────────────────────────────
function GatesPanel() {
  const gates = useRacing(s => s.gates);

  const gateColor: Record<string, string> = {
    WAITING:  '#444466',
    ACTIVE:   '#FFB800',
    COMPLETE: '#00FF88',
  };

  return (
    <div style={CARD}>
      <div style={SECTION_TITLE}>Mission Gates</div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {gates.map(g => (
          <div
            key={g.id}
            style={{
              background: gateColor[g.status],
              color: '#000',
              borderRadius: '4px',
              padding: '3px 7px',
              fontSize: '9px',
              fontFamily: "'Courier New', monospace",
              fontWeight: 'bold',
              opacity: g.status === 'WAITING' ? 0.5 : 1,
              animation: g.status === 'ACTIVE' ? 'pulse 0.8s infinite' : 'none',
            }}
          >
            {g.id} {g.status === 'COMPLETE' ? '✓' : g.status === 'ACTIVE' ? '⚡' : '○'}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────────────────
function Leaderboard() {
  const vehicles = useRacing(s => s.vehicles);
  const sorted = [...vehicles].sort((a, b) => {
    const lapDiff = b.laps - a.laps;
    if (lapDiff !== 0) return lapDiff;
    return b.t - a.t;
  });
  const maxScore = Math.max(...vehicles.map(v => v.scores.composite));

  return (
    <div style={CARD}>
      <div style={SECTION_TITLE}>Leaderboard</div>
      {sorted.map((v, i) => (
        <div
          key={v.id}
          style={{
            display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '6px',
            background: v.mode === 'CHALLENGE' ? 'rgba(255,184,0,0.07)' : 'transparent',
            borderRadius: '3px', padding: '1px 2px',
            transition: 'background 0.3s',
          }}
        >
          <span style={{ color: '#666', fontSize: '9px', width: '12px', fontFamily: "'Courier New', monospace" }}>
            #{i + 1}
          </span>
          <span style={{ color: v.vehicleClass === 'A' ? '#FF6B00' : '#00D4FF', fontSize: '9px', fontFamily: "'Courier New', monospace", width: '88px' }}>
            {v.id}
            {v.mode === 'CHALLENGE' && (
              <span style={{ color: '#FFB800', fontSize: '7px', marginLeft: '3px' }}>⚡</span>
            )}
          </span>
          <div style={{ flex: 1, background: '#0a1525', borderRadius: '2px', height: '6px' }}>
            <div style={{
              width: `${(v.scores.composite / maxScore) * 100}%`,
              height: '100%',
              background: scoreColor(v.scores.composite),
              borderRadius: '2px',
              transition: 'width 0.5s',
            }} />
          </div>
          <span style={{ color: scoreColor(v.scores.composite), fontSize: '9px', fontFamily: "'Courier New', monospace", width: '32px', textAlign: 'right' }}>
            {v.scores.composite.toFixed(1)}
          </span>
          <span style={{ color: '#444', fontSize: '8px', fontFamily: "'Courier New', monospace", width: '22px' }}>
            L{v.laps}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── AAMI Panel ───────────────────────────────────────────────────────────
function AAMIPanel() {
  const { aamiTelemetry, aamiCompliance, aamiQuality, aamiSafetyEvents, aamiStatus, raceTime } =
    useRacing(useShallow(s => ({
      aamiTelemetry:    s.aamiTelemetry,
      aamiCompliance:   s.aamiCompliance,
      aamiQuality:      s.aamiQuality,
      aamiSafetyEvents: s.aamiSafetyEvents,
      aamiStatus:       s.aamiStatus,
      raceTime:         s.raceTime,
    })));

  const statusColor: Record<string, string> = {
    ACTIVE:    '#00FF88',
    REVIEWING: '#FFB800',
    SUSPENDED: '#FF3B5C',
  };

  return (
    <div style={{ ...CARD, border: '1px solid rgba(139, 92, 246, 0.25)' }}>
      <div style={{ ...SECTION_TITLE, color: '#8B5CF6' }}>🏛 AAMI Certification</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '9px', fontFamily: "'Courier New', monospace" }}>
        <div>
          <div style={{ color: '#666', marginBottom: '2px' }}>TELEMETRY</div>
          <div style={{ color: '#00D4FF' }}>{aamiTelemetry.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ color: '#666', marginBottom: '2px' }}>COMPLIANCE</div>
          <div style={{ color: '#00FF88' }}>{aamiCompliance.toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ color: '#666', marginBottom: '2px' }}>SAFETY EVENTS</div>
          <div style={{ color: aamiSafetyEvents > 0 ? '#FFB800' : '#ccc' }}>{aamiSafetyEvents}</div>
        </div>
        <div>
          <div style={{ color: '#666', marginBottom: '2px' }}>VALIDATION</div>
          <div style={{ color: '#ccc' }}>{fmtHMS(raceTime)}</div>
        </div>
        <div>
          <div style={{ color: '#666', marginBottom: '2px' }}>DATA QUALITY</div>
          <div style={{ color: '#00FF88' }}>{aamiQuality.toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ color: '#666', marginBottom: '2px' }}>STATUS</div>
          <div style={{ color: statusColor[aamiStatus], fontWeight: 'bold' }}>{aamiStatus}</div>
        </div>
      </div>
      <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(0,212,255,0.08)', color: '#444', fontSize: '8px', textAlign: 'center', fontFamily: "'Courier New', monospace" }}>
        FAA · EASA · CASA
      </div>
    </div>
  );
}

// ─── Challenge Result Flash ────────────────────────────────────────────────
function ChallengeResultFlash() {
  const vehicles = useRacing(s => s.vehicles);
  const prevModeRef = useRef<Record<string, string>>({});
  const prevGkRef   = useRef<Record<string, string | null>>({});
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [flash, setFlash] = useState<{ vehicleName: string; gk: string; title: string } | null>(null);

  useEffect(() => {
    for (const v of vehicles) {
      const prev   = prevModeRef.current[v.id];
      const prevGk = prevGkRef.current[v.id];
      if (prev === 'CHALLENGE' && v.mode === 'MAIN' && prevGk) {
        const cr = CHALLENGE_ROUTES[prevGk];
        if (timerRef.current) clearTimeout(timerRef.current);
        setFlash({ vehicleName: v.name, gk: prevGk, title: cr?.title ?? prevGk });
        timerRef.current = setTimeout(() => setFlash(null), 2800);
      }
      prevModeRef.current[v.id] = v.mode;
      prevGkRef.current[v.id]   = v.challengeGk;
    }
  }, [vehicles]);

  if (!flash) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(4, 12, 28, 0.90)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      border: '1px solid rgba(255, 184, 0, 0.45)',
      borderRadius: '8px',
      padding: '10px 24px',
      textAlign: 'center',
      pointerEvents: 'none',
      zIndex: 200,
      animation: 'fadeInOut 2.8s ease forwards',
      whiteSpace: 'nowrap',
    }}>
      <div style={{ color: '#FFB800', fontSize: '8px', letterSpacing: '3px', fontFamily: "'Orbitron', monospace", marginBottom: '4px' }}>
        ⚡ CHALLENGE SECTOR COMPLETE
      </div>
      <div style={{ color: '#fff', fontSize: '11px', fontFamily: "'Orbitron', monospace", letterSpacing: '1px' }}>
        {flash.gk} · {flash.title.toUpperCase()}
      </div>
      <div style={{ color: '#8A9BB5', fontSize: '8px', fontFamily: "'Courier New', monospace", marginTop: '3px' }}>
        {flash.vehicleName}
      </div>
    </div>
  );
}

// ─── Control Bar ─────────────────────────────────────────────────────────
function ControlBar() {
  const { raceRunning, racePaused, startRace, pauseRace, resetRace, triggerAbort, forceGate, vehicles } =
    useRacing(useShallow(s => ({
      raceRunning:  s.raceRunning,
      racePaused:   s.racePaused,
      startRace:    s.startRace,
      pauseRace:    s.pauseRace,
      resetRace:    s.resetRace,
      triggerAbort: s.triggerAbort,
      forceGate:    s.forceGate,
      vehicles:     s.vehicles,
    })));

  const { followedId, showClassA, showClassB, setFollowed, setShowClassA, setShowClassB } =
    useRacing(useShallow(s => ({
      followedId:    s.followedId,
      showClassA:    s.showClassA,
      showClassB:    s.showClassB,
      setFollowed:   s.setFollowed,
      setShowClassA: s.setShowClassA,
      setShowClassB: s.setShowClassB,
    })));

  const btn = (
    label: string,
    onClick: () => void,
    color = '#00D4FF',
    disabled = false,
  ): JSX.Element => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: `rgba(${hexToRgb(color)},0.1)`,
        border: `1px solid rgba(${hexToRgb(color)},0.4)`,
        color,
        padding: '5px 14px',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '9px',
        letterSpacing: '1px',
        fontFamily: "'Orbitron', monospace",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      position: 'absolute',
      pointerEvents: 'auto',
      bottom: 0,
      left: 0,
      right: '360px',
      height: '60px',
      background: 'rgba(4, 8, 16, 0.88)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderTop: '1px solid rgba(0, 212, 255, 0.10)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '0 16px',
    }}>
      {!raceRunning
        ? btn('▶ START', startRace, '#00D4FF')
        : btn(racePaused ? '▶ RESUME' : '⏸ PAUSE', pauseRace, '#00D4FF')
      }
      {btn('↺ RESET', resetRace, '#888')}
      {btn('🚨 ABORT', () => triggerAbort(), '#FF3B5C', !raceRunning)}
      {btn('⚡ FORCE GATE', forceGate, '#FFB800', !raceRunning || racePaused)}

      <div style={{ width: '1px', background: 'rgba(0,212,255,0.15)', height: '28px', margin: '0 4px' }} />

      <select
        value={followedId ?? ''}
        onChange={e => setFollowed(e.target.value || null)}
        style={{
          background: 'rgba(4,12,28,0.85)',
          border: '1px solid rgba(0,212,255,0.15)',
          color: '#ccc',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '9px',
          fontFamily: "'Courier New', monospace",
          cursor: 'pointer',
        }}
      >
        <option value="">Follow: None</option>
        {vehicles.map(v => (
          <option key={v.id} value={v.id}>{v.id}</option>
        ))}
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '9px', color: '#FF6B00', fontFamily: "'Courier New', monospace" }}>
        <input type="checkbox" checked={showClassA} onChange={e => setShowClassA(e.target.checked)} />
        Class A
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '9px', color: '#00D4FF', fontFamily: "'Courier New', monospace" }}>
        <input type="checkbox" checked={showClassB} onChange={e => setShowClassB(e.target.checked)} />
        Class B
      </label>
    </div>
  );
}

// ─── Abort Alert Banner ───────────────────────────────────────────────────
function AbortBanner() {
  const { abortAlertLevel, abortAlertText } = useRacing(useShallow(s => ({
    abortAlertLevel: s.abortAlertLevel,
    abortAlertText:  s.abortAlertText,
  })));

  if (!abortAlertLevel) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '54px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(255,59,92,0.15)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid #FF3B5C',
      color: '#FF3B5C',
      padding: '8px 24px',
      borderRadius: '6px',
      fontSize: '11px',
      fontFamily: "'Orbitron', monospace",
      letterSpacing: '1px',
      zIndex: 100,
      animation: 'pulse 0.5s infinite',
      whiteSpace: 'nowrap',
    }}>
      {abortAlertText}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────
function RacingHeader() {
  const [, navigate] = useLocation();
  const { raceRunning, raceTime, vehicles } = useRacing(useShallow(s => ({
    raceRunning: s.raceRunning,
    raceTime:    s.raceTime,
    vehicles:    s.vehicles,
  })));

  const leader = [...vehicles].sort((a, b) => {
    const ld = b.laps - a.laps;
    return ld !== 0 ? ld : b.t - a.t;
  })[0];

  const challengeCount = vehicles.filter(v => v.mode === 'CHALLENGE').length;

  return (
    <div style={{
      position: 'absolute',
      pointerEvents: 'auto',
      top: 0, left: 0, right: 0,
      height: '54px',
      background: 'rgba(4, 8, 16, 0.90)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(0, 212, 255, 0.12)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '13px', fontFamily: "'Orbitron', monospace", color: '#FFB800', letterSpacing: '2px' }}>
          🏁 MRCP RACING
        </span>
        {raceRunning && (
          <span style={{ fontSize: '9px', color: '#FF3B5C', fontFamily: "'Courier New', monospace", animation: 'pulse 1s infinite' }}>
            ● LIVE
          </span>
        )}
        {leader && raceRunning && (
          <span style={{ fontSize: '9px', color: '#FFB800', fontFamily: "'Courier New', monospace" }}>
            LAP {leader.laps + 1} · LEADER: {leader.id}
          </span>
        )}
        {challengeCount > 0 && (
          <span style={{ fontSize: '9px', color: '#FFB800', fontFamily: "'Orbitron', monospace", letterSpacing: '1px', animation: 'pulse 0.8s infinite' }}>
            ⚡ {challengeCount} IN SECTOR
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {raceRunning && (
          <span style={{ fontSize: '12px', color: '#00D4FF', fontFamily: "'Courier New', monospace" }}>
            {fmtTime(raceTime)}
          </span>
        )}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(0,255,255,0.06)',
            border: '1px solid rgba(0,255,255,0.25)',
            color: '#00D4FF',
            padding: '4px 14px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '9px',
            letterSpacing: '2px',
            fontFamily: "'Orbitron', monospace",
          }}
        >
          ← BACK
        </button>
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────
function RightPanel() {
  return (
    <div style={{
      position: 'absolute',
      pointerEvents: 'auto',
      top: '54px', right: 0, bottom: '60px',
      width: '360px',
      background: 'rgba(4, 8, 16, 0.78)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderLeft: '1px solid rgba(0, 212, 255, 0.10)',
      overflowY: 'auto',
      padding: '10px',
    }}>
      <ScoresPanel />
      <GatesPanel />
      <Leaderboard />
      <AAMIPanel />
    </div>
  );
}

// ─── Main HUD export ──────────────────────────────────────────────────────
export function RacingHUD() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <RacingHeader />
        <AbortBanner />
        <RightPanel />
        <ControlBar />
        <ChallengeResultFlash />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeInOut {
          0%   { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          12%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          80%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
