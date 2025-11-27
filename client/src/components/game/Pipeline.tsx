import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimulation, type PipelineName } from "@/lib/stores/useSimulation";

const SD_POSITION: [number, number, number] = [-12, 0, 0];
const LA_POSITION: [number, number, number] = [12, 0, 8];

const PIPELINE_CONFIGS = {
  "N-S": {
    start: new THREE.Vector3(SD_POSITION[0], 2, SD_POSITION[2] - 6),
    end: new THREE.Vector3(LA_POSITION[0], 2, LA_POSITION[2] - 6),
    control1: new THREE.Vector3(-4, 4, -3),
    control2: new THREE.Vector3(4, 4, 5),
    colorStart: 0x00ffff,
    colorEnd: 0xff00ff,
  },
  "E-W": {
    start: new THREE.Vector3(SD_POSITION[0] + 6, 1.5, SD_POSITION[2]),
    end: new THREE.Vector3(LA_POSITION[0] - 6, 1.5, LA_POSITION[2]),
    control1: new THREE.Vector3(-2, 3, 2),
    control2: new THREE.Vector3(8, 3, 6),
    colorStart: 0xff00ff,
    colorEnd: 0x00ffff,
  },
};

interface PipelineRouteProps {
  pipelineId: PipelineName;
}

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

function PipelineRoute({ pipelineId }: PipelineRouteProps) {
  const config = PIPELINE_CONFIGS[pipelineId];
  const pipeline = useSimulation((state) => 
    state.pipelines.find((p) => p.id === pipelineId)
  );
  
  const curve = useMemo(() => {
    return new THREE.CubicBezierCurve3(
      config.start,
      config.control1,
      config.control2,
      config.end
    );
  }, [config]);
  
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 0.05, 8, false);
  }, [curve]);
  
  const glowGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, 0.15, 8, false);
  }, [curve]);
  
  const linePoints = useMemo(() => {
    return curve.getPoints(64);
  }, [curve]);
  
  const lineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(linePoints);
  }, [linePoints]);
  
  const utilizationColor = useMemo(() => {
    if (!pipeline) return 0x00ff00;
    const utilization = pipeline.currentCount / pipeline.capacity;
    if (utilization < 0.7) return 0x00ff00;
    if (utilization < 0.85) return 0xffff00;
    return 0xff0000;
  }, [pipeline]);
  
  const midPoint = useMemo(() => {
    return curve.getPointAt(0.5);
  }, [curve]);
  
  return (
    <group>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color={config.colorStart}
          emissive={config.colorStart}
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      <mesh geometry={glowGeometry}>
        <meshBasicMaterial
          color={config.colorStart}
          transparent
          opacity={0.2}
        />
      </mesh>
      
      <FlowParticles curve={curve} color={config.colorEnd} />
      
      <mesh position={[midPoint.x, midPoint.y + 0.5, midPoint.z]}>
        <planeGeometry args={[1.5, 0.3]} />
        <meshBasicMaterial
          color={0x000000}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

export function Pipelines() {
  return (
    <group>
      <PipelineRoute pipelineId="N-S" />
      <PipelineRoute pipelineId="E-W" />
    </group>
  );
}
