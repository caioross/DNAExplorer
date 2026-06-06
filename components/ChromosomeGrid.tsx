"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { CHROMOSOMES, chromLength, centromereOf } from "@/lib/chromosomes";
import { CHROM_INFO } from "@/lib/chromosomeInfo";
import { CANONICAL_SNPS } from "@/lib/canonicalSnps";
import { useFocus } from "@/lib/stores/focusStore";
import { fmt } from "@/lib/utils";

export default function ChromosomeGrid({ byChrom }: { byChrom: Record<string, number> }) {
  const max = Math.max(...Object.values(byChrom), 1);
  const setChromosome = useFocus((s) => s.setChromosome);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
      {CHROMOSOMES.map((c, idx) => {
        const count = byChrom[c] || 0;
        const density = count / max;
        const [cStart, cEnd] = centromereOf(c);
        const len = chromLength(c);
        const cPos = len ? ((cStart + cEnd) / 2 / len) * 100 : 50;
        const info = CHROM_INFO[c];
        const canonCount = CANONICAL_SNPS.filter((cs) => cs.chrom === c).length;

        return (
          <motion.div
            key={c}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.015, duration: 0.3 }}
          >
            <Link
              href={count ? `/viewer/chromosome/${c}` : "#"}
              onMouseEnter={() => count && setChromosome(c)}
              className={`card card-hover p-4 block relative overflow-hidden group ${
                count ? "" : "opacity-30 pointer-events-none"
              }`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"
                   style={{ background: `rgb(var(--c-accent))`, transform: "translate(30%, -30%)" }} />
              <div className="flex items-start justify-between mb-2 relative">
                <div>
                  <span className="font-mono font-bold text-base">chr{c}</span>
                  {info?.commonName && (
                    <div className="text-[10px] text-fg-muted leading-tight mt-0.5 line-clamp-1">
                      {info.commonName.replace(`Cromossomo ${c}`, "").replace(/^\s*—\s*/, "")}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-fg-muted">SNPs</div>
                  <div className="text-sm font-mono font-bold text-accent">{fmt(count)}</div>
                </div>
              </div>

              <div className="relative h-2 rounded-full bg-bg-soft overflow-hidden mb-2">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent/30 to-accent"
                  style={{ width: `${Math.max(density * 100, count ? 5 : 0)}%` }}
                />
                {c !== "MT" && cEnd > cStart && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-bg"
                    style={{ left: `${cPos}%` }}
                  />
                )}
              </div>

              {info?.majorGenes && info.majorGenes.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {info.majorGenes.slice(0, 4).map((g) => (
                    <span key={g} className="chip text-[9px] py-0 px-1.5">{g}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-mono text-fg-muted pt-1 border-t border-border">
                <span>{len > 1e6 ? (len / 1e6).toFixed(0) + " Mb" : (len / 1000).toFixed(0) + " kb"}</span>
                {canonCount > 0 && <span className="text-accent">★ {canonCount} canônicos</span>}
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
