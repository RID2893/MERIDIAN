import { useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { useSimulation, type CityName, type Gate } from "@/lib/stores/useSimulation";
import { useShallow } from "zustand/react/shallow";

interface CityRingProps {
  cityId: CityName;
  position: [number, number, number];
}

function GateSphere({ gate, cityPosition }: { gate: Gate; cityPosition: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selectGate = useSimulation((state) => state.selectGate);
  const selectedGateId = useSimulation((state) => state.selectedGateId);
  const isSelected = selectedGateId === gate.id;
  
  const color = useMemo(() => {
    switch (gate.status) {
      case "GREEN": return 0x00ff00;
      case "YELLOW": return 0xffff00;
      case "RED": return 0xff0000;
      default: return 0x00ff00;
    }
  }, [gate.status]);
  
  const gatePosition = useMemo(() => {
    const angleRad = (gate.angle * Math.PI) / 180;
    const x = cityPosition[0] + Math.cos(angleRad) * 4.2;
    const z = cityPosition[2] + Math.sin(angleRad) * 4.2;
    const y = cityPosition[1];
    return [x, y, z] as [number, number, number];
  }, [gate.angle, cityPosition]);
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectGate(isSelected ? null : gate.id);
  };
  
  const scale = hovered || isSelected ? 1.5 : 1;
  
  return (
    <mesh
      ref={meshRef}
      position={gatePosition}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      scale={scale}
    >
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial
        color={isSelected ? 0xffffff : color}
        emissive={isSelected ? 0xffffff : color}
        emissiveIntensity={isSelected ? 1 : hovered ? 0.8 : 0.4}
      />
    </mesh>
  );
}

export function CityRing({ cityId, position }: CityRingProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const gates = useSimulation(
    useShallow((state) => state.gates.filter((g) => g.cityId === cityId))
  );
  
  const ringGeometry = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, 6, 6, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(128);
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, 0, p.y))
    );
    return geometry;
  }, []);
  
  useFrame((state) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });
  
  return (
    <group position={position}>
      <lineSegments ref={ringRef as any} geometry={ringGeometry}>
        <lineBasicMaterial color={0x00ffff} linewidth={3} />
      </lineSegments>
      
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.8, 6.2, 128]} />
        <meshStandardMaterial
          color={0x00ffff}
          emissive={0x00ffff}
          emissiveIntensity={0.8}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {gates.map((gate) => (
        <GateSphere key={gate.id} gate={gate} cityPosition={position} />
      ))}
      
    </group>
  );
}
