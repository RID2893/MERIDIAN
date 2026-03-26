import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { RacingScene } from "@/components/racing/RacingScene";
import { RacingHUD } from "@/components/racing/RacingHUD";

function LoadingScreen() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#040810',
      color: '#FFB800',
      fontSize: '16px',
      fontFamily: "'Orbitron', monospace",
      letterSpacing: '4px',
    }}>
      🏁 INITIALISING CIRCUIT...
    </div>
  );
}

export function RacingMode() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#040810' }}>
      <Canvas
        shadows
        camera={{ position: [0, 12, 18], fov: 55, near: 0.1, far: 120 }}
        gl={{ antialias: true, powerPreference: 'default', alpha: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <RacingScene />
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.35}
              intensity={2.0}
              mipmapBlur
              radius={0.5}
            />
            <Vignette eskil={false} offset={0.3} darkness={0.7} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <Suspense fallback={<LoadingScreen />}>
        <RacingHUD />
      </Suspense>
    </div>
  );
}
