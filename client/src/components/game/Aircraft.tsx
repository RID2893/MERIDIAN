import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useSimulation, RING_CONFIGS, OPERATOR_CONFIGS, type Aircraft as AircraftType } from "@/lib/stores/useSimulation";
import { buildApproachCurve, clamp } from "@/lib/approachPath";

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
  CENTER: { offset: 0, altitude: 0 },
  TOP: { offset: 0.5, altitude: 0.25 },
  BOTTOM: { offset: -0.5, altitude: -0.25 },
};

const CORRIDOR_BASE_ALT = {
  'N-S': (500 / 1250) * 2,
  'E-W': (550 / 1250) * 2,
};

function getOperatorCallsign(aircraft: AircraftType): string {
  const num = parseInt(aircraft.id.replace(/\D/g, '')) || 0;
  return `${aircraft.operator}-${String(num).padStart(3, '0')}`;
}

function getDisplayAltFt(aircraft: AircraftType): number {
  if (aircraft.status === 'landed') return 0;
  if (aircraft.status === 'in_ring') return RING_CONFIGS[aircraft.ringLevel].altitude;
  if (aircraft.status === 'in_pipeline' && aircraft.pipelineId) {
    const isNS = aircraft.pipelineId.includes('N-S');
    const baseAlt = isNS ? 500 : 550;
    if (aircraft.pipelineId.includes('TOP')) return baseAlt + 100;
    if (aircraft.pipelineId.includes('BOTTOM')) return baseAlt - 50;
    return baseAlt;
  }
  const ringAlt = RING_CONFIGS[aircraft.ringLevel].altitude;
  return Math.round(Math.max(0, (aircraft.altitude / ringAlt)) * ringAlt);
}

function getOpVolume(aircraft: AircraftType): string {
  if (aircraft.status === 'in_ring') return `RING-${aircraft.ringLevel}`;
  if (aircraft.status === 'in_pipeline') {
    return aircraft.pipelineId?.split('-').slice(0, 2).join('-') || 'COR';
  }
  if (aircraft.status === 'descending') return 'DESC';
  if (aircraft.status === 'ascending') return 'ASC';
  return 'GND';
}

function getPipelinePath(pipelineId: string) {
  const parts = pipelineId.split("-");
  const variant = parts[parts.length - 1] as keyof typeof VARIANT_OFFSETS;
  const routeId = parts.slice(0, -1).join("-") as keyof typeof ROUTE_BASE_PATHS;

  const baseRoute = ROUTE_BASE_PATHS[routeId];
  if (!baseRoute) return null;

  const variantInfo = VARIANT_OFFSETS[variant] || VARIANT_OFFSETS.CENTER;
  const offsetAmount = variantInfo.offset;
  const baseAlt = CORRIDOR_BASE_ALT[routeId] || 0.8;
  const totalAlt = baseAlt + variantInfo.altitude;

  const start = baseRoute.baseStart.clone().add(new THREE.Vector3(0, totalAlt, offsetAmount));
  const end = baseRoute.baseEnd.clone().add(new THREE.Vector3(0, totalAlt, offsetAmount));
  const control1 = baseRoute.control1.clone().add(new THREE.Vector3(0, totalAlt, offsetAmount * 0.5));
  const control2 = baseRoute.control2.clone().add(new THREE.Vector3(0, totalAlt, offsetAmount * 0.5));

  return { start, end, control1, control2 };
}

/** Dynamic point-light intensity per aircraft status */
function getLightIntensity(status: AircraftType['status']): number {
  switch (status) {
    case 'descending':
    case 'ascending':   return 1.0;
    case 'in_pipeline': return 0.6;
    case 'landed':      return 0.1;
    default:            return 0.3;
  }
}

const MAX_TRAIL_POSITIONS = 30;

interface AircraftMeshProps {
  aircraft: AircraftType;
  gate: { angle: number; distance: number } | null;
}

function AircraftMesh({ aircraft, gate }: AircraftMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const trailPositionsRef = useRef<THREE.Vector3[]>([]);
  const trailGeometryRef = useRef<THREE.BufferGeometry>(null);

  const cityPos: [number, number, number] = useMemo(() => {
    if (aircraft.status === 'in_ring') {
      return aircraft.cityId === "San Diego" ? SD_POSITION : LA_POSITION;
    }
    // descending/ascending/landed: use originCity
    return (aircraft.cityId === "San Diego" || aircraft.originCity === "San Diego")
      ? SD_POSITION : LA_POSITION;
  }, [aircraft.status, aircraft.cityId, aircraft.originCity]);

  /** Approach Bezier — built once per gate assignment */
  const approachCurve = useMemo(() => {
    if (!gate) return null;
    const ringCfg = RING_CONFIGS[aircraft.ringLevel];
    const ringAltScene = (ringCfg.altitude / 1250) * 2;
    return buildApproachCurve(
      cityPos,
      gate.angle,
      gate.distance,
      ringCfg.radius,
      ringAltScene
    );
  }, [gate, aircraft.ringLevel, cityPos]);

  const position = useMemo(() => {
    if (aircraft.status === "in_ring") {
      const angleRad = (aircraft.angleOnRing * Math.PI) / 180;
      return new THREE.Vector3(
        cityPos[0] + Math.cos(angleRad) * aircraft.distanceFromCenter,
        cityPos[1] + (aircraft.altitude / 1250) * 2,
        cityPos[2] + Math.sin(angleRad) * aircraft.distanceFromCenter
      );
    }

    if (aircraft.status === "descending" && approachCurve) {
      const ringAlt = RING_CONFIGS[aircraft.ringLevel].altitude;
      const t = 1 - clamp(aircraft.altitude / ringAlt, 0, 1);
      return approachCurve.getPointAt(t);
    }

    if (aircraft.status === "ascending" && approachCurve) {
      const ringAlt = RING_CONFIGS[aircraft.ringLevel].altitude;
      const t = clamp(aircraft.altitude / ringAlt, 0, 1);
      return approachCurve.getPointAt(t);
    }

    // Fallback for descending/ascending without a known gate (legacy polar path)
    if (aircraft.status === "descending" || aircraft.status === "ascending" || aircraft.status === "landed") {
      const angleRad = (aircraft.angleOnRing * Math.PI) / 180;
      return new THREE.Vector3(
        cityPos[0] + Math.cos(angleRad) * (aircraft.distanceFromCenter - 1),
        cityPos[1] + (aircraft.altitude / 1250) * 2,
        cityPos[2] + Math.sin(angleRad) * (aircraft.distanceFromCenter - 1)
      );
    }

    if (aircraft.status === "in_pipeline" && aircraft.pipelineId) {
      const path = getPipelinePath(aircraft.pipelineId);
      if (path) {
        const curve = new THREE.CubicBezierCurve3(
          path.start, path.control1, path.control2, path.end
        );
        return curve.getPointAt(aircraft.pipelineProgress);
      }
    }

    return new THREE.Vector3(0, 0, 0);
  }, [aircraft, approachCurve, cityPos]);

  const rotation = useMemo(() => {
    if (aircraft.status === "in_ring") {
      return new THREE.Euler(0, (aircraft.angleOnRing * Math.PI) / 180 + Math.PI / 2, 0);
    }

    // For approach states, point nose along Bezier tangent
    if ((aircraft.status === "descending" || aircraft.status === "ascending") && approachCurve) {
      const ringAlt = RING_CONFIGS[aircraft.ringLevel].altitude;
      const t = aircraft.status === "descending"
        ? 1 - clamp(aircraft.altitude / ringAlt, 0.01, 0.99)
        : clamp(aircraft.altitude / ringAlt, 0.01, 0.99);
      const tangent = approachCurve.getTangentAt(t);
      // For ascending, reverse the tangent so nose faces up the climb
      const dir = aircraft.status === "ascending" ? tangent.negate() : tangent;
      const pitch = Math.atan2(-dir.y, Math.sqrt(dir.x * dir.x + dir.z * dir.z));
      const yaw = Math.atan2(dir.x, dir.z);
      return new THREE.Euler(pitch, yaw, 0);
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
          path.start, path.control1, path.control2, path.end
        );
        const tangent = curve.getTangentAt(aircraft.pipelineProgress);
        return new THREE.Euler(0, Math.atan2(tangent.x, tangent.z), 0);
      }
    }
    return new THREE.Euler(0, 0, 0);
  }, [aircraft, approachCurve]);

  useFrame(({ clock }: { clock: { elapsedTime: number } }) => {
    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.rotation.copy(rotation);

      // Landed aircraft: slow hover bob
      if (aircraft.status === 'landed') {
        groupRef.current.position.y += Math.sin(clock.elapsedTime * 1.5) * 0.04;
      }
    }

    // Dynamic light intensity
    if (lightRef.current) {
      lightRef.current.intensity = getLightIntensity(aircraft.status);
    }

    // Trail update — keep last MAX_TRAIL_POSITIONS positions
    if (trailPositionsRef.current.length >= MAX_TRAIL_POSITIONS) {
      trailPositionsRef.current.shift();
    }
    trailPositionsRef.current.push(position.clone());

    if (trailGeometryRef.current && trailPositionsRef.current.length > 1) {
      const count = trailPositionsRef.current.length;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      // Determine trail color
      let r = 0, g = 0, b = 0;
      if (aircraft.status === 'descending') { r = 0; g = 1; b = 0; }
      else if (aircraft.status === 'ascending') { r = 1; g = 1; b = 0; }
      else if (aircraft.status === 'in_pipeline') { r = 1; g = 0.53; b = 0; }
      else {
        const hex = aircraft.color;
        r = ((hex >> 16) & 0xff) / 255;
        g = ((hex >> 8) & 0xff) / 255;
        b = (hex & 0xff) / 255;
      }

      trailPositionsRef.current.forEach((pos, i) => {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        // Fade: index 0 = tail (transparent), index count-1 = head (bright)
        const alpha = i / (count - 1);
        colors[i * 3] = r * alpha;
        colors[i * 3 + 1] = g * alpha;
        colors[i * 3 + 2] = b * alpha;
      });

      trailGeometryRef.current.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      trailGeometryRef.current.setAttribute(
        "color",
        new THREE.BufferAttribute(colors, 3)
      );
      trailGeometryRef.current.setDrawRange(0, count);
    }
  });

  const callsign = useMemo(() => getOperatorCallsign(aircraft), [aircraft.id, aircraft.operator]);
  const opColor = OPERATOR_CONFIGS[aircraft.operator].hex;
  const altFt = getDisplayAltFt(aircraft);
  const speedKph = Math.round(aircraft.speed * 240);
  const opVolume = getOpVolume(aircraft);
  const tickerBorder = useMemo(() => {
    switch (aircraft.status) {
      case 'in_ring':     return opColor;
      case 'in_pipeline': return '#ffaa00';
      case 'descending':  return '#00ff88';
      case 'ascending':   return '#ffff00';
      default:            return '#666';
    }
  }, [aircraft.status, opColor]);

  return (
    <>
      <group ref={groupRef}>
        <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshStandardMaterial
            color={aircraft.color}
            emissive={aircraft.color}
            emissiveIntensity={0.4}
          />
        </mesh>

        <pointLight
          ref={lightRef}
          color={aircraft.color}
          intensity={getLightIntensity(aircraft.status)}
          distance={1.5}
        />

        {aircraft.status !== 'landed' && (
          <Html
            position={[0, 0.5, 0]}
            center
            distanceFactor={20}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              background: 'rgba(0, 12, 24, 0.9)',
              border: `1px solid ${tickerBorder}`,
              borderRadius: '2px',
              padding: '1px 4px',
              fontFamily: "'Courier New', monospace",
              fontSize: '8px',
              lineHeight: '1.3',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}>
              <div style={{ color: opColor, fontWeight: 'bold', fontSize: '9px' }}>
                {callsign}
              </div>
              <div style={{ color: '#00ffcc' }}>
                {opVolume} {altFt}ft {speedKph}kph
              </div>
            </div>
          </Html>
        )}
      </group>

      {/* Gradient trail */}
      <line>
        <bufferGeometry ref={trailGeometryRef}>
          <bufferAttribute
            attach="attributes-position"
            count={MAX_TRAIL_POSITIONS}
            array={new Float32Array(MAX_TRAIL_POSITIONS * 3)}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={MAX_TRAIL_POSITIONS}
            array={new Float32Array(MAX_TRAIL_POSITIONS * 3)}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.85} linewidth={1} />
      </line>
    </>
  );
}

export function AircraftRenderer() {
  const aircraft = useSimulation((state) => state.aircraft);
  const gates = useSimulation((state) => state.gates);

  return (
    <group>
      {aircraft.map((ac) => {
        const gate = ac.targetGate
          ? (gates.find((g) => g.id === ac.targetGate) ?? null)
          : null;
        return (
          <AircraftMesh
            key={ac.id}
            aircraft={ac}
            gate={gate ? { angle: gate.angle, distance: gate.distance } : null}
          />
        );
      })}
    </group>
  );
}
