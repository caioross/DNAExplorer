"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

function HelixMesh() {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.08;
  });

  const bps = 60;
  const radius = 1.3;
  const rise = 0.34;
  const items = [] as JSX.Element[];

  for (let i = 0; i < bps; i++) {
    const theta = (i / 10.5) * Math.PI * 2;
    const y = i * rise - (bps * rise) / 2;

    const ax = Math.cos(theta) * radius;
    const az = Math.sin(theta) * radius;
    const bx = Math.cos(theta + Math.PI) * radius;
    const bz = Math.sin(theta + Math.PI) * radius;

    const colorA = i % 2 ? "#22c55e" : "#3b82f6";
    const colorB = i % 2 ? "#ef4444" : "#eab308";

    items.push(
      <group key={i} position={[0, y, 0]}>
        <mesh position={[ax * 0.5, 0, az * 0.5]}>
          <cylinderGeometry args={[0.05, 0.05, Math.sqrt((ax - bx) ** 2 + (az - bz) ** 2), 6]} />
          <meshStandardMaterial color="#94a3b8" opacity={0.35} transparent />
        </mesh>
        <mesh position={[ax, 0, az]}>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshStandardMaterial color={colorA} emissive={colorA} emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[bx, 0, bz]}>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshStandardMaterial color={colorB} emissive={colorB} emissiveIntensity={0.2} />
        </mesh>
      </group>
    );
  }

  return <group ref={group}>{items}</group>;
}

export default function HelixBackdrop() {
  return (
    <Canvas camera={{ position: [0, 0, 8], fov: 55 }} style={{ width: "100%", height: "100vh" }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#22d3ee" />
      <pointLight position={[-10, -5, -5]} intensity={0.4} color="#a855f7" />
      <HelixMesh />
    </Canvas>
  );
}
