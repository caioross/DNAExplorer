"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocus, type HelixMarker } from "@/lib/stores/focusStore";
import { findCanonicalByRsid, CATEGORY_LABELS, categoryColor, CANONICAL_SNPS } from "@/lib/canonicalSnps";
import { getChromInfo } from "@/lib/chromosomeInfo";
import { getSegment } from "@/lib/genomeLayout";
import { countChromosomeSnps, getSnp } from "@/lib/db";
import { fmt } from "@/lib/utils";
import GenotypePill from "./GenotypePill";
import type { Snp } from "@/lib/types";
import { ExternalLink } from "lucide-react";

export default function HelixContextPanel() {
  const { mode, chromosome, snpRsid, markers, setMarkers, clearFocus } = useFocus();

  const activeCategory = (() => {
    if (mode !== "multi" || !markers.length) return null;
    const cats = new Set(markers.map((m) => m.category));
    return cats.size === 1 ? (markers[0].category ?? null) : null;
  })();

  const highlightCategory = (cat: string) => {
    if (activeCategory === cat) { clearFocus(); return; }
    const snps = CANONICAL_SNPS.filter((s) => s.category === cat && s.position);
    const nextMarkers: HelixMarker[] = snps.map((s) => ({
      rsid: s.rsid,
      chrom: s.chrom,
      pos: s.position as number,
      color: categoryColor(s.category),
      label: s.title,
      category: s.category,
    }));
    setMarkers(nextMarkers);
  };

  const [chromSnpCount, setChromSnpCount] = useState<number | null>(null);
  const [snpRecord, setSnpRecord] = useState<Snp | null>(null);

  useEffect(() => {
    if (chromosome) countChromosomeSnps(chromosome).then(setChromSnpCount);
    else setChromSnpCount(null);
  }, [chromosome]);

  useEffect(() => {
    if (snpRsid) getSnp(snpRsid).then((s) => setSnpRecord(s ?? null));
    else setSnpRecord(null);
  }, [snpRsid]);

  return (
    <div className="border-t border-border p-3 bg-bg-soft/70 backdrop-blur-md max-h-[50%] overflow-y-auto space-y-3">
      {/* Mode-specific context — fills in above the persistent selector */}
      <AnimatePresence mode="wait">
        {mode === "chromosome" && chromosome && (
          <motion.div
            key={`chrom-${chromosome}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <ChromosomePanel chrom={chromosome} snpCount={chromSnpCount} />
          </motion.div>
        )}
        {mode === "snp" && markers.length === 1 && (
          <motion.div
            key={`snp-${markers[0].rsid}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <SnpPanel rsid={markers[0].rsid} userGenotype={snpRecord} />
          </motion.div>
        )}
        {mode === "multi" && activeCategory && (
          <motion.div
            key={`multi-${activeCategory}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-1"
          >
            <div className="text-[10px] uppercase tracking-wider" style={{ color: categoryColor(activeCategory) }}>
              Categoria em foco
            </div>
            <div className="font-bold text-sm">{CATEGORY_LABELS[activeCategory]}</div>
            <div className="text-[11px] text-fg-dim">
              {markers.length} SNPs iluminados na hélice. Clique num ponto para focar, ou noutra categoria abaixo para trocar.
            </div>
          </motion.div>
        )}
        {mode === "genome" && (
          <motion.div
            key="genome-info"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-1"
          >
            <div className="text-[10px] uppercase tracking-wider text-fg-muted">Genoma completo</div>
            <div className="text-[11px] text-fg-dim leading-relaxed">
              Os rungs da hélice seguem as cores das bases: <span className="text-emerald-400 font-mono font-semibold">A</span> · <span className="text-red-400 font-mono font-semibold">T</span> · <span className="text-yellow-400 font-mono font-semibold">G</span> · <span className="text-blue-400 font-mono font-semibold">C</span>. Pares A-T em verde/vermelho, G-C em amarelo/azul.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent category selector — always visible so the user can switch freely */}
      <div className="pt-2 border-t border-border/60">
        <div className="text-[9px] uppercase tracking-wider text-fg-muted mb-1.5">Iluminar por categoria</div>
        <div className="grid grid-cols-5 gap-1">
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => {
            const active = activeCategory === k;
            return (
              <button
                key={k}
                onClick={() => highlightCategory(k)}
                className={`text-[9px] text-center rounded-md p-1.5 border transition-all ${
                  active ? "bg-accent/5 scale-105" : "border-transparent hover:border-border hover:bg-bg-elevated"
                }`}
                style={active ? { borderColor: categoryColor(k) } : undefined}
                title={`Iluminar ${v} na hélice`}
              >
                <div
                  className="h-1.5 rounded-full mb-1"
                  style={{ background: categoryColor(k), boxShadow: active ? `0 0 10px ${categoryColor(k)}` : "none" }}
                />
                <div className={active ? "text-fg font-semibold" : "text-fg-muted"}>{v.split(" ")[0]}</div>
              </button>
            );
          })}
        </div>
        <div className="text-[9px] text-fg-muted mt-1.5">
          Clique novamente para limpar · clique em qualquer rung/ponto da hélice para focar um SNP.
        </div>
      </div>
    </div>
  );
}

function ChromosomePanel({ chrom, snpCount }: { chrom: string; snpCount: number | null }) {
  const info = getChromInfo(chrom);
  const seg = getSegment(chrom);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-accent">Foco</div>
          <div className="font-bold text-sm">{info?.commonName ?? `Cromossomo ${chrom}`}</div>
        </div>
        {snpCount !== null && (
          <div className="text-right">
            <div className="text-[10px] text-fg-muted">seus SNPs</div>
            <div className="font-mono text-sm text-accent">{fmt(snpCount)}</div>
          </div>
        )}
      </div>
      {info && (
        <p className="text-[11px] text-fg-dim leading-relaxed">{info.knownFor}</p>
      )}
      {info?.majorGenes && (
        <div className="flex flex-wrap gap-1">
          {info.majorGenes.slice(0, 6).map((g) => (
            <span key={g} className="chip text-[9px] py-0.5">{g}</span>
          ))}
        </div>
      )}
      {seg && (
        <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-border">
          <div>
            <div className="text-fg-muted">tamanho</div>
            <div className="font-mono">{(seg.length / 1e6).toFixed(1)} Mb</div>
          </div>
          <div>
            <div className="text-fg-muted">centrômero</div>
            <div className="font-mono">{(seg.centromereBp / 1e6 - seg.startBp / 1e6).toFixed(1)} Mb</div>
          </div>
        </div>
      )}
      <Link
        href={`/viewer/chromosome/${chrom}`}
        className="btn-primary text-[11px] py-1.5 w-full justify-center"
      >
        Explorar cromossomo →
      </Link>
    </div>
  );
}

function SnpPanel({ rsid, userGenotype }: { rsid: string; userGenotype: Snp | null }) {
  const canon = findCanonicalByRsid(rsid);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-accent">SNP em foco</div>
          <div className="font-mono font-bold text-sm">{rsid}</div>
        </div>
        {userGenotype && (
          <GenotypePill gt={userGenotype.gt} call={userGenotype.call} />
        )}
      </div>
      {canon && (
        <>
          <div className="flex items-center gap-2">
            <div className="chip text-[9px]" style={{ background: `${categoryColor(canon.category)}30`, borderColor: categoryColor(canon.category), color: categoryColor(canon.category) }}>
              {canon.gene}
            </div>
            {canon.sensitive && (
              <span className="badge bg-red-500/10 text-red-400 border border-red-500/30 text-[9px]">
                sensível
              </span>
            )}
          </div>
          <div className="font-semibold text-[11px]">{canon.title}</div>
          <p className="text-[11px] text-fg-dim leading-relaxed line-clamp-4">{canon.shortDesc}</p>
          {userGenotype && canon.interpretations[userGenotype.gt.toUpperCase()] && (
            <div className="bg-accent/5 border border-accent/20 rounded-md p-2">
              <div className="text-[9px] uppercase tracking-wider text-accent mb-1">sua interpretação</div>
              <div className="text-[11px]">{canon.interpretations[userGenotype.gt.toUpperCase()]}</div>
            </div>
          )}
        </>
      )}
      <Link
        href={`/viewer/snp/${rsid}`}
        className="btn-primary text-[11px] py-1.5 w-full justify-center flex items-center gap-1.5"
      >
        Ver detalhes <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}
