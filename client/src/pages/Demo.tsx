import { useState, useEffect, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useLocation } from "wouter";
import { DemoScene } from "../components/demo/DemoScene";
import { DemoOverlay, SCENE_CONFIGS } from "../components/demo/DemoOverlay";

const TOTAL_SCENES = SCENE_CONFIGS.length;
const AUTO_ADVANCE_SECS = 12;

export function Demo() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [, navigate] = useLocation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goNext = useCallback(() => {
    setSceneIndex((prev) => (prev + 1) % TOTAL_SCENES);
  }, []);

  const goPrev = useCallback(() => {
    setSceneIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goJump = useCallback((i: number) => {
    setSceneIndex(i);
  }, []);

  const goExit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // ── Auto-advance timer — resets on any manual scene change ──
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSceneIndex((prev) => (prev + 1) % TOTAL_SCENES);
    }, AUTO_ADVANCE_SECS * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sceneIndex]);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goPrev();
      if (e.key === "Escape") goExit();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, goExit]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000d1a",
        overflow: "hidden",
      }}
    >
      {/* ── R3F Canvas ── */}
      <Canvas
        camera={{
          position: [0, 40, 50],
          fov: 50,
          near: 0.1,
          far: 300,
        }}
        gl={{
          antialias: true,
          powerPreference: "default",
          alpha: false,
        }}
        dpr={[1, 2]}
        style={{ position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          <DemoScene sceneIndex={sceneIndex} />
        </Suspense>
      </Canvas>

      {/* ── HUD Overlay ── */}
      <DemoOverlay
        sceneIndex={sceneIndex}
        totalScenes={TOTAL_SCENES}
        autoAdvanceSecs={AUTO_ADVANCE_SECS}
        onPrev={goPrev}
        onNext={goNext}
        onJump={goJump}
        onExit={goExit}
      />

      {/* ── Keyboard hint (fades after 4s) ── */}
      <KeyboardHint />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Keyboard hint — fades out after mount
// ──────────────────────────────────────────────────────────────
function KeyboardHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        right: "28px",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        pointerEvents: "none",
        animation: "fadeOut 1s ease 3s forwards",
      }}
    >
      <style>{`@keyframes fadeOut { to { opacity: 0; } }`}</style>
      {["←", "→"].map((key) => (
        <div
          key={key}
          style={{
            width: "34px",
            height: "34px",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: "14px",
            background: "rgba(255,255,255,0.04)",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {key}
        </div>
      ))}
      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", letterSpacing: "1px", fontFamily: "monospace" }}>
        NAV
      </span>
    </div>
  );
}
