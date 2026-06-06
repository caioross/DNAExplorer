"use client";
import { create } from "zustand";

export type FocusMode = "genome" | "chromosome" | "snp" | "multi";

export interface HelixMarker {
  rsid: string;
  chrom: string;
  pos: number;
  color: string;
  label?: string;
  category?: string;
}

interface FocusState {
  mode: FocusMode;
  chromosome: string | null;
  snpRsid: string | null;
  markers: HelixMarker[];
  setChromosome: (c: string | null) => void;
  setSnp: (rsid: string | null, meta?: { chrom: string; pos: number; label?: string; category?: string }) => void;
  setMarkers: (m: HelixMarker[]) => void;
  clearFocus: () => void;
}

export const useFocus = create<FocusState>((set) => ({
  mode: "genome",
  chromosome: null,
  snpRsid: null,
  markers: [],
  setChromosome: (c) => set({ chromosome: c, mode: c ? "chromosome" : "genome", snpRsid: null }),
  setSnp: (rsid, meta) => {
    if (!rsid) {
      set({ snpRsid: null, mode: "genome", markers: [] });
      return;
    }
    const color = categoryColor(meta?.category);
    const markers: HelixMarker[] = meta
      ? [{ rsid, chrom: meta.chrom, pos: meta.pos, color, label: meta.label, category: meta.category }]
      : [];
    set({ snpRsid: rsid, mode: "snp", markers });
  },
  setMarkers: (m) => set({ markers: m, mode: m.length > 1 ? "multi" : m.length === 1 ? "snp" : "genome" }),
  clearFocus: () => set({ mode: "genome", chromosome: null, snpRsid: null, markers: [] }),
}));

export function categoryColor(cat?: string): string {
  switch (cat) {
    case "trait": return "#a78bfa";
    case "health": return "#f87171";
    case "pharmaco": return "#34d399";
    case "nutri": return "#fbbf24";
    case "sport": return "#60a5fa";
    default: return "#22d3ee";
  }
}
