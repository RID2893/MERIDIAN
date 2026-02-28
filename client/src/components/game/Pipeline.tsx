import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { useSimulation, type PipelineVariant } from "@/lib/stores/useSimulation";
import { Text } from "@react-three/drei";

const SD_POSITION: [number, number, number] = [-12, 0, 0];
const LA_POSITION: [number, number, number] = [12, 0, 8];

// Pipelines connect at Ring 3 (Regional, radius=9) — not the local gate ring (radius=6)
// SD center: (-12,0,0)  |  OC center: (12,0,8)
// N-S exits: north face of Ring 3 at each city
// E-W exits: east face of SD Ring 3 → west face of OC Ring 3
const RING3_RADIUS = 9;

const ROUTE_CONFIGS = {
  "N-S": {
    // SD Ring 3 north face → OC Ring 3 north face (both on north side, z decreasing)
    baseStart: new THREE.Vector3(SD_POSITION[0], 0, SD_POSITION[2] - RING3_RADIUS),
    baseEnd:   new THREE.Vector3(LA_POSITION[0], 0, LA_POSITION[2] - RING3_RADIUS),
    control1:  new THREE.Vector3(-4, 0, -6),
    control2:  new THREE.Vector3(4, 0, -4),
  },
  "E-W": {
    // SD Ring 3 east face → OC Ring 3 west face (threading through the gap between cities)
    baseStart: new THREE.Vector3(SD_POSITION[0] + RING3_RADIUS, 0, SD_POSITION[2]),
    baseEnd:   new THREE.Vector3(LA_POSITION[0] - RING3_RADIUS, 0, LA_POSITION[2]),
    control1:  new THREE.Vector3(-1, 0, 3),
    control2:  new THREE.Vector3(1, 0, 5),
  },
};

// Document-aligned pipeline altitudes (FAA RFI Section 3.2 — inter-city corridor tiers)
// BOTTOM = 1000ft (base tier)  |  CENTER = 1500ft (primary)  |  TOP = 2000ft (overflow)
const VARIANT_ALTITUDES: Record<string, number> = {
  BOTTOM: (1000 / 1250) * 2,   // 1.6 scene units
  CENTER: (1500 / 1250) * 2,   // 2.4 scene units
  TOP:    (2000 / 1250) * 2,   // 3.2 scene units
};

// Lateral (Z-axis) separation between the three parallel tubes — widened for visual clarity
const VARIANT_LATERAL: Record<string, number> = {
  CENTER:  0,
  TOP:    +1.2,
  BOTTOM: -1.2,
};

function FlowParticles({ curve, color }: { curve: THREE.CubicBezierCurve3; color: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 20;
  
  const { positions, offsets } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const off = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      off[i] = i / particleCount;
      const point = curve.getPointAt(off[i]);
      pos[i * 3] = point.x;
      pos[i * 3 + 1] = point.y;
      pos[i * 3 + 2] = point.z;
    }
    
    return { positions: pos, offsets: off };
  }, [curve]);
  
  useFrame((state) => {
    if (particlesRef.current) {
      const positionAttribute = particlesRef.current.geometry.getAttribute("position");
      const positions = positionAttribute.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const t = (offsets[i] + state.clock.elapsedTime * 0.1) % 1;
        const point = curve.getPointAt(t);
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      }
      
      positionAttribute.needsUpdate = true;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.15}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

interface PipelineVariantProps {
  routeId: string;
  variant: PipelineVariant;
  color: number;
}

const VARIANT_ALT_LABELS: Record<string, string> = {
  BOTTOM: '1000ft', CENTER: '1500ft', TOP: '2000ft',
};

function PipelineVariantRoute({ routeId, variant, color }: PipelineVariantProps) {
  const routeConfig = ROUTE_CONFIGS[routeId as keyof typeof ROUTE_CONFIGS];
  
  const pipeline = useSimulation((state) =>
    state.pipelines.find((p) => p.id === `${routeId}-${variant}`)
  );
  
  const curve = useMemo(() => {
    const alt = VARIANT_ALTITUDES[variant] ?? 2.4;
    const lat = VARIANT_LATERAL[variant] ?? 0;
    const start = routeConfig.baseStart.clone().add(new THREE.Vector3(0, alt, lat));
    const end   = routeConfig.baseEnd.clone().add(new THREE.Vector3(0, alt, lat));
    const ctrl1 = routeConfig.control1.clone().add(new THREE.Vector3(0, alt, lat * 0.5));
    const ctrl2 = routeConfig.control2.clone().add(new THREE.Vector3(0, alt, lat * 0.5));
    return new THREE.CubicBezierCurve3(start, ctrl1, ctrl2, end);
  }, [routeConfig, variant]);
  
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 0.05, 8, false);
  }, [curve]);
  
  const glowGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 0.15, 8, false);
  }, [curve]);
  
  const midPoint = useMemo(() => {
    return curve.getPointAt(0.5);
  }, [curve]);
  
  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      <mesh geometry={glowGeometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2}
        />
      </mesh>
      
      <FlowParticles curve={curve} color={color} />
      
      <Text position={[midPoint.x, midPoint.y + 0.4, midPoint.z]} fontSize={0.22} color={color} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor={0x000000}>
        {routeId} {variant} · {VARIANT_ALT_LABELS[variant]}
      </Text>
    </group>
  );
}

interface RouteProps {
  routeId: string;
}

function Route({ routeId }: RouteProps) {
  const variants: Array<{ variant: PipelineVariant; color: number }> = [
    { variant: "CENTER", color: 0xff00ff },
    { variant: "TOP", color: 0xffa500 },
    { variant: "BOTTOM", color: 0x00ffff },
  ];
  
  return (
    <group>
      {variants.map(({ variant, color }) => (
        <PipelineVariantRoute
          key={`${routeId}-${variant}`}
          routeId={routeId}
          variant={variant}
          color={color}
        />
      ))}
    </group>
  );
}

export function Pipelines() {
  return (
    <group>
      <Route routeId="N-S" />
      <Route routeId="E-W" />
    </group>
  );
}
