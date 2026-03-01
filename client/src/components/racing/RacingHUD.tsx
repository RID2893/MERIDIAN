import type { CSSProperties } from "react";
import { useLocation } from "wouter";
import { useRacing, VEHICLE_CONFIGS } from "@/lib/stores/useRacing";

// ─── Colour helpers ────────────────────────────────────────────────────────
function scoreColor(v: number): string {
  if (v >= 85) return '#00FF88';
  if (v >= 70) return '#FFB800';
  return '#FF3B5C';
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

function fmtHMS(s: number): string {
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${ss}`;
}

// ─── Shared card style ────────────────────────────────────────────────────
const CARD: CSSProperties = {
  background: '#0D1A35',
  border: '1px solid #1A2A4A',
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

  return (
    <div style={CARD}>
      <div style={SECTION_TITLE}>MRSSP Live Scores</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: "'Courier New', monospace" }}>
        <thead>
          <tr style={{ color: '#666' }}>
            <th style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 'normal' }}>Vehicle</th>
            <th style={{ padding: '2px 3px', fontWeight: 'normal' }}>Spd</th>
            <th style={{ padding: '2px 3px', fontWeight: 'normal' }}>Prc</th>
            <th style={{ padding: '2px 3px', fontWeight: 'normal' }}>Eff</th>
            <th style={{ padding: '2px 3px', fontWeight: 'normal' }}>Dec</th>
            <th style={{ padding: '2px 3px', fontWeight: 'normal', color: '#00D4FF' }}>∑</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map(v => (
            <tr key={v.id} style={{ opacity: v.aborted ? 0.5 : 1 }}>
              <td style={{ padding: '3px 4px', color: v.vehicleClass === 'A' ? '#FF6B00' : '#00D4FF', fontSize: '9px' }}>
                {v.vehicleClass === 'A' ? '🟠' : '🔵'} {v.id}
              </td>
              <td style={{ padding: '3px', textAlign: 'center', color: '#ccc' }}>{v.scores.gateTime.toFixed(0)}</td>
              <td style={{ padding: '3px', textAlign: 'center', color: '#ccc' }}>{v.scores.precision.toFixed(0)}</td>
              <td style={{ padding: '3px', textAlign: 'center', color: '#ccc' }}>{v.scores.efficiency.toFixed(0)}</td>
              <td style={{ padding: '3px', textAlign: 'center', color: '#ccc' }}>{v.scores.decision.toFixed(0)}</td>
              <td style={{ padding: '3px', textAlign: 'center', fontWeight: 'bold', color: scoreColor(v.scores.composite) }}>
                {v.aborted ? 'ABORT' : v.scores.composite.toFixed(1)}
              </td>
            </tr>
          ))}
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
        <div key={v.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '6px' }}>
          <span style={{ color: '#666', fontSize: '9px', width: '12px', fontFamily: "'Courier New', monospace" }}>
            #{i + 1}
          </span>
          <span style={{ color: v.vehicleClass === 'A' ? '#FF6B00' : '#00D4FF', fontSize: '9px', fontFamily: "'Courier New', monospace", width: '88px' }}>
            {v.id}
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
  const { aamiTelemetry, aamiCompliance, aamiQuality, aamiSafetyEvents, aamiStatus, raceTime } = useRacing(s => ({
    aamiTelemetry:    s.aamiTelemetry,
    aamiCompliance:   s.aamiCompliance,
    aamiQuality:      s.aamiQuality,
    aamiSafetyEvents: s.aamiSafetyEvents,
    aamiStatus:       s.aamiStatus,
    raceTime:         s.raceTime,
  }));

  const statusColor: Record<string, string> = {
    ACTIVE:    '#00FF88',
    REVIEWING: '#FFB800',
    SUSPENDED: '#FF3B5C',
  };

  return (
    <div style={{ ...CARD, border: '1px solid #3A1A5A' }}>
      <div style={{ ...SECTION_TITLE, color: '#8B5CF6' }}>🏛️ AAMI Certification</div>
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
      <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #1A2A4A', color: '#444', fontSize: '8px', textAlign: 'center', fontFamily: "'Courier New', monospace" }}>
        FAA · EASA · CASA
      </div>
    </div>
  );
}

// ─── Control Bar ─────────────────────────────────────────────────────────
function ControlBar() {
  const { raceRunning, racePaused, startRace, pauseRace, resetRace, triggerAbort, forceGate, vehicles } = useRacing(s => ({
    raceRunning:  s.raceRunning,
    racePaused:   s.racePaused,
    startRace:    s.startRace,
    pauseRace:    s.pauseRace,
    resetRace:    s.resetRace,
    triggerAbort: s.triggerAbort,
    forceGate:    s.forceGate,
    vehicles:     s.vehicles,
  }));

  const { followedId, showClassA, showClassB, setFollowed, setShowClassA, setShowClassB } = useRacing(s => ({
    followedId:    s.followedId,
    showClassA:    s.showClassA,
    showClassB:    s.showClassB,
    setFollowed:   s.setFollowed,
    setShowClassA: s.setShowClassA,
    setShowClassB: s.setShowClassB,
  }));

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
      bottom: 0,
      left: 0,
      right: '360px',
      height: '60px',
      background: 'rgba(4,8,16,0.92)',
      borderTop: '1px solid #1A2A4A',
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

      <div style={{ width: '1px', background: '#1A2A4A', height: '28px', margin: '0 4px' }} />

      {/* Follow dropdown */}
      <select
        value={followedId ?? ''}
        onChange={e => setFollowed(e.target.value || null)}
        style={{
          background: '#0D1A35',
          border: '1px solid #1A2A4A',
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

      {/* Class toggles */}
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

function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// ─── Abort Alert Banner ───────────────────────────────────────────────────
function AbortBanner() {
  const { abortAlertLevel, abortAlertText } = useRacing(s => ({
    abortAlertLevel: s.abortAlertLevel,
    abortAlertText:  s.abortAlertText,
  }));

  if (!abortAlertLevel) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '54px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(255,59,92,0.15)',
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
  const { raceRunning, raceTime, vehicles } = useRacing(s => ({
    raceRunning: s.raceRunning,
    raceTime:    s.raceTime,
    vehicles:    s.vehicles,
  }));

  const leader = [...vehicles].sort((a, b) => {
    const ld = b.laps - a.laps;
    return ld !== 0 ? ld : b.t - a.t;
  })[0];

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '54px',
      background: 'rgba(4,8,16,0.94)',
      borderBottom: '1px solid #1A2A4A',
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
            border: '1px solid rgba(0,255,255,0.3)',
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
      top: '54px',
      right: 0,
      bottom: '60px',
      width: '360px',
      background: 'rgba(4,8,16,0.92)',
      borderLeft: '1px solid #1A2A4A',
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
      {/* Children with pointer events re-enabled */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
        <RacingHeader />
        <AbortBanner />
        <RightPanel />
        <ControlBar />
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
