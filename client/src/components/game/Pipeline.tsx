import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { useSimulation, type PipelineVariant } from "@/lib/stores/useSimulation";
import { Text } from "@react-three/drei";

const SD_POSITION: [number, number, number] = [-12, 0, 0];
const LA_POSITION: [number, number, number] = [12, 0, 8];

const ROUTE_CONFIGS = {
  "N-S": {
    baseStart: new THREE.Vector3(SD_POSITION[0], 0, SD_POSITION[2] - 6),
    baseEnd: new THREE.Vector3(LA_POSITION[0], 0, LA_POSITION[2] - 6),
    control1: new THREE.Vector3(-4, 0, -3),
    control2: new THREE.Vector3(4, 0, 5),
  },
  "E-W": {
    baseStart: new THREE.Vector3(SD_POSITION[0] + 6, 0, SD_POSITION[2]),
    baseEnd: new THREE.Vector3(LA_POSITION[0] - 6, 0, LA_POSITION[2]),
    control1: new THREE.Vector3(-2, 0, 2),
    control2: new THREE.Vector3(8, 0, 6),
  },
};

// Corridor base altitudes in scene units (FAA RFI directional separation)
// N-S: 500ft base → (500/1250)*2 = 0.8 scene units
// E-W: 550ft base → (550/1250)*2 = 0.88 scene units
const CORRIDOR_BASE_ALT: Record<string, number> = {
  'N-S': (500 / 1250) * 2,
  'E-W': (550 / 1250) * 2,
};

const VARIANT_OFFSETS = {
  CENTER: { offset: 0, altOffset: 0 },
  TOP: { offset: 0.5, altOffset: 0.25 },
  BOTTOM: { offset: -0.5, altOffset: -0.25 },
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

function PipelineVariantRoute({ routeId, variant, color }: PipelineVariantProps) {
  const routeConfig = ROUTE_CONFIGS[routeId as keyof typeof ROUTE_CONFIGS];
  const variantOffset = VARIANT_OFFSETS[variant];
  
  const pipeline = useSimulation((state) =>
    state.pipelines.find((p) => p.id === `${routeId}-${variant}`)
  );
  
  const curve = useMemo(() => {
    const offsetAmount = variantOffset.offset;
    const baseAlt = CORRIDOR_BASE_ALT[routeId] || 0.8;
    const totalAlt = baseAlt + variantOffset.altOffset;
    const start = routeConfig.baseStart.clone().add(new THREE.Vector3(0, totalAlt, offsetAmount));
    const end = routeConfig.baseEnd.clone().add(new THREE.Vector3(0, totalAlt, offsetAmount));
    const ctrl1 = routeConfig.control1.clone().add(new THREE.Vector3(0, totalAlt, offsetAmount * 0.5));
    const ctrl2 = routeConfig.control2.clone().add(new THREE.Vector3(0, totalAlt, offsetAmount * 0.5));

    return new THREE.CubicBezierCurve3(start, ctrl1, ctrl2, end);
  }, [routeConfig, variantOffset, routeId]);
  
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
      
      <Text position={[midPoint.x, midPoint.y + 0.5, midPoint.z]} fontSize={0.25} color={color} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor={0x000000}>
        {routeId} {variant}
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
