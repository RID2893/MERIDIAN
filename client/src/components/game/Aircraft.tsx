import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import { useSimulation, type Aircraft as AircraftType } from "@/lib/stores/useSimulation";

const SD_POSITION: [number, number, number] = [-12, 0, 0];
const LA_POSITION: [number, number, number] = [12, 0, 8];

const ROUTE_BASE_PATHS = {
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

const VARIANT_OFFSETS = {
  CENTER: { offset: 0, altitude: 1.5 },
  TOP: { offset: 0.5, altitude: 2.0 },
  BOTTOM: { offset: -0.5, altitude: 1.0 },
};

function getPipelinePath(pipelineId: string) {
  const parts = pipelineId.split("-");
  const variant = parts[parts.length - 1] as keyof typeof VARIANT_OFFSETS;
  const routeId = parts.slice(0, -1).join("-") as keyof typeof ROUTE_BASE_PATHS;
  
  const baseRoute = ROUTE_BASE_PATHS[routeId];
  if (!baseRoute) return null;
  
  const variantInfo = VARIANT_OFFSETS[variant] || VARIANT_OFFSETS.CENTER;
  const offsetAmount = variantInfo.offset;
  
  const start = baseRoute.baseStart.clone().add(new THREE.Vector3(0, variantInfo.altitude, offsetAmount));
  const end = baseRoute.baseEnd.clone().add(new THREE.Vector3(0, variantInfo.altitude, offsetAmount));
  const control1 = baseRoute.control1.clone().add(new THREE.Vector3(0, variantInfo.altitude, offsetAmount * 0.5));
  const control2 = baseRoute.control2.clone().add(new THREE.Vector3(0, variantInfo.altitude, offsetAmount * 0.5));
  
  return { start, end, control1, control2 };
}

const TRAIL_LENGTH = 15;
const MAX_TRAIL_POSITIONS = 20;

function AircraftMesh({ aircraft }: { aircraft: AircraftType }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const trailPositionsRef = useRef<THREE.Vector3[]>([]);
  const trailGeometryRef = useRef<THREE.BufferGeometry>(null);
  
  const position = useMemo(() => {
    if (aircraft.status === "in_ring" && aircraft.cityId) {
      const cityPos = aircraft.cityId === "San Diego" ? SD_POSITION : LA_POSITION;
      const angleRad = (aircraft.angleOnRing * Math.PI) / 180;
      const x = cityPos[0] + Math.cos(angleRad) * aircraft.distanceFromCenter;
      const z = cityPos[2] + Math.sin(angleRad) * aircraft.distanceFromCenter;
      const y = cityPos[1] + (aircraft.altitude / 1250) * 2;
      return new THREE.Vector3(x, y, z);
    }
    
    if (aircraft.status === "descending" || aircraft.status === "ascending" || aircraft.status === "landed") {
      const cityPos = aircraft.cityId === "San Diego" ? SD_POSITION : 
                      aircraft.originCity === "San Diego" ? SD_POSITION : LA_POSITION;
      const angleRad = (aircraft.angleOnRing * Math.PI) / 180;
      const x = cityPos[0] + Math.cos(angleRad) * (aircraft.distanceFromCenter - 1);
      const z = cityPos[2] + Math.sin(angleRad) * (aircraft.distanceFromCenter - 1);
      const y = cityPos[1] + (aircraft.altitude / 1250) * 2;
      return new THREE.Vector3(x, y, z);
    }
    
    if (aircraft.status === "in_pipeline" && aircraft.pipelineId) {
      const path = getPipelinePath(aircraft.pipelineId);
      if (path) {
        const curve = new THREE.CubicBezierCurve3(
          path.start,
          path.control1,
          path.control2,
          path.end
        );
        return curve.getPointAt(aircraft.pipelineProgress);
      }
    }
    
    return new THREE.Vector3(0, 0, 0);
  }, [aircraft]);
  
  const rotation = useMemo(() => {
    if (aircraft.status === "in_ring") {
      return new THREE.Euler(0, (aircraft.angleOnRing * Math.PI) / 180 + Math.PI / 2, 0);
    }
    if (aircraft.status === "descending") {
      return new THREE.Euler(-Math.PI / 4, (aircraft.angleOnRing * Math.PI) / 180, 0);
    }
    if (aircraft.status === "ascending") {
      return new THREE.Euler(Math.PI / 4, (aircraft.angleOnRing * Math.PI) / 180, 0);
    }
    if (aircraft.status === "in_pipeline" && aircraft.pipelineId) {
      const path = getPipelinePath(aircraft.pipelineId);
      if (path) {
        const curve = new THREE.CubicBezierCurve3(
          path.start,
          path.control1,
          path.control2,
          path.end
        );
        const tangent = curve.getTangentAt(aircraft.pipelineProgress);
        return new THREE.Euler(0, Math.atan2(tangent.x, tangent.z), 0);
      }
    }
    return new THREE.Euler(0, 0, 0);
  }, [aircraft]);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.rotation.copy(rotation);
    }
    
    if (trailPositionsRef.current.length >= MAX_TRAIL_POSITIONS) {
      trailPositionsRef.current.shift();
    }
    trailPositionsRef.current.push(position.clone());
    
    if (trailGeometryRef.current && trailPositionsRef.current.length > 1) {
      const positions = new Float32Array(trailPositionsRef.current.length * 3);
      trailPositionsRef.current.forEach((pos, i) => {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
      });
      trailGeometryRef.current.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      trailGeometryRef.current.setDrawRange(0, trailPositionsRef.current.length);
    }
  });
  
  const trailColor = useMemo(() => {
    if (aircraft.status === "descending") return 0x00ff00;
    if (aircraft.status === "ascending") return 0xffff00;
    if (aircraft.status === "in_pipeline") return 0xff8800;
    return aircraft.color;
  }, [aircraft.status, aircraft.color]);
  
  return (
    <>
      <group ref={groupRef}>
        <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshStandardMaterial
            color={aircraft.color}
            emissive={aircraft.color}
            emissiveIntensity={0.3}
          />
        </mesh>
        
        <pointLight
          color={aircraft.color}
          intensity={0.3}
          distance={1}
        />
      </group>
      
      <line>
        <bufferGeometry ref={trailGeometryRef}>
          <bufferAttribute
            attach="attributes-position"
            count={MAX_TRAIL_POSITIONS}
            array={new Float32Array(MAX_TRAIL_POSITIONS * 3)}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={trailColor}
          transparent
          opacity={0.4}
          linewidth={1}
        />
      </line>
    </>
  );
}

export function AircraftRenderer() {
  const aircraft = useSimulation((state) => state.aircraft);
  
  return (
    <group>
      {aircraft.map((ac) => (
        <AircraftMesh key={ac.id} aircraft={ac} />
      ))}
    </group>
  );
}
