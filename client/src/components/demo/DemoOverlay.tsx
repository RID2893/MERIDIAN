import { AnimatePresence, motion } from "framer-motion";

// ──────────────────────────────────────────────────────────────
// Scene metadata — title, sub, detail lines shown per scene
// ──────────────────────────────────────────────────────────────
export interface SceneConfig {
  title: string;
  subtitle: string;
  detail: string;
  accent: string;    // CSS color for title
  badge?: string;    // optional top badge text
}

export const SCENE_CONFIGS: SceneConfig[] = [
  {
    title: "THE PROBLEM",
    subtitle: "50+ eVTOL operators. No coordination system.",
    detail: "Unregulated low-altitude airspace creates collision risk, noise overload, and zero revenue accountability.",
    accent: "#ff4422",
    badge: "AIRSPACE CRISIS",
  },
  {
    title: "THE SOLUTION",
    subtitle: "MRSS — Meridian Ring Scheduling System",
    detail: "FAA-compliant infrastructure that organizes every flight, settles every dollar, and resolves every conflict. Automatically.",
    accent: "#00ffff",
    badge: "INTRODUCING MRSS",
  },
  {
    title: "RING ARCHITECTURE",
    subtitle: "3 rings. 150 ft · 500 ft · 1000 ft.",
    detail: "Ring 1 urban flights. Ring 2 city corridors. Ring 3 regional pipelines. 100+ aircraft. Zero conflicts.",
    accent: "#00ffcc",
    badge: "SPATIAL SEPARATION",
  },
  {
    title: "FLIGHT LIFECYCLE",
    subtitle: "One flight. 8 stages. 4.5 seconds to clearance.",
    detail: "Request → Approve → Pipeline → Transit → Approach → Land → Settle → Log. Every flight tracked from request to blockchain.",
    accent: "#ffaa00",
    badge: "8-STAGE PROTOCOL",
  },
  {
    title: "REVENUE SETTLEMENT",
    subtitle: "Every landing: $155 base. 70/20/10 split. Instant.",
    detail: "Operator 70% · MRSS Infrastructure 20% · City Authority 10%. Immutable blockchain record in 4.5 seconds.",
    accent: "#00ff88",
    badge: "BLOCKCHAIN SETTLED",
  },
  {
    title: "DAO GOVERNANCE",
    subtitle: "No single authority. FAA retains veto.",
    detail: "6 operators. Quadratic voting. 14-day standard proposals. 30-minute emergency votes. All decisions on-chain.",
    accent: "#aa44ff",
    badge: "DECENTRALIZED CONTROL",
  },
  {
    title: "THE FUTURE",
    subtitle: "25 cities. 10,000 flights/day. 2029.",
    detail: "San Diego + Orange County is the pilot. Every metropolitan region follows the same blueprint. One infrastructure. Every city.",
    accent: "#00ffff",
    badge: "NATIONWIDE ROLLOUT",
  },
];

// ──────────────────────────────────────────────────────────────
// Progress dots
// ──────────────────────────────────────────────────────────────
function ProgressDots({
  total,
  current,
  onJump,
}: {
  total: number;
  current: number;
  onJump: (i: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          onClick={() => onJump(i)}
          style={{
            width: i === current ? "28px" : "10px",
            height: "10px",
            borderRadius: "5px",
            background: i === current ? SCENE_CONFIGS[current].accent : "rgba(255,255,255,0.25)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.3s ease",
            padding: 0,
            boxShadow: i === current ? `0 0 8px ${SCENE_CONFIGS[current].accent}` : "none",
          }}
        />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Auto-progress bar (resets each scene change)
// ──────────────────────────────────────────────────────────────
function AutoProgressBar({
  duration,
  sceneKey,
  accent,
}: {
  duration: number;
  sceneKey: number;
  accent: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "2px",
        background: "rgba(255,255,255,0.1)",
        borderRadius: "1px",
        overflow: "hidden",
      }}
    >
      <motion.div
        key={sceneKey}
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration, ease: "linear" }}
        style={{
          height: "100%",
          background: accent,
          boxShadow: `0 0 6px ${accent}`,
        }}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main overlay
// ──────────────────────────────────────────────────────────────
interface DemoOverlayProps {
  sceneIndex: number;
  totalScenes: number;
  autoAdvanceSecs: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
  onExit: () => void;
}

export function DemoOverlay({
  sceneIndex,
  totalScenes,
  autoAdvanceSecs,
  onPrev,
  onNext,
  onJump,
  onExit,
}: DemoOverlayProps) {
  const cfg = SCENE_CONFIGS[sceneIndex];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        fontFamily: "'Orbitron', 'Inter', monospace",
      }}
    >
      {/* ── TOP BAR ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "18px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(to bottom, rgba(0,10,20,0.85) 0%, transparent 100%)",
          pointerEvents: "auto",
        }}
      >
        {/* Left: logo */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: "11px", color: "rgba(0,255,255,0.5)", letterSpacing: "3px" }}>
            MERIDIAN · MRSS
          </span>
          <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.3)", letterSpacing: "2px" }}>
            FAA RFI RESPONSE · AAM INFRASTRUCTURE
          </span>
        </div>

        {/* Right: exit button */}
        <button
          onClick={onExit}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.7)",
            padding: "6px 18px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "10px",
            letterSpacing: "2px",
            fontFamily: "inherit",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
            (e.target as HTMLButtonElement).style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
            (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
          }}
        >
          ✕ EXIT DEMO
        </button>
      </div>

      {/* ── MAIN TEXT BLOCK — bottom left ── */}
      <div
        style={{
          position: "absolute",
          bottom: "120px",
          left: "40px",
          maxWidth: "520px",
          pointerEvents: "none",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={sceneIndex}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            {/* Badge */}
            {cfg.badge && (
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                style={{
                  display: "inline-block",
                  background: `${cfg.accent}22`,
                  border: `1px solid ${cfg.accent}66`,
                  color: cfg.accent,
                  fontSize: "9px",
                  letterSpacing: "3px",
                  padding: "3px 10px",
                  borderRadius: "2px",
                  marginBottom: "12px",
                }}
              >
                {cfg.badge}
              </motion.div>
            )}

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{
                fontSize: "clamp(28px, 4vw, 52px)",
                color: cfg.accent,
                margin: "0 0 10px 0",
                fontWeight: 700,
                letterSpacing: "2px",
                lineHeight: 1.1,
                textShadow: `0 0 30px ${cfg.accent}88`,
              }}
            >
              {cfg.title}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              style={{
                fontSize: "clamp(13px, 1.6vw, 18px)",
                color: "rgba(255,255,255,0.9)",
                margin: "0 0 14px 0",
                fontWeight: 600,
                letterSpacing: "0.5px",
                lineHeight: 1.4,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {cfg.subtitle}
            </motion.p>

            {/* Detail */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              style={{
                fontSize: "clamp(11px, 1.2vw, 14px)",
                color: "rgba(200,220,255,0.7)",
                margin: 0,
                lineHeight: 1.6,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
              }}
            >
              {cfg.detail}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── BOTTOM CONTROLS ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px 40px 24px",
          background: "linear-gradient(to top, rgba(0,10,20,0.88) 0%, transparent 100%)",
          pointerEvents: "auto",
        }}
      >
        {/* Auto-progress bar */}
        <AutoProgressBar
          key={sceneIndex}
          duration={autoAdvanceSecs}
          sceneKey={sceneIndex}
          accent={cfg.accent}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "14px",
          }}
        >
          {/* Scene counter */}
          <span
            style={{
              fontSize: "11px",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "2px",
              fontFamily: "inherit",
            }}
          >
            {String(sceneIndex + 1).padStart(2, "0")} / {String(totalScenes).padStart(2, "0")}
          </span>

          {/* Dots */}
          <ProgressDots total={totalScenes} current={sceneIndex} onJump={onJump} />

          {/* Nav buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onPrev}
              disabled={sceneIndex === 0}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: sceneIndex === 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.8)",
                width: "38px",
                height: "38px",
                borderRadius: "4px",
                cursor: sceneIndex === 0 ? "default" : "pointer",
                fontSize: "16px",
                fontFamily: "inherit",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ←
            </button>
            <button
              onClick={onNext}
              style={{
                background: `${cfg.accent}22`,
                border: `1px solid ${cfg.accent}55`,
                color: cfg.accent,
                padding: "0 22px",
                height: "38px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "10px",
                letterSpacing: "2px",
                fontFamily: "inherit",
                transition: "all 0.2s",
                boxShadow: `0 0 12px ${cfg.accent}33`,
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = `${cfg.accent}44`;
                (e.target as HTMLButtonElement).style.boxShadow = `0 0 20px ${cfg.accent}66`;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = `${cfg.accent}22`;
                (e.target as HTMLButtonElement).style.boxShadow = `0 0 12px ${cfg.accent}33`;
              }}
            >
              {sceneIndex === totalScenes - 1 ? "RESTART" : "NEXT →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
