"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { getGenomeLayout, HELIX_PARAMS, bpToY, type ChromSegment } from "@/lib/genomeLayout";
import { useFocus, categoryColor, type HelixMarker } from "@/lib/stores/focusStore";
import { useTheme } from "@/lib/stores/themeStore";
import { CANONICAL_SNPS } from "@/lib/canonicalSnps";
import {
  buildHelixMoleculeFromSequence,
  gtToBase,
  orientCylinder,
  ELEMENT_COLOR,
  ELEMENT_RADIUS,
  type Element as AtomElement,
  type SequencedBp,
  type HelixMolecule,
} from "@/lib/dnaMolecule";
import { sampleSnpsForHelix } from "@/lib/db";

// Chromatin-like gentle folding — DNA in vivo isn't perfectly straight.
const BEND_X = 1.1;
const BEND_Z = 0.9;
function bendAt(y: number): { dx: number; dz: number } {
  return {
    dx: Math.sin(y * 0.013) * BEND_X + Math.sin(y * 0.033) * 0.25,
    dz: Math.cos(y * 0.015) * BEND_Z + Math.cos(y * 0.041) * 0.22,
  };
}

function helixPosition(y: number, side: 0 | 1, radius: number, risePerTurn: number) {
  const turns = y / risePerTurn;
  const theta = turns * Math.PI * 2 + (side === 0 ? 0 : Math.PI);
  const { dx, dz } = bendAt(y);
  return { x: Math.cos(theta) * radius + dx, z: Math.sin(theta) * radius + dz, theta };
}

function ChromSegments({ segments }: { segments: ChromSegment[] }) {
  const { chromosome, setChromosome } = useFocus();
  return (
    <group>
      {segments.map((seg) => {
        const yMid = (seg.startY + seg.endY) / 2;
        const { dx, dz } = bendAt(yMid);
        const { dx: dxs, dz: dzs } = bendAt(seg.startY);
        const { dx: dxc, dz: dzc } = bendAt(seg.centromereY);
        const active = chromosome === seg.chrom;
        return (
          <group key={seg.chrom}>
            <mesh position={[dxs, seg.startY, dzs]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[HELIX_PARAMS.radius + 0.4, 0.06, 16, 64]} />
              <meshStandardMaterial color={active ? "#22d3ee" : "#475569"} emissive={active ? "#22d3ee" : "#1e293b"} emissiveIntensity={active ? 1.2 : 0.15} />
            </mesh>
            <mesh position={[dxc, seg.centromereY, dzc]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[HELIX_PARAMS.radius + 0.18, 0.12, 16, 48]} />
              <meshStandardMaterial color={active ? "#fbbf24" : "#6b7280"} emissive={active ? "#fbbf24" : "#000"} emissiveIntensity={active ? 1.1 : 0} transparent opacity={0.9} />
            </mesh>
            <Html position={[HELIX_PARAMS.radius + 1.8 + dx, yMid, dz]} center>
              <button
                onClick={(e) => { e.stopPropagation(); setChromosome(active ? null : seg.chrom); }}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md backdrop-blur-md border pointer-events-auto transition-all ${
                  active
                    ? "bg-accent/30 border-accent text-accent shadow-glow font-bold scale-110"
                    : "bg-bg/60 border-border text-fg-dim hover:text-fg hover:border-accent/50"
                }`}
              >
                chr{seg.chrom}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Molecular helix renderer.
 *
 * Calls buildHelixMolecule() to get flat arrays of atoms + bonds at world
 * coords, then batches them into InstancedMeshes grouped by element (atoms)
 * and bond order (sticks). Per-instance colors on carbon atoms carry the
 * A/T/G/C tint; highlights apply a multiplicative boost so only focused
 * base-pairs bloom.
 */
function MolecularHelix({
  sampleCount,
}: {
  segments: ChromSegment[]; // kept for API stability; sequence now comes from DB
  sampleCount: number;
}) {
  const { chromosome, mode, markers } = useFocus();
  const [molecule, setMolecule] = useState<HelixMolecule | null>(null);

  // Fetch user SNPs from the loaded genome and build the helix from the real
  // genotype sequence. Every rendered bp corresponds to a real SNP on disk —
  // position, chromosome and base letter all come from the user's data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snps = await sampleSnpsForHelix(sampleCount);
      if (cancelled || snps.length === 0) return;
      const sequence: SequencedBp[] = snps.map((s) => {
        const y = bpToY(s.chrom, s.pos);
        const turns = y / HELIX_PARAMS.risePerTurn;
        const theta = turns * Math.PI * 2;
        return {
          chrom: s.chrom,
          pos: s.pos,
          y,
          theta,
          baseA: gtToBase(s.gt),
          rsid: s.rsid,
          call: s.call,
        };
      });
      const built = buildHelixMoleculeFromSequence(sequence, bendAt);
      if (!cancelled) setMolecule(built);
    })();
    return () => { cancelled = true; };
  }, [sampleCount]);

  // Partition atoms by element & bonds by order once.
  const grouped = useMemo(() => {
    const empty = { byEl: { C: [], N: [], O: [], P: [] } as Record<AtomElement, number[]>,
                    byOrder: { 1: [], 2: [], 3: [] } as Record<1 | 2 | 3, number[]> };
    if (!molecule) return empty;
    const byEl: Record<AtomElement, number[]> = { C: [], N: [], O: [], P: [] };
    molecule.atoms.forEach((a, i) => byEl[a.el].push(i));
    const byOrder: Record<1 | 2 | 3, number[]> = { 1: [], 2: [], 3: [] };
    molecule.bonds.forEach((b, i) => byOrder[b.order].push(i));
    return { byEl, byOrder };
  }, [molecule]);

  const cRef = useRef<THREE.InstancedMesh>(null!);
  const nRef = useRef<THREE.InstancedMesh>(null!);
  const oRef = useRef<THREE.InstancedMesh>(null!);
  const pRef = useRef<THREE.InstancedMesh>(null!);
  const bond1Ref = useRef<THREE.InstancedMesh>(null!);
  const bond2Ref = useRef<THREE.InstancedMesh>(null!);
  const hbondRef = useRef<THREE.InstancedMesh>(null!);

  const elementRefs: Record<AtomElement, React.RefObject<THREE.InstancedMesh>> = {
    C: cRef, N: nRef, O: oRef, P: pRef,
  };

  // Write instance matrices (positions) for atoms & bonds once per molecule build.
  useEffect(() => {
    if (!molecule) return;
    const dummy = new THREE.Object3D();

    (["C", "N", "O", "P"] as AtomElement[]).forEach((el) => {
      const mesh = elementRefs[el].current;
      if (!mesh) return;
      grouped.byEl[el].forEach((atomIdx, i) => {
        const atom = molecule.atoms[atomIdx];
        dummy.position.copy(atom.pos);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.count = grouped.byEl[el].length;
      mesh.instanceMatrix.needsUpdate = true;
    });

    const writeBondsFor = (
      mesh: THREE.InstancedMesh | null,
      indices: number[],
      radial: number,
    ) => {
      if (!mesh) return;
      indices.forEach((bondIdx, i) => {
        const bond = molecule.bonds[bondIdx];
        orientCylinder(dummy, bond.a, bond.b, radial);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.count = indices.length;
      mesh.instanceMatrix.needsUpdate = true;
    };
    writeBondsFor(bond1Ref.current, grouped.byOrder[1], 1);
    writeBondsFor(bond2Ref.current, grouped.byOrder[2], 1);
    writeBondsFor(hbondRef.current, grouped.byOrder[3], 1);
  }, [molecule, grouped]);

  // Paint per-atom colors — base tint on carbons; N/O/P use static element colors.
  // Near a marker, boost the whole bp atom colors (HDR push for bloom).
  useEffect(() => {
    if (!molecule) return;
    const highlights = markers
      .filter((m) => m.pos)
      .map((m) => ({ y: bpToY(m.chrom, m.pos), color: new THREE.Color(m.color) }));
    const dimColor = new THREE.Color("#1e293b");
    const chromDimmed = mode === "chromosome" && chromosome;

    // Helper: compute per-bp state once.
    const bpState: ("highlight" | "dim" | "normal")[] = [];
    const bpHL: (THREE.Color | null)[] = [];
    for (let i = 0; i < molecule.perBpY.length; i++) {
      const y = molecule.perBpY[i];
      const chrom = molecule.perBpChrom[i];
      const near = highlights.find((h) => Math.abs(h.y - y) < 1.5);
      if (near) { bpState.push("highlight"); bpHL.push(near.color); }
      else if (chromDimmed && chrom !== chromosome) { bpState.push("dim"); bpHL.push(null); }
      else { bpState.push("normal"); bpHL.push(null); }
    }

    const applyColors = (el: AtomElement, mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      const staticColor = new THREE.Color(ELEMENT_COLOR[el]);
      grouped.byEl[el].forEach((atomIdx, i) => {
        const atom = molecule.atoms[atomIdx];
        const state = bpState[atom.bpIdx];
        let c: THREE.Color;
        if (state === "dim") c = dimColor;
        else if (state === "highlight") {
          const hlColor = bpHL[atom.bpIdx]!;
          c = staticColor.clone().lerp(hlColor, 0.7).multiplyScalar(2.2);
        } else {
          c = staticColor;
        }
        mesh.setColorAt(i, c);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    applyColors("C", cRef.current);
    applyColors("N", nRef.current);
    applyColors("O", oRef.current);
    applyColors("P", pRef.current);
  }, [molecule, grouped, markers, mode, chromosome]);

  // Pre-allocated capacities — InstancedMesh buffer size is fixed at construction,
  // so we reserve generously based on sampleCount. Actual draw count is capped
  // via mesh.count = N in the matrix effect.
  // Per bp: up to 9 C + 6 N + 0 O + 2 P atoms; ~15 single + ~10 double + ~5 H-bond bonds.
  const capC = sampleCount * 12;
  const capN = sampleCount * 10;
  const capO = sampleCount * 2;
  const capP = sampleCount * 4;
  const capB1 = sampleCount * 20;
  const capB2 = sampleCount * 15;
  const capH = sampleCount * 6;

  return (
    <group visible={!!molecule}>
      {/* Atoms: one InstancedMesh per element. Low metalness + low roughness so
          the per-instance vertexColor reads clearly at any lighting angle. */}
      <instancedMesh ref={cRef} args={[undefined, undefined, capC]}>
        <sphereGeometry args={[ELEMENT_RADIUS.C, 14, 14]} />
        <meshStandardMaterial vertexColors metalness={0.05} roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={nRef} args={[undefined, undefined, capN]}>
        <sphereGeometry args={[ELEMENT_RADIUS.N, 14, 14]} />
        <meshStandardMaterial vertexColors metalness={0.05} roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={oRef} args={[undefined, undefined, capO]}>
        <sphereGeometry args={[ELEMENT_RADIUS.O, 14, 14]} />
        <meshStandardMaterial vertexColors metalness={0.05} roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={pRef} args={[undefined, undefined, capP]}>
        <sphereGeometry args={[ELEMENT_RADIUS.P, 16, 16]} />
        <meshStandardMaterial vertexColors metalness={0.15} roughness={0.5} />
      </instancedMesh>

      {/* Bonds — single, double (slightly thicker), H-bond (thin, transparent) */}
      <instancedMesh ref={bond1Ref} args={[undefined, undefined, capB1]}>
        <cylinderGeometry args={[0.055, 0.055, 1, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.2} roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={bond2Ref} args={[undefined, undefined, capB2]}>
        <cylinderGeometry args={[0.085, 0.085, 1, 8]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.2} roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={hbondRef} args={[undefined, undefined, capH]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.5} metalness={0.05} roughness={0.8} />
      </instancedMesh>
    </group>
  );
}

function ChromosomeHighlight() {
  const { chromosome } = useFocus();
  const { segments } = getGenomeLayout();
  const seg = chromosome ? segments.find((s) => s.chrom === chromosome) : null;
  const groupRef = useRef<THREE.Group>(null!);
  const innerRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.4;
    if (innerRef.current) {
      const mat = innerRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + Math.sin(clock.getElapsedTime() * 2) * 0.08;
    }
  });
  if (!seg) return null;
  const yMid = (seg.startY + seg.endY) / 2;
  const height = Math.max(0.5, seg.endY - seg.startY);
  const { dx, dz } = bendAt(yMid);
  return (
    <group ref={groupRef} position={[dx, yMid, dz]}>
      <mesh>
        <cylinderGeometry args={[HELIX_PARAMS.radius + 1.4, HELIX_PARAMS.radius + 1.4, height, 48, 1, true]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.1} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={innerRef}>
        <cylinderGeometry args={[HELIX_PARAMS.radius + 0.8, HELIX_PARAMS.radius + 0.8, height, 80, 1, true]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.2} side={THREE.DoubleSide} wireframe toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[HELIX_PARAMS.radius + 0.55, HELIX_PARAMS.radius + 0.55, height, 8, 1, true]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.05} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function SnpMarker({ marker, showLabel }: { marker: HelixMarker; showLabel: boolean }) {
  const meshRef = useRef<THREE.Group>(null!);
  const haloRef = useRef<THREE.Mesh>(null!);
  const y = bpToY(marker.chrom, marker.pos);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      const s = 1 + Math.sin(t * 3 + (marker.pos % 100) * 0.1) * 0.2;
      meshRef.current.scale.setScalar(s);
    }
    if (haloRef.current) {
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.2 + Math.sin(t * 2.5) * 0.15;
    }
  });
  const { x, z } = helixPosition(y, 0, HELIX_PARAMS.radius + 1.7, HELIX_PARAMS.risePerTurn);
  return (
    <group ref={meshRef} position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color={marker.color} emissive={marker.color} emissiveIntensity={2.8} toneMapped={false} />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.95, 32, 32]} />
        <meshBasicMaterial color={marker.color} transparent opacity={0.25} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.6, 24, 24]} />
        <meshBasicMaterial color={marker.color} transparent opacity={0.05} toneMapped={false} />
      </mesh>
      {showLabel && (
        <Html position={[1, 0, 0]} center>
          <div className="pointer-events-none">
            <div
              className="chip bg-bg/90 backdrop-blur-md whitespace-nowrap text-[10px] font-semibold"
              style={{ boxShadow: `0 0 20px ${marker.color}`, borderColor: marker.color, color: marker.color }}
            >
              {marker.label || marker.rsid}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function CanonicalDots() {
  const { setSnp, markers, snpRsid } = useFocus();
  const activeIds = useMemo(
    () => new Set([snpRsid, ...markers.map((m) => m.rsid)].filter(Boolean) as string[]),
    [snpRsid, markers]
  );
  return (
    <>
      {CANONICAL_SNPS.map((snp) => {
        if (!snp.position) return null;
        const y = bpToY(snp.chrom, snp.position);
        const { x, z } = helixPosition(y, 1, HELIX_PARAMS.radius + 1.0, HELIX_PARAMS.risePerTurn);
        const active = activeIds.has(snp.rsid);
        const color = categoryColor(snp.category);
        return (
          <group
            key={snp.rsid}
            position={[x, y, z]}
            onPointerDown={(e) => {
              e.stopPropagation();
              setSnp(snp.rsid, {
                chrom: snp.chrom,
                pos: snp.position ?? 0,
                label: snp.title,
                category: snp.category,
              });
            }}
          >
            <mesh>
              <sphereGeometry args={[active ? 0.26 : 0.2, 16, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={active ? 2.2 : 1.4}
                toneMapped={false}
              />
            </mesh>
            <mesh>
              <sphereGeometry args={[active ? 0.5 : 0.38, 16, 16]} />
              <meshBasicMaterial color={color} transparent opacity={active ? 0.4 : 0.25} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function FocusEase() {
  const { mode, chromosome, markers } = useFocus();
  const { camera, controls } = useThree() as any;
  const { segments } = getGenomeLayout();
  const animating = useRef<{ from: THREE.Vector3; fromTarget: THREE.Vector3; to: THREE.Vector3; toTarget: THREE.Vector3; start: number } | null>(null);
  const key = `${mode}|${chromosome}|${markers.map((m) => m.rsid).join(",")}`;
  const prevKey = useRef<string>("");

  useEffect(() => {
    if (prevKey.current === "") { prevKey.current = key; return; }
    if (prevKey.current === key) return;
    prevKey.current = key;

    let toTarget = new THREE.Vector3(0, 0, 0);
    let to = new THREE.Vector3(0, 0, 55);

    if (mode === "chromosome" && chromosome) {
      const seg = segments.find((s) => s.chrom === chromosome);
      if (seg) {
        const yMid = (seg.startY + seg.endY) / 2;
        const { dx, dz } = bendAt(yMid);
        toTarget.set(dx, yMid, dz);
        to.set(dx + 14, yMid + 6, dz + 28);
      }
    } else if (mode === "snp" && markers.length === 1) {
      const m = markers[0];
      const y = bpToY(m.chrom, m.pos);
      const { dx, dz } = bendAt(y);
      toTarget.set(dx, y, dz);
      to.set(dx + 8, y + 1.5, dz + 14);
    } else if (mode === "multi" && markers.length > 1) {
      // Wide view to show all marked points across the genome.
      toTarget.set(0, 0, 0);
      to.set(0, 0, 180);
    }

    const ctrlTarget = controls?.target?.clone?.() ?? new THREE.Vector3();
    animating.current = {
      from: camera.position.clone(),
      fromTarget: ctrlTarget,
      to,
      toTarget,
      start: performance.now(),
    };
  }, [key, mode, chromosome, markers, segments, camera, controls]);

  useFrame(() => {
    const a = animating.current;
    if (!a) return;
    const dur = 900;
    const t = Math.min(1, (performance.now() - a.start) / dur);
    const k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.lerpVectors(a.from, a.to, k);
    if (controls?.target) {
      controls.target.lerpVectors(a.fromTarget, a.toTarget, k);
      controls.update?.();
    }
    if (t >= 1) animating.current = null;
  });

  return null;
}

export default function GenomeHelix() {
  const { segments } = getGenomeLayout();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { markers, mode, chromosome, clearFocus } = useFocus();

  const bgColor = theme === "light" ? "#f8fafc" : "#000000";

  if (!mounted) return <div className="w-full h-full bg-bg-soft" />;

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 55], fov: 42, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 90, 420]} />
        <ambientLight intensity={theme === "light" ? 0.8 : 0.55} />
        <directionalLight position={[30, 40, 20]} intensity={theme === "light" ? 1.2 : 1.4} color="#ffffff" castShadow={false} />
        <directionalLight position={[-20, -10, 25]} intensity={theme === "light" ? 0.5 : 0.7} color="#fef3c7" />
        <pointLight position={[0, 0, 30]} intensity={0.9} color="#ffffff" />
        <pointLight position={[12, 0, -10]} intensity={0.5} color="#e0e7ff" />
        {theme === "dark" && <Stars radius={400} depth={150} count={1200} factor={5} saturation={0} fade speed={0.15} />}
        <Environment preset={theme === "light" ? "dawn" : "night"} />

        <FocusEase />

        <group>
          <MolecularHelix segments={segments} sampleCount={420} />
          <ChromSegments segments={segments} />
          <CanonicalDots />
          <ChromosomeHighlight />
          {markers.map((m) => (
            <SnpMarker key={m.rsid} marker={m} showLabel={markers.length <= 3} />
          ))}
        </group>

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          minDistance={2}
          maxDistance={600}
          zoomSpeed={1.2}
          panSpeed={1.2}
          rotateSpeed={0.9}
          enableDamping
          dampingFactor={0.08}
        />

        {/* Only SNP markers / highlighted rungs bloom — base geometry stays PBR-lit. */}
        <EffectComposer>
          <Bloom
            intensity={theme === "light" ? 0.3 : 0.75}
            luminanceThreshold={0.9}
            luminanceSmoothing={0.6}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.3} darkness={theme === "light" ? 0.2 : 0.45} />
        </EffectComposer>
      </Canvas>

      {/* Floating HUD */}
      <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1.5">
        <div className="chip bg-bg/70 backdrop-blur-md border-border/60 text-[10px]">
          <span className="text-fg-muted">modo</span>
          <span className="text-accent font-semibold">
            {mode === "genome" ? "genoma completo" : mode === "chromosome" ? `chr${chromosome}` : mode === "multi" ? `${markers.length} achados` : "foco SNP"}
          </span>
        </div>
        <div className="chip bg-bg/50 backdrop-blur-md border-border/40 text-[9px] text-fg-muted">
          arraste · roda = zoom · shift+arraste = pan · clique nos pontos
        </div>
      </div>
      {mode !== "genome" && (
        <button
          onClick={() => clearFocus()}
          className="absolute top-3 right-3 chip bg-bg/80 backdrop-blur-md border-accent/40 hover:border-accent text-[10px] text-accent transition-colors"
        >
          ← ver genoma completo
        </button>
      )}
    </div>
  );
}
