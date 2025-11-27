import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimulation, type Aircraft as AircraftType } from "@/lib/stores/useSimulation";

const SD_POSITION: [number, number, number] = [-12, 0, 0];
const LA_POSITION: [number, number, number] = [12, 0, 8];

const PIPELINE_PATHS = {
  "N-S": {
    start: new THREE.Vector3(SD_POSITION[0], 2, SD_POSITION[2] - 6),
    end: new THREE.Vector3(LA_POSITION[0], 2, LA_POSITION[2] - 6),
    control1: new THREE.Vector3(-4, 4, -3),
    control2: new THREE.Vector3(4, 4, 5),
  },
  "E-W": {
    start: new THREE.Vector3(SD_POSITION[0] + 6, 1.5, SD_POSITION[2]),
    end: new THREE.Vector3(LA_POSITION[0] - 6, 1.5, LA_POSITION[2]),
    control1: new THREE.Vector3(-2, 3, 2),
    control2: new THREE.Vector3(8, 3, 6),
  },
};

function AircraftMesh({ aircraft }: { aircraft: AircraftType }) {
  const meshRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Points>(null);
  
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
      const cityPos = aircraft.cityId === "San Diego" ? SD_POSITION : LA_POSITION;
      const angleRad = (aircraft.angleOnRing * Math.PI) / 180;
      const x = cityPos[0] + Math.cos(angleRad) * (aircraft.distanceFromCenter - 1);
      const z = cityPos[2] + Math.sin(angleRad) * (aircraft.distanceFromCenter - 1);
      const y = cityPos[1] + (aircraft.altitude / 1250) * 2;
      return new THREE.Vector3(x, y, z);
    }
    
    if (aircraft.status === "in_pipeline" && aircraft.pipelineId) {
      const path = PIPELINE_PATHS[aircraft.pipelineId];
      const curve = new THREE.CubicBezierCurve3(
        path.start,
        path.control1,
        path.control2,
        path.end
      );
      return curve.getPointAt(aircraft.pipelineProgress);
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
      const path = PIPELINE_PATHS[aircraft.pipelineId];
      const curve = new THREE.CubicBezierCurve3(
        path.start,
        path.control1,
        path.control2,
        path.end
      );
      const tangent = curve.getTangentAt(aircraft.pipelineProgress);
      return new THREE.Euler(0, Math.atan2(tangent.x, tangent.z), 0);
    }
    return new THREE.Euler(0, 0, 0);
  }, [aircraft]);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(position);
      meshRef.current.rotation.copy(rotation);
    }
  });
  
  return (
    <group ref={meshRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
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
