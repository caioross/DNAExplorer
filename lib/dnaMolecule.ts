/**
 * DNA molecular-construction toolkit.
 *
 * Builds atoms + bonds for a nucleotide / base-pair / helix at world coords.
 * The renderer consumes flat atom/bond arrays and batches by element & bond-order
 * into InstancedMeshes.
 *
 * Reference: canonical Watson-Crick B-DNA geometry, simplified to ring skeletons
 * + phosphate (no sugars, no hydrogens, no substituents — kept close to the
 * skeletal-formula look that reads as "molecule" at a glance).
 */

import * as THREE from "three";
import { HELIX_PARAMS, bpToY } from "./genomeLayout";

export type Element = "C" | "N" | "O" | "P";
export type Base = "A" | "T" | "G" | "C";

// Jmol / PDB canonical palette — uniform across all bases. Base identity is
// visible from SHAPE (purine = fused 9-atom ring, pyrimidine = single 6-atom
// ring) and from the N/O positioning within the ring, not from coloring
// carbons differently.
export const ELEMENT_COLOR: Record<Element, string> = {
  C: "#22c55e", // carbon     — bright Jmol green
  N: "#3b82f6", // nitrogen   — blue
  O: "#ef4444", // oxygen     — red
  P: "#f59e0b", // phosphorus — orange (backbone)
};

export const ELEMENT_RADIUS: Record<Element, number> = {
  C: 0.15,
  N: 0.15,
  O: 0.16,
  P: 0.26,
};

export const COMPLEMENT: Record<Base, Base> = { A: "T", T: "A", G: "C", C: "G" };

// ---------- local (u,v) ring geometries -------------------------------------
// u = radial direction (outward from helix axis), v = tangential along helix.
// Ring lies in the horizontal XZ plane (y = 0 local).

interface LocalAtom { el: Element; role: string; u: number; v: number; }
interface LocalBond { a: number; b: number; order: 1 | 2; }
interface MoleculeSpec { atoms: LocalAtom[]; bonds: LocalBond[]; glycosidicIdx: number; }

// Flat-top hexagon, side = 0.5, rotated 30° so the right edge is vertical.
// Pyrimidine atoms numbered 1..6, N1 at angle 0 (outermost vertex = glycosidic).
const PYRIMIDINE: MoleculeSpec = {
  atoms: [
    { el: "N", role: "N1", u: 0.5,    v: 0     },
    { el: "C", role: "C2", u: 0.25,   v: -0.433 },
    { el: "N", role: "N3", u: -0.25,  v: -0.433 },
    { el: "C", role: "C4", u: -0.5,   v: 0     },
    { el: "C", role: "C5", u: -0.25,  v: 0.433  },
    { el: "C", role: "C6", u: 0.25,   v: 0.433  },
  ],
  bonds: [
    { a: 0, b: 1, order: 2 },
    { a: 1, b: 2, order: 1 },
    { a: 2, b: 3, order: 2 },
    { a: 3, b: 4, order: 1 },
    { a: 4, b: 5, order: 2 },
    { a: 5, b: 0, order: 1 },
  ],
  glycosidicIdx: 0, // N1
};

// Purine: six-ring fused to five-ring over the C4-C5 edge.
// Hex center at origin; pentagon center offset along +u so the 5-ring sits outward.
// Shared edge is at u = +0.433, v = ±0.25 (hex vertices at angles ±30°).
// Pentagon vertices at 0°, 72°, 144°, 216°, 288° around its own center (0.777, 0).
const PURINE: MoleculeSpec = {
  atoms: [
    // Hex atoms (6-ring). N1-C2-N3-C4-C5-C6.
    { el: "N", role: "N1", u: -0.433, v: -0.25  },
    { el: "C", role: "C2", u: -0.433, v: 0.25   },
    { el: "N", role: "N3", u: 0,      v: 0.5    },
    { el: "C", role: "C4", u: 0.433,  v: 0.25   }, // shared w/ penta
    { el: "C", role: "C5", u: 0.433,  v: -0.25  }, // shared w/ penta
    { el: "C", role: "C6", u: 0,      v: -0.5   },
    // Pentagon extra atoms. C4-N9-C8-N7-C5 closes the 5-ring.
    { el: "N", role: "N9", u: 0.908,  v: 0.404  },
    { el: "C", role: "C8", u: 1.202,  v: 0      },
    { el: "N", role: "N7", u: 0.908,  v: -0.404 },
  ],
  bonds: [
    // Six-ring (aromatic, alternate bond orders)
    { a: 0, b: 1, order: 1 }, // N1-C2
    { a: 1, b: 2, order: 2 }, // C2-N3
    { a: 2, b: 3, order: 1 }, // N3-C4
    { a: 3, b: 4, order: 2 }, // C4-C5
    { a: 4, b: 5, order: 1 }, // C5-C6
    { a: 5, b: 0, order: 2 }, // C6-N1
    // Five-ring closure (fused edge already covered)
    { a: 3, b: 6, order: 1 }, // C4-N9
    { a: 6, b: 7, order: 2 }, // N9-C8
    { a: 7, b: 8, order: 1 }, // C8-N7
    { a: 8, b: 4, order: 2 }, // N7-C5
  ],
  glycosidicIdx: 6, // N9 for purines
};

export function getBaseSpec(base: Base): MoleculeSpec {
  return base === "A" || base === "G" ? PURINE : PYRIMIDINE;
}

// ---------- world-space atom & bond types ------------------------------------

export interface WorldAtom {
  el: Element;
  pos: THREE.Vector3;
  bpIdx: number;       // which base-pair this atom belongs to (for highlight/dim lookup)
}
export interface WorldBond {
  a: THREE.Vector3;
  b: THREE.Vector3;
  order: 1 | 2 | 3; // 3 reserved for H-bonds
  bpIdx: number;
}

// ---------- nucleotide assembly ----------------------------------------------
// Translates ring skeleton from local (u,v) → world (x,y,z) with proper
// helix twist + chromatin bend. Adds the phosphate atom on the strand curve.

const BASE_CENTER_R_FRAC = 0.42; // ring center at 42% of helix radius (closer to axis)
const SCALE = 1.55;              // scales ring size so atoms read at viewing distance

interface NucleotideOut {
  atoms: WorldAtom[];
  bonds: WorldBond[];
  glycPos: THREE.Vector3;  // glycosidic N (closest to strand) — used for sugar/phosphate link
  phosPos: THREE.Vector3;  // phosphorus position (on backbone strand)
  ringAtoms: number;       // how many ring atoms were added (for indexing)
}

export function buildNucleotide(
  base: Base,
  theta: number,
  y: number,
  bend: { dx: number; dz: number },
  sideSign: 1 | -1, // +1 for strand A, -1 for strand B
  bpIdx: number,
): NucleotideOut {
  const spec = getBaseSpec(base);
  const R = HELIX_PARAMS.radius;
  const baseR = R * BASE_CENTER_R_FRAC;

  const cosT = Math.cos(theta) * sideSign;
  const sinT = Math.sin(theta) * sideSign;
  const ux = cosT, uz = sinT;
  const vx = -sinT, vz = cosT;

  const cx = cosT * baseR + bend.dx;
  const cz = sinT * baseR + bend.dz;

  const atoms: WorldAtom[] = [];
  for (const la of spec.atoms) {
    const du = la.u * SCALE;
    const dv = la.v * SCALE;
    const x = cx + du * ux + dv * vx;
    const z = cz + du * uz + dv * vz;
    const atom: WorldAtom = {
      el: la.el,
      pos: new THREE.Vector3(x, y, z),
      bpIdx,
    };
    atoms.push(atom);
  }

  const bonds: WorldBond[] = spec.bonds.map((b) => ({
    a: atoms[b.a].pos,
    b: atoms[b.b].pos,
    order: b.order,
    bpIdx,
  }));

  const glycPos = atoms[spec.glycosidicIdx].pos;

  const phosX = cosT * R + bend.dx;
  const phosZ = sinT * R + bend.dz;
  const phosPos = new THREE.Vector3(phosX, y, phosZ);
  atoms.push({ el: "P", pos: phosPos, bpIdx });

  bonds.push({ a: glycPos, b: phosPos, order: 1, bpIdx });

  return { atoms, bonds, glycPos, phosPos, ringAtoms: spec.atoms.length };
}

// ---------- base-pair assembly ----------------------------------------------

export function buildBasePair(
  baseA: Base,
  theta: number,
  y: number,
  bend: { dx: number; dz: number },
  bpIdx: number,
): { atoms: WorldAtom[]; bonds: WorldBond[]; strandA: THREE.Vector3; strandB: THREE.Vector3 } {
  const baseB = COMPLEMENT[baseA];
  const a = buildNucleotide(baseA, theta, y, bend, 1, bpIdx);
  const b = buildNucleotide(baseB, theta, y, bend, -1, bpIdx);

  // H-bond(s) — dashed-equivalent thin connectors between the two glycosidic
  // atoms projected to the ring plane. A-T = 2 bonds, G-C = 3 bonds.
  const nBonds = baseA === "A" || baseA === "T" ? 2 : 3;
  const mid = new THREE.Vector3().addVectors(a.glycPos, b.glycPos).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(b.glycPos, a.glycPos);
  const dist = dir.length();
  // Place nBonds parallel tracks spaced along the tangential axis.
  const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
  const hbonds: WorldBond[] = [];
  const gap = 0.28;
  for (let i = 0; i < nBonds; i++) {
    const off = (i - (nBonds - 1) / 2) * gap;
    const offset = tangent.clone().multiplyScalar(off);
    // bond endpoints: shrink from glyc atoms slightly so H-bond starts near ring edge
    const inset = 0.35;
    const endA = a.glycPos.clone().add(dir.clone().normalize().multiplyScalar(inset)).add(offset);
    const endB = b.glycPos.clone().sub(dir.clone().normalize().multiplyScalar(inset)).add(offset);
    hbonds.push({ a: endA, b: endB, order: 3, bpIdx });
  }
  void mid; void dist; // kept for readability; not used further

  return {
    atoms: [...a.atoms, ...b.atoms],
    bonds: [...a.bonds, ...b.bonds, ...hbonds],
    strandA: a.phosPos,
    strandB: b.phosPos,
  };
}

// ---------- helix-wide assembly (memoizable) ---------------------------------

export interface HelixMolecule {
  atoms: WorldAtom[];
  bonds: WorldBond[];
  perBpChrom: string[];
  perBpY: number[];
  perBpBases: { a: Base; b: Base }[];
  perBpRsid: (string | null)[];
}

/**
 * Each entry drives one rendered base-pair in the helix. `baseA` is the base
 * that sits on strand A at this position — derived from the user's genotype
 * (first allele of the call). `baseB` is always its Watson-Crick complement.
 */
export interface SequencedBp {
  chrom: string;
  pos: number;    // bp position within chromosome (for y mapping)
  y: number;      // world-y coord (pre-computed to avoid re-calling bpToY)
  theta: number;  // helix twist angle at this y
  baseA: Base;
  rsid?: string | null;
  call?: "homo" | "hetero" | "indel" | "nocall";
}

/**
 * Resolve a genotype call (e.g. "AG", "A", "TT", "II", "--") into a single
 * base to render on strand A. For heterozygous / weird calls we keep the
 * first parsable A/T/G/C letter; otherwise fall back to A (a sentinel, still
 * visible but flagged via call="nocall"/"indel" for dimming).
 */
export function gtToBase(gt: string | undefined): Base {
  if (!gt) return "A";
  for (const ch of gt.toUpperCase()) {
    if (ch === "A" || ch === "T" || ch === "G" || ch === "C") return ch;
  }
  return "A";
}

/**
 * Build the full helix molecule from a real sequenced bp list. The bp list
 * must be sorted by y (genome order) — phosphodiester bonds are emitted
 * between consecutive bp on the same chromosome only (so chromosome breaks
 * are honored — no artificial cross-chrom backbone bonds).
 */
export function buildHelixMoleculeFromSequence(
  sequence: SequencedBp[],
  bendAt: (y: number) => { dx: number; dz: number },
): HelixMolecule {
  const atoms: WorldAtom[] = [];
  const bonds: WorldBond[] = [];
  const perBpChrom: string[] = [];
  const perBpY: number[] = [];
  const perBpBases: { a: Base; b: Base }[] = [];
  const perBpRsid: (string | null)[] = [];

  let prevStrandA: THREE.Vector3 | null = null;
  let prevStrandB: THREE.Vector3 | null = null;
  let prevChrom: string | null = null;

  for (let i = 0; i < sequence.length; i++) {
    const s = sequence[i];
    const bend = bendAt(s.y);
    const bpIdx = perBpY.length;
    const bp = buildBasePair(s.baseA, s.theta, s.y, bend, bpIdx);
    atoms.push(...bp.atoms);
    bonds.push(...bp.bonds);

    // Connect backbones only when consecutive bp share the same chromosome.
    if (prevChrom === s.chrom) {
      if (prevStrandA) bonds.push({ a: prevStrandA, b: bp.strandA, order: 1, bpIdx });
      if (prevStrandB) bonds.push({ a: prevStrandB, b: bp.strandB, order: 1, bpIdx });
    }
    prevStrandA = bp.strandA;
    prevStrandB = bp.strandB;
    prevChrom = s.chrom;

    perBpChrom.push(s.chrom);
    perBpY.push(s.y);
    perBpBases.push({ a: s.baseA, b: COMPLEMENT[s.baseA] });
    perBpRsid.push(s.rsid ?? null);
  }

  return { atoms, bonds, perBpChrom, perBpY, perBpBases, perBpRsid };
}

// ---------- orientation helpers for bond cylinders ---------------------------
// Cylinder default axis is +Y. To align it with a direction vector we build a
// quaternion rotating (0,1,0) → normalized direction.

const UP = new THREE.Vector3(0, 1, 0);
export function orientCylinder(
  obj: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  radialThickness: number = 1,
) {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  obj.position.copy(mid);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-6) {
    obj.quaternion.identity();
    obj.scale.set(radialThickness, 0.0001, radialThickness);
    return;
  }
  dir.normalize();
  obj.quaternion.setFromUnitVectors(UP, dir);
  obj.scale.set(radialThickness, len, radialThickness);
}
