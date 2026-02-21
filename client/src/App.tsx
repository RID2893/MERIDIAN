import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import "@fontsource/inter";
import { Scene } from "./components/game/Scene";
import { HUD } from "./components/game/HUD";

function LoadingScreen() {
  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#001a2e",
      color: "#00ffff",
      fontSize: "24px",
      fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: "20px" }}>Loading Simulation...</div>
        <div style={{
          width: "200px",
          height: "4px",
          background: "rgba(0, 255, 255, 0.2)",
          borderRadius: "2px",
          overflow: "hidden",
        }}>
          <div style={{
            width: "50%",
            height: "100%",
            background: "#00ffff",
            animation: "loading 1.5s ease-in-out infinite",
          }} />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="app-container">
      <div className="canvas-container">
        <Canvas
          shadows
          camera={{
            position: [0, 25, 35],
            fov: 50,
            near: 0.1,
            far: 200,
          }}
          gl={{
            antialias: true,
            powerPreference: "default",
            alpha: false,
          }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <Scene />
            <EffectComposer>
              <Bloom
                luminanceThreshold={0.7}
                intensity={1.4}
                mipmapBlur
                radius={0.4}
              />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>
      <HUD />
    </div>
  );
}

export default App;
