import { useMemo } from "react";
import * as THREE from "three";
import { useSimulation, RING_CONFIGS, OPERATOR_CONFIGS } from "@/lib/stores/useSimulation";
import { buildApproachCurve } from "@/lib/approachPath";

const SD_POSITION: [number, number, number] = [-12, 0, 0];
const LA_POSITION: [number, number, number] = [12, 0, 8];

/**
 * Renders semi-transparent ILS approach path tubes for:
 *  - Descending aircraft (operator color, 25% opacity) — inbound glideslope
 *  - Ascending aircraft (yellow, 15% opacity) — departure climb-out path
 *
 * Each tube follows the exact same Bezier curve used to position the aircraft
 * in Aircraft.tsx, so the aircraft always travels inside the funnel.
 */
export function ApproachCorridors() {
  const aircraft = useSimulation((state) => state.aircraft);
  const gates = useSimulation((state) => state.gates);

  const corridors = useMemo(() => {
    const results: Array<{
      id: string;
      curve: THREE.CubicBezierCurve3;
      color: number;
      opacity: number;
    }> = [];

    for (const ac of aircraft) {
      if (ac.status !== 'descending' && ac.status !== 'ascending') continue;
      if (!ac.targetGate) continue;

      const gate = gates.find((g) => g.id === ac.targetGate);
      if (!gate) continue;

      const cityPos: [number, number, number] =
        ac.cityId === "San Diego" || ac.originCity === "San Diego"
          ? SD_POSITION
          : LA_POSITION;

      const ringCfg = RING_CONFIGS[ac.ringLevel];
      const ringAltScene = (ringCfg.altitude / 1250) * 2;

      const curve = buildApproachCurve(
        cityPos,
        gate.angle,
        gate.distance,
        ringCfg.radius,
        ringAltScene
      );

      const operatorCfg = OPERATOR_CONFIGS[ac.operator];
      const color = ac.status === 'descending'
        ? operatorCfg.color   // operator color for inbound
        : 0xffee00;           // yellow for departure climb-out

      const opacity = ac.status === 'descending' ? 0.25 : 0.15;

      results.push({ id: ac.id, curve, color, opacity });
    }

    return results;
  }, [aircraft, gates]);

  if (corridors.length === 0) return null;

  return (
    <group>
      {corridors.map(({ id, curve, color, opacity }) => (
        <CorridorTube key={id} curve={curve} color={color} opacity={opacity} />
      ))}
    </group>
  );
}

interface CorridorTubeProps {
  curve: THREE.CubicBezierCurve3;
  color: number;
  opacity: number;
}

function CorridorTube({ curve, color, opacity }: CorridorTubeProps) {
  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, 24, 0.055, 6, false),
    [curve]
  );

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
