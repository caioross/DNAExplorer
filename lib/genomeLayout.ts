import { CHROMOSOMES, CHROM_LENGTHS, CHROM_CENTROMERES } from "./chromosomes";

export interface ChromSegment {
  chrom: string;
  length: number;
  startBp: number;
  endBp: number;
  centromereBp: number;
  startY: number;
  endY: number;
  centromereY: number;
  hue: number;
}

const GAP_BP = 5_000_000;
const HELIX_HEIGHT = 420;

const ORDER = [
  "1","2","3","4","5","6","7","8","9","10",
  "11","12","13","14","15","16","17","18","19","20",
  "21","22","X","Y","MT",
];

function buildLayout(): { segments: ChromSegment[]; totalBp: number; helixHeight: number } {
  let cursor = 0;
  const rawSegments = ORDER.map((c) => {
    const len = CHROM_LENGTHS[c] ?? 0;
    const start = cursor;
    const end = cursor + len;
    cursor = end + GAP_BP;
    return { chrom: c, length: len, startBp: start, endBp: end };
  });
  const total = cursor - GAP_BP;

  const segments: ChromSegment[] = rawSegments.map((s, i) => {
    const centBpWithin = CHROM_CENTROMERES[s.chrom]?.[0] ?? s.length / 2;
    const startY = (s.startBp / total) * HELIX_HEIGHT - HELIX_HEIGHT / 2;
    const endY = (s.endBp / total) * HELIX_HEIGHT - HELIX_HEIGHT / 2;
    const centromereBp = s.startBp + centBpWithin;
    const centromereY = (centromereBp / total) * HELIX_HEIGHT - HELIX_HEIGHT / 2;
    return {
      chrom: s.chrom,
      length: s.length,
      startBp: s.startBp,
      endBp: s.endBp,
      centromereBp,
      startY,
      endY,
      centromereY,
      hue: (i * 360) / ORDER.length,
    };
  });

  return { segments, totalBp: total, helixHeight: HELIX_HEIGHT };
}

const CACHE = buildLayout();

export function getGenomeLayout() {
  return CACHE;
}

export function getSegment(chrom: string): ChromSegment | undefined {
  return CACHE.segments.find((s) => s.chrom === chrom);
}

export function bpToY(chrom: string, posInChrom: number): number {
  const seg = getSegment(chrom);
  if (!seg) return 0;
  const globalBp = seg.startBp + Math.max(0, Math.min(posInChrom, seg.length));
  return (globalBp / CACHE.totalBp) * CACHE.helixHeight - CACHE.helixHeight / 2;
}

export function globalBpToY(globalBp: number): number {
  return (globalBp / CACHE.totalBp) * CACHE.helixHeight - CACHE.helixHeight / 2;
}

export const HELIX_PARAMS = {
  radius: 4.5,
  baseRadius: 0.18,
  rungRadius: 0.08,
  risePerTurn: 24,
  backboneThickness: 0.22,
  height: HELIX_HEIGHT,
};
