import { useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Text } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

// ──────────────────────────────────────────────────────────────
// Camera targets per scene — [position, lookAt]
// ──────────────────────────────────────────────────────────────
const CAMERA_CONFIGS: Array<{
  position: [number, number, number];
  target: [number, number, number];
}> = [
  // Scene 0 — The Problem: wide chaotic overview
  { position: [0, 40, 50], target: [0, 0, 0] },
  // Scene 1 — The Solution: centered overhead pull-back
  { position: [0, 50, 30], target: [0, 0, 0] },
  // Scene 2 — Ring Architecture: angled orbit around SD city
  { position: [-20, 18, 22], target: [-20, 0, 0] },
  // Scene 3 — Flight Lifecycle: close-up on pipeline corridor
  { position: [0, 12, 8], target: [0, 3, 0] },
  // Scene 4 — Revenue Settlement: zoom on SD vertiport
  { position: [-18, 10, 14], target: [-20, 0, 0] },
  // Scene 5 — DAO Governance: centered from above
  { position: [0, 35, 20], target: [0, 0, 0] },
  // Scene 6 — The Future: slow wide pull to full network view
  { position: [0, 60, 70], target: [0, 0, 0] },
];

// ──────────────────────────────────────────────────────────────
// Smooth camera rig — lerps toward current scene target
// ──────────────────────────────────────────────────────────────
function CameraRig({ sceneIndex }: { sceneIndex: number }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(...CAMERA_CONFIGS[0].position));
  const targetLook = useRef(new THREE.Vector3(...CAMERA_CONFIGS[0].target));
  const currentLook = useRef(new THREE.Vector3(...CAMERA_CONFIGS[0].target));

  useEffect(() => {
    const cfg = CAMERA_CONFIGS[sceneIndex] ?? CAMERA_CONFIGS[0];
    targetPos.current.set(...cfg.position);
    targetLook.current.set(...cfg.target);
  }, [sceneIndex]);

  useFrame(() => {
    camera.position.lerp(targetPos.current, 0.03);
    currentLook.current.lerp(targetLook.current, 0.03);
    camera.lookAt(currentLook.current);
  });

  return null;
}

// ──────────────────────────────────────────────────────────────
// Lights
// ──────────────────────────────────────────────────────────────
function DemoLights() {
  return (
    <>
      <ambientLight intensity={1.4} color={0x00ffff} />
      <directionalLight position={[10, 30, 10]} intensity={1.5} color={0xffffff} />
      <pointLight position={[-20, 5, 0]} intensity={1.2} color={0x00ffff} distance={40} />
      <pointLight position={[20, 5, 0]}  intensity={1.2} color={0x00ffff} distance={40} />
      <pointLight position={[0, 15, 0]}  intensity={1.0} color={0xffffff} distance={50} />
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Ground
// ──────────────────────────────────────────────────────────────
function DemoGround() {
  return (
    <group position={[0, -0.5, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[120, 80]} />
        <meshStandardMaterial color={0x0a0a1e} roughness={0.95} metalness={0.05} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[120, 80]}
        cellSize={2}
        cellThickness={0.4}
        cellColor={0x222244}
        sectionSize={10}
        sectionThickness={0.8}
        sectionColor={0x333366}
        fadeDistance={70}
        fadeStrength={1}
        followCamera={false}
      />
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// City node — glowing ring + label
// ──────────────────────────────────────────────────────────────
function CityNode({
  position,
  label,
  color = 0x00ffff,
}: {
  position: [number, number, number];
  label: string;
  color?: number;
}) {
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.2;
    }
  });

  return (
    <group position={position}>
      {/* Base disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
        <circleGeometry args={[9.5, 64]} />
        <meshStandardMaterial color={0x050515} roughness={0.9} />
      </mesh>

      {/* Ring 1 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, (150 / 1250) * 2, 0]}>
        <ringGeometry args={[2.9, 3.1, 64]} />
        <meshStandardMaterial color={0x00ff88} emissive={0x00ff88} emissiveIntensity={0.5} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Ring 2 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, (500 / 1250) * 2, 0]}>
        <ringGeometry args={[5.9, 6.1, 64]} />
        <meshStandardMaterial color={0xffaa00} emissive={0xffaa00} emissiveIntensity={0.5} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* Ring 3 — Regional */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, (1000 / 1250) * 2, 0]}>
        <ringGeometry args={[8.8, 9.2, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Beacon tower */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1.4, 8]} />
        <meshStandardMaterial color={0x223344} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={0x00ff88} emissive={0x00ff88} emissiveIntensity={0.8} />
      </mesh>
      <pointLight position={[0, 1.4, 0]} color={0x00ff88} intensity={0.6} distance={6} />

      {/* City label */}
      <Text position={[0, 0.2, 0]} fontSize={0.9} color={color} anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor={0x000000}>
        {label}
      </Text>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// Animated pipeline corridor between two cities
// ──────────────────────────────────────────────────────────────
function DemoPipeline({
  startZ,
  color,
  altY,
  speed = 0.08,
}: {
  startZ: number;
  color: number;
  altY: number;
  speed?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 30;

  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-20, altY, startZ),
    new THREE.Vector3(-7, altY, startZ * 1.22),
    new THREE.Vector3(7, altY, startZ * 1.22),
    new THREE.Vector3(20, altY, startZ),
  );

  const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.06, 8, false);
  const glowGeo = new THREE.TubeGeometry(curve, 64, 0.18, 8, false);

  const offsets = Array.from({ length: particleCount }, (_, i) => i / particleCount);
  const initPos = new Float32Array(particleCount * 3);
  offsets.forEach((t, i) => {
    const p = curve.getPointAt(t);
    initPos[i * 3] = p.x;
    initPos[i * 3 + 1] = p.y;
    initPos[i * 3 + 2] = p.z;
  });

  useFrame((state) => {
    if (!pointsRef.current) return;
    const attr = pointsRef.current.geometry.getAttribute("position");
    const arr = attr.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      const t = (offsets[i] + state.clock.elapsedTime * speed) % 1;
      const p = curve.getPointAt(t);
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }
    attr.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.85} />
      </mesh>
      <mesh geometry={glowGeo}>
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particleCount} array={initPos} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.18} transparent opacity={0.9} sizeAttenuation />
      </points>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// Scene 0 — The Problem: chaotic crossing paths, red flashes
// ──────────────────────────────────────────────────────────────
function SceneProblem() {
  const linesRef = useRef<THREE.LineSegments>(null);

  useFrame((state) => {
    if (linesRef.current) {
      const mat = linesRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = 0.3 + Math.abs(Math.sin(state.clock.elapsedTime * 4)) * 0.5;
    }
  });

  // Chaotic crossing paths
  const chaoticPaths = new Float32Array([
    -25, 2, -5,  25, 3, 8,
    -20, 4, 12,  22, 1, -10,
    -15, 6, -8,  18, 5, 15,
    -22, 3, 0,   20, 4, 2,
    -18, 5, -15, 24, 2, 10,
    -10, 7, -12, 15, 6, -5,
  ]);

  return (
    <group>
      <DemoGround />
      <DemoLights />
      {/* Two basic city blobs — no rings, no order */}
      <mesh position={[-20, 0, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial color={0xff3300} emissive={0xff3300} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[20, 0, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial color={0xff3300} emissive={0xff3300} emissiveIntensity={0.6} />
      </mesh>
      <Text position={[-20, 3, 0]} fontSize={0.9} color={0xff4400} anchorX="center">SAN DIEGO</Text>
      <Text position={[20, 3, 0]} fontSize={0.9} color={0xff4400} anchorX="center">ORANGE COUNTY</Text>

      {/* Chaotic paths */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={chaoticPaths.length / 3} array={chaoticPaths} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={0xff2200} transparent opacity={0.7} linewidth={2} />
      </lineSegments>

      {/* Conflict flash spheres */}
      {[[-5, 3.5, 3], [5, 2, -4], [0, 4, 0]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z] as [number, number, number]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color={0xff0000} emissive={0xff0000} emissiveIntensity={1.0} />
        </mesh>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// Scene 1 — The Solution: ordered rings appear
// ──────────────────────────────────────────────────────────────
function SceneSolution() {
  return (
    <group>
      <DemoGround />
      <DemoLights />
      <CityNode position={[-20, 0, 0]} label="SAN DIEGO" />
      <CityNode position={[20, 0, 0]}  label="ORANGE COUNTY" />
      <DemoPipeline startZ={-9} color={0xff00ff} altY={2.4} />
      <DemoPipeline startZ={9}  color={0x00ffff} altY={2.4} />
      <Text position={[0, 8, 0]} fontSize={1.2} color={0x00ffff} anchorX="center" outlineWidth={0.04} outlineColor={0x000000}>
        MERIDIAN RING SCHEDULING SYSTEM
      </Text>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// Scene 2 — Ring Architecture: close on rings with altitude labels
// ──────────────────────────────────────────────────────────────
function SceneRings() {
  return (
    <group>
      <DemoGround />
      <DemoLights />
      <CityNode position={[-20, 0, 0]} label="SAN DIEGO" />
      <CityNode position={[20, 0, 0]}  label="ORANGE COUNTY" />

      {/* Ring altitude annotation lines */}
      {[
        { y: (150 / 1250) * 2, label: "RING 1 · 150 ft · URBAN", color: "#00ff88" },
        { y: (500 / 1250) * 2, label: "RING 2 · 500 ft · CORRIDOR", color: "#ffaa00" },
        { y: (1000 / 1250) * 2, label: "RING 3 · 1000 ft · REGIONAL", color: "#00ffff" },
      ].map(({ y, label, color }) => (
        <group key={label}>
          <Text position={[-28, y, 0]} fontSize={0.55} color={color} anchorX="left" anchorY="middle" outlineWidth={0.02} outlineColor={0x000000}>
            {label}
          </Text>
          <Text position={[22, y, 0]} fontSize={0.55} color={color} anchorX="left" anchorY="middle" outlineWidth={0.02} outlineColor={0x000000}>
            {label}
          </Text>
        </group>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// Scene 3 — Flight Lifecycle: active pipelines close view
// ──────────────────────────────────────────────────────────────
function SceneFlightLifecycle() {
  return (
    <group>
      <DemoGround />
      <DemoLights />
      <CityNode position={[-20, 0, 0]} label="SAN DIEGO" color={0x00ffff} />
      <CityNode position={[20, 0, 0]}  label="ORANGE COUNTY" color={0x00ffff} />

      {/* All 6 pipeline variants */}
      <DemoPipeline startZ={-9}  color={0xff00ff} altY={2.4} speed={0.12} />
      <DemoPipeline startZ={-9}  color={0xffa500} altY={3.2} speed={0.09} />
      <DemoPipeline startZ={-9}  color={0x00ffff} altY={1.6} speed={0.07} />
      <DemoPipeline startZ={9}   color={0xff00ff} altY={2.4} speed={0.10} />
      <DemoPipeline startZ={9}   color={0xffa500} altY={3.2} speed={0.08} />
      <DemoPipeline startZ={9}   color={0x00ffff} altY={1.6} speed={0.06} />

      {/* Stage labels along center pipeline */}
      {[
        { x: -17, label: "1. REQUEST" },
        { x: -10, label: "2. APPROVE" },
        { x: -4, label: "3. PIPELINE" },
        { x: 4, label: "4. TRANSIT" },
        { x: 10, label: "5. APPROACH" },
        { x: 17, label: "6. LAND" },
      ].map(({ x, label }) => (
        <Text key={label} position={[x, 5, -9]} fontSize={0.45} color={0xffffff} anchorX="center" outlineWidth={0.02} outlineColor={0x000000}>
          {label}
        </Text>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// Scene 4 — Revenue Settlement: vertiport with revenue text
// ──────────────────────────────────────────────────────────────
function SceneRevenue() {
  const flashRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (flashRef.current) {
      const mat = flashRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.abs(Math.sin(state.clock.elapsedTime * 3)) * 0.6;
    }
  });

  return (
    <group>
      <DemoGround />
      <DemoLights />
      <CityNode position={[-20, 0, 0]} label="SAN DIEGO" />
      <CityNode position={[20, 0, 0]}  label="ORANGE COUNTY" />
      <DemoPipeline startZ={-9} color={0x00ff88} altY={2.4} speed={0.15} />

      {/* Revenue block */}
      <Text position={[0, 7, 0]} fontSize={1.0} color={0x00ff88} anchorX="center" outlineWidth={0.03} outlineColor={0x000000}>
        $155.00 BASE FARE
      </Text>
      <Text position={[0, 5.6, 0]} fontSize={0.6} color={0xffcc00} anchorX="center" outlineWidth={0.02} outlineColor={0x000000}>
        + $2.25 ENERGY SURCHARGE
      </Text>
      <Text position={[0, 4.5, 0]} fontSize={0.5} color={0xaaaaaa} anchorX="center" outlineWidth={0.02} outlineColor={0x000000}>
        OPERATOR 70% · MRSS 20% · CITY 10%
      </Text>

      {/* Flashing settlement indicator */}
      <mesh ref={flashRef} position={[0, 2.8, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={0x00ff88} emissive={0x00ff88} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0, 1.8, 0]} fontSize={0.45} color={0x00ffcc} anchorX="center" outlineWidth={0.02} outlineColor={0x000000}>
        BLOCKCHAIN SETTLED · 4.5 SEC
      </Text>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// Scene 5 — DAO Governance: vote ring visualization
// ──────────────────────────────────────────────────────────────
function SceneDAO() {
  const voteRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (voteRef.current) {
      voteRef.current.rotation.y = state.clock.elapsedTime * 0.4;
    }
  });

  return (
    <group>
      <DemoGround />
      <DemoLights />
      <CityNode position={[-20, 0, 0]} label="SAN DIEGO" />
      <CityNode position={[20, 0, 0]}  label="ORANGE COUNTY" />

      {/* Central governance orb */}
      <mesh ref={voteRef} position={[0, 5, 0]}>
        <torusGeometry args={[2, 0.3, 16, 64]} />
        <meshStandardMaterial color={0x8844ff} emissive={0x8844ff} emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 5, 0]}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial color={0x220044} emissive={0x8844ff} emissiveIntensity={0.3} transparent opacity={0.7} />
      </mesh>
      <pointLight position={[0, 5, 0]} color={0x8844ff} intensity={1.5} distance={20} />

      <Text position={[0, 8.5, 0]} fontSize={0.9} color={0xaa44ff} anchorX="center" outlineWidth={0.03} outlineColor={0x000000}>
        DAO GOVERNANCE
      </Text>
      <Text position={[0, 7.2, 0]} fontSize={0.55} color={0xffffff} anchorX="center" outlineWidth={0.02} outlineColor={0x000000}>
        NO SINGLE AUTHORITY · FAA RETAINS VETO
      </Text>

      {/* Operator vote nodes orbiting */}
      {["AR", "JB", "WK", "BT", "LL", "VL"].map((op, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * 5;
        const z = Math.sin(angle) * 5;
        return (
          <group key={op} position={[x, 5, z]}>
            <mesh>
              <sphereGeometry args={[0.3, 12, 12]} />
              <meshStandardMaterial color={0x00ffff} emissive={0x00ffff} emissiveIntensity={0.5} />
            </mesh>
            <Text position={[0, 0.6, 0]} fontSize={0.35} color={0x00ffcc} anchorX="center">
              {op}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// Scene 6 — The Future: multi-city network expands
// ──────────────────────────────────────────────────────────────
function SceneFuture() {
  const networkRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (networkRef.current) {
      networkRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
    }
  });

  const futureCities: Array<[number, number, number]> = [
    [-20, 0, 0],  // San Diego
    [20, 0, 0],   // Orange County
    [0, 0, -25],  // San Francisco
    [35, 0, -12], // Las Vegas
    [50, 0, 10],  // Phoenix
    [-35, 0, 10], // San Jose
  ];

  const futureLabels = ["SAN DIEGO", "OC", "SF", "LAS VEGAS", "PHOENIX", "SAN JOSE"];

  return (
    <group>
      <DemoGround />
      <DemoLights />

      <group ref={networkRef}>
        {futureCities.map(([x, y, z], i) => (
          <group key={i} position={[x, y, z]}>
            <mesh>
              <sphereGeometry args={[i < 2 ? 1.5 : 0.8, 16, 16]} />
              <meshStandardMaterial
                color={i < 2 ? 0x00ffff : 0x00aa88}
                emissive={i < 2 ? 0x00ffff : 0x006644}
                emissiveIntensity={i < 2 ? 0.7 : 0.4}
              />
            </mesh>
            <Text position={[0, i < 2 ? 2.5 : 1.8, 0]} fontSize={i < 2 ? 0.7 : 0.5} color={i < 2 ? 0x00ffff : 0x00cc88} anchorX="center" outlineWidth={0.02} outlineColor={0x000000}>
              {futureLabels[i]}
            </Text>
          </group>
        ))}

        {/* Network connection lines */}
        {[[0, 1], [0, 2], [0, 5], [1, 2], [1, 3], [1, 4], [2, 5], [3, 4]].map(([a, b], i) => {
          const pa = futureCities[a];
          const pb = futureCities[b];
          const verts = new Float32Array([pa[0], 0.5, pa[2], pb[0], 0.5, pb[2]]);
          return (
            <lineSegments key={i}>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={2} array={verts} itemSize={3} />
              </bufferGeometry>
              <lineBasicMaterial color={0x004488} transparent opacity={0.5} linewidth={1} />
            </lineSegments>
          );
        })}
      </group>

      <Text position={[0, 12, 0]} fontSize={1.1} color={0x00ffff} anchorX="center" outlineWidth={0.04} outlineColor={0x000000}>
        25 CITIES · 2029
      </Text>
      <Text position={[0, 10.4, 0]} fontSize={0.6} color={0xaaffee} anchorX="center" outlineWidth={0.02} outlineColor={0x000000}>
        10,000 FLIGHTS / DAY
      </Text>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────
// Scene selector
// ──────────────────────────────────────────────────────────────
const SCENE_COMPONENTS = [
  SceneProblem,
  SceneSolution,
  SceneRings,
  SceneFlightLifecycle,
  SceneRevenue,
  SceneDAO,
  SceneFuture,
];

interface DemoSceneProps {
  sceneIndex: number;
}

export function DemoScene({ sceneIndex }: DemoSceneProps) {
  const SceneComp = SCENE_COMPONENTS[sceneIndex] ?? SceneSolution;

  return (
    <>
      <color attach="background" args={[0x000d1a]} />
      <fog attach="fog" args={[0x000d1a, 30, 120]} />
      <CameraRig sceneIndex={sceneIndex} />
      <SceneComp />
      <EffectComposer>
        <Bloom luminanceThreshold={0.6} intensity={1.8} mipmapBlur radius={0.5} />
      </EffectComposer>
    </>
  );
}
