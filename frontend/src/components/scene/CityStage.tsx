import { Grid } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { InstancedMesh } from "three";
import { Color, Object3D } from "three";

import { LiveCityMap } from "../ui/LiveCityMap";

const PINS = [
  { x: -2.1, z: 1.4 },
  { x: 1.8, z: -0.6 },
  { x: 0.2, z: 2.6 },
  { x: 3.1, z: 1.1 },
];

const BUILDINGS = [
  { x: -3.2, z: -2.4, w: 0.9, h: 1.4, d: 0.9 },
  { x: -1.1, z: -2.8, w: 0.7, h: 0.9, d: 0.7 },
  { x: 2.4, z: -2.2, w: 1.1, h: 1.8, d: 0.8 },
  { x: 3.6, z: 0.4, w: 0.8, h: 1.1, d: 0.8 },
  { x: -3.4, z: 1.8, w: 1.0, h: 1.6, d: 0.7 },
  { x: 1.2, z: 3.4, w: 0.9, h: 1.2, d: 0.9 },
];

type Walker = {
  x: number;
  z: number;
  target: number;
  phase: number;
  speed: number;
};

function City({ live }: { live: boolean }) {
  const people = useRef<InstancedMesh>(null);
  const pins = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const neon = useMemo(() => new Color("#C8F542"), []);
  const violet = useMemo(() => new Color("#7A5CFF"), []);
  const walkers = useMemo<Walker[]>(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        x: Math.sin(index * 1.9) * 4.4,
        z: Math.cos(index * 1.35) * 4.8,
        target: index % PINS.length,
        phase: index * 0.41,
        speed: 0.35 + (index % 5) * 0.08,
      })),
    [],
  );

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const peopleMesh = people.current;
    const pinMesh = pins.current;
    if (pinMesh) {
      PINS.forEach((pin, index) => {
        const pulse = 1 + Math.sin(time * 2.2 + index) * 0.12;
        dummy.position.set(pin.x, 0.12, pin.z);
        dummy.scale.setScalar(0.12 * pulse);
        dummy.updateMatrix();
        pinMesh.setMatrixAt(index, dummy.matrix);
      });
      pinMesh.instanceMatrix.needsUpdate = true;
    }
    if (!peopleMesh) {
      return;
    }
    walkers.forEach((person, index) => {
      const goal = PINS[person.target];
      const idleX = person.x + Math.sin(time * 0.25 + person.phase) * 0.25;
      const idleZ = person.z + Math.cos(time * 0.22 + person.phase) * 0.25;
      const t = live ? Math.min(1, 0.35 + Math.sin(time * person.speed + person.phase) * 0.5 + 0.5) : 0.08;
      dummy.position.set(idleX + (goal.x - idleX) * t, 0.08, idleZ + (goal.z - idleZ) * t);
      dummy.scale.setScalar(0.07);
      dummy.updateMatrix();
      peopleMesh.setMatrixAt(index, dummy.matrix);
    });
    peopleMesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[11, 64]} />
        <meshStandardMaterial color="#111113" roughness={1} />
      </mesh>
      <Grid
        infiniteGrid
        fadeDistance={16}
        fadeStrength={2.4}
        cellSize={0.6}
        sectionSize={3}
        cellColor="#27272A"
        sectionColor="#C8F542"
        position={[0, 0.01, 0]}
      />
      {BUILDINGS.map((building) => (
        <mesh key={`${building.x}-${building.z}`} position={[building.x, building.h / 2, building.z]}>
          <boxGeometry args={[building.w, building.h, building.d]} />
          <meshStandardMaterial color="#18181B" roughness={0.9} />
        </mesh>
      ))}
      <instancedMesh ref={pins} args={[undefined, undefined, PINS.length]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial color={neon} emissive={neon} emissiveIntensity={0.85} />
      </instancedMesh>
      <instancedMesh ref={people} args={[undefined, undefined, walkers.length]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color="#FAFAFA" emissive={violet} emissiveIntensity={0.55} />
      </instancedMesh>
    </>
  );
}

function CameraRig() {
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    state.camera.position.x = 5.6 + Math.sin(time * 0.08) * 0.35;
    state.camera.position.z = 8.2 + Math.cos(time * 0.07) * 0.25;
    state.camera.lookAt(0, 0.4, 0);
  });
  return null;
}

type Props = {
  className?: string;
};

export function CityStage({ className = "" }: Props) {
  const reduce = useReducedMotion();
  const [live, setLive] = useState(false);

  if (reduce === true) {
    return <LiveCityMap className={className} />;
  }

  return (
    <div
      className={`map-stage relative h-full w-full ${className}`}
      onPointerEnter={() => setLive(true)}
      onPointerLeave={() => setLive(false)}
    >
      <Canvas
        camera={{ position: [5.6, 6.1, 8.2], fov: 36 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: false }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#08090C"]} />
        <fog attach="fog" args={["#08090C", 8, 22]} />
        <ambientLight intensity={0.22} />
        <pointLight position={[5, 7, 3]} intensity={1.35} color="#C8F542" />
        <pointLight position={[-5, 5, -2]} intensity={0.7} color="#7A5CFF" />
        <City live={live} />
        <CameraRig />
      </Canvas>
    </div>
  );
}
