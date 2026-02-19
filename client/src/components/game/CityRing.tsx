import { useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useSimulation, RING_CONFIGS, type CityName, type Gate, type RingLevel } from "@/lib/stores/useSimulation";
import { useShallow } from "zustand/react/shallow";

const RING_RADIUS = 6;

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
      case "YELLOW": return 0xffa500;
      case "RED": return 0xff0000;
      default: return 0x00ff00;
    }
  }, [gate.status]);
  
  const gatePosition = useMemo(() => {
    const angleRad = (gate.angle * Math.PI) / 180;
    const x = Math.cos(angleRad) * RING_RADIUS;
    const z = Math.sin(angleRad) * RING_RADIUS;
    const y = 0;
    return [x, y, z] as [number, number, number];
  }, [gate.angle]);
  
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectGate(isSelected ? null : gate.id);
  };
  
  const scale = hovered || isSelected ? 1.5 : 1;
  
  const gateNumber = gate.id.split("-").pop() || "";
  
  return (
    <group position={gatePosition}>
      <mesh
        ref={meshRef}
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
      
      <Text
        position={[0, 0.3, 0]}
        fontSize={0.25}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor={0x000000}
      >
        {gate.id.split("-").slice(1).join("-")}
      </Text>
    </group>
  );
}

const RING_LABELS: Record<RingLevel, string> = {
  1: "RING 1 · 150ft · URBAN",
  2: "RING 2 · 500ft · CORRIDOR",
  3: "RING 3 · 1000ft · REGIONAL",
};

function AerialRing({ ringLevel }: { ringLevel: RingLevel }) {
  const cfg = RING_CONFIGS[ringLevel];
  const height = (cfg.altitude / 1250) * 2;
  const ringGeometry = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, cfg.radius, cfg.radius, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(128);
    return new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(p.x, 0, p.y))
    );
  }, [cfg.radius]);

  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 1.5 + ringLevel) * 0.05;
    }
  });

  return (
    <group position={[0, height, 0]}>
      <lineSegments geometry={ringGeometry}>
        <lineBasicMaterial color={cfg.color} linewidth={2} transparent opacity={0.6} />
      </lineSegments>
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[cfg.radius - 0.12, cfg.radius + 0.12, 128]} />
        <meshStandardMaterial
          color={cfg.color}
          emissive={cfg.color}
          emissiveIntensity={0.4}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Text
        position={[cfg.radius + 0.3, 0, 0]}
        fontSize={0.3}
        color={cfg.color}
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor={0x000000}
      >
        {RING_LABELS[ringLevel]}
      </Text>
    </group>
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

      {/* Aerial Operation Volume Rings */}
      <AerialRing ringLevel={1} />
      <AerialRing ringLevel={2} />
      <AerialRing ringLevel={3} />

      {/* Cardinal Markers */}
      <Text position={[0, 0.1, -6.8]} fontSize={0.6} color={0x00ffff} anchorX="center" anchorY="middle">
        N
      </Text>
      <Text position={[6.8, 0.1, 0]} fontSize={0.6} color={0x00ffff} anchorX="center" anchorY="middle">
        E
      </Text>
      <Text position={[0, 0.1, 6.8]} fontSize={0.6} color={0x00ffff} anchorX="center" anchorY="middle">
        S
      </Text>
      <Text position={[-6.8, 0.1, 0]} fontSize={0.6} color={0x00ffff} anchorX="center" anchorY="middle">
        W
      </Text>
      
      {/* City Name */}
      <Text position={[0, 0.1, 0]} fontSize={0.8} color={0x00ffff} anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor={0x000000}>
        {cityId === "San Diego" ? "SAN DIEGO" : "LOS ANGELES"}
      </Text>
      
      {/* Quadrant Dividers */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={4} array={new Float32Array([0, 0.05, -6, 0, 0.05, 6, -6, 0.05, 0, 6, 0.05, 0])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={0x00ffff} linewidth={2} opacity={0.5} transparent />
      </lineSegments>
    </group>
  );
}
