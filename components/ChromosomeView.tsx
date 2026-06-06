"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Target, Dna, Flag, AlertTriangle } from "lucide-react";
import { countChromosomeSnps, getChromosomeSnps } from "@/lib/db";
import type { Snp } from "@/lib/types";
import { chromLength, centromereOf } from "@/lib/chromosomes";
import { CHROM_INFO } from "@/lib/chromosomeInfo";
import { CANONICAL_SNPS, categoryColor, CATEGORY_LABELS } from "@/lib/canonicalSnps";
import { useFocus } from "@/lib/stores/focusStore";
import { fmt, formatBp } from "@/lib/utils";
import GenotypePill from "./GenotypePill";

export default function ChromosomeView({ chrom }: { chrom: string }) {
  const [snps, setSnps] = useState<Snp[]>([]);
  const [pageSnps, setPageSnps] = useState<Snp[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"all" | "hetero" | "indel">("all");
  const pageSize = 200;
  const { setChromosome, setSnp } = useFocus();

  const info = CHROM_INFO[chrom];
  const canonicalOnChrom = useMemo(
    () => CANONICAL_SNPS.filter((c) => c.chrom === chrom),
    [chrom]
  );

  useEffect(() => {
    setChromosome(chrom);
    return () => {
      // keep focus on chromosome when unmounting unless navigating away handles it
    };
  }, [chrom, setChromosome]);

  useEffect(() => {
    (async () => {
      const c = await countChromosomeSnps(chrom);
      setTotal(c);
      const all = await getChromosomeSnps(chrom, 50_000, 0);
      setSnps(all);
    })();
  }, [chrom]);

  useEffect(() => {
    setPageSnps(snps.slice(page * pageSize, (page + 1) * pageSize));
  }, [snps, page]);

  const filtered = useMemo(() => {
    if (filter === "all") return pageSnps;
    if (filter === "hetero") return pageSnps.filter((s) => s.call === "hetero");
    if (filter === "indel") return pageSnps.filter((s) => s.call === "indel");
    return pageSnps;
  }, [pageSnps, filter]);

  const len = chromLength(chrom);
  const [cStart, cEnd] = centromereOf(chrom);

  const callCounts = useMemo(() => {
    const c = { homo: 0, hetero: 0, indel: 0, nocall: 0 };
    for (const s of snps) c[s.call] = (c[s.call] ?? 0) + 1;
    return c;
  }, [snps]);

  const density = useMemo(() => buildDensity(snps, len), [snps, len]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link href="/viewer/chromosomes" className="btn-ghost text-xs inline-flex">
        <ChevronLeft className="h-3.5 w-3.5" /> todos os cromossomos
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card-elevated p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none opacity-60" style={{
          background: `radial-gradient(ellipse at top right, rgb(var(--c-accent) / 0.15), transparent 60%)`
        }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-1">Cromossomo</div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {info?.commonName ?? `Cromossomo ${chrom}`}
            </h1>
            <div className="text-sm text-fg-dim mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono">
              <span><Flag className="inline h-3 w-3 mr-1" />{fmt(total)} SNPs no seu DNA</span>
              <span>{formatBp(len)} pb</span>
              {cEnd > cStart && <span>centrômero {formatBp((cStart + cEnd) / 2)}</span>}
              <span>{canonicalOnChrom.length} canônicos</span>
            </div>
          </div>
        </div>

        {info?.knownFor && (
          <p className="mt-4 text-sm text-fg-dim leading-relaxed max-w-3xl relative">
            {info.knownFor}
          </p>
        )}

        {info?.majorGenes && info.majorGenes.length > 0 && (
          <div className="mt-4 relative">
            <div className="text-[10px] uppercase tracking-wider text-fg-muted mb-2">Genes principais</div>
            <div className="flex flex-wrap gap-1.5">
              {info.majorGenes.map((g) => (
                <span key={g} className="chip text-[10px] border-accent/20">{g}</span>
              ))}
            </div>
          </div>
        )}

        {info?.notableConditions && info.notableConditions.length > 0 && (
          <div className="mt-4 relative">
            <div className="text-[10px] uppercase tracking-wider text-fg-muted mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> Condições notáveis
            </div>
            <div className="flex flex-wrap gap-1.5">
              {info.notableConditions.map((c) => (
                <span key={c} className="badge bg-red-500/5 border border-red-500/20 text-red-300 text-[10px]">{c}</span>
              ))}
            </div>
          </div>
        )}

        {(info?.pArm || info?.qArm) && (
          <div className="mt-4 grid sm:grid-cols-2 gap-2 text-[11px] relative">
            {info.pArm && (
              <div className="bg-bg-soft/50 rounded-md p-2 border border-border">
                <span className="text-accent font-semibold">p (curto): </span>
                <span className="text-fg-dim">{info.pArm}</span>
              </div>
            )}
            {info.qArm && (
              <div className="bg-bg-soft/50 rounded-md p-2 border border-border">
                <span className="text-accent font-semibold">q (longo): </span>
                <span className="text-fg-dim">{info.qArm}</span>
              </div>
            )}
          </div>
        )}
      </motion.header>

      <div className="grid sm:grid-cols-4 gap-3">
        <StatBox label="homozigotos" value={callCounts.homo} color="#22d3ee" />
        <StatBox label="heterozigotos" value={callCounts.hetero} color="#a855f7" />
        <StatBox label="indels" value={callCounts.indel} color="#f59e0b" />
        <StatBox label="no-calls" value={callCounts.nocall} color="#64748b" />
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-fg-muted">Densidade ao longo do cromossomo</div>
          <div className="text-[10px] text-fg-muted">{snps.length.toLocaleString("pt-BR")} SNPs totais · {density.bins} bins</div>
        </div>
        <DensityStrip
          density={density}
          chromLen={len}
          centromere={[cStart, cEnd]}
          canonical={canonicalOnChrom}
          onPick={(rsid, pos) => {
            const c = canonicalOnChrom.find((x) => x.rsid === rsid);
            setSnp(rsid, { chrom, pos, label: c?.title, category: c?.category });
          }}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-fg-muted pt-1 border-t border-border">
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(k) }} />
              <span>{v.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {canonicalOnChrom.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Dna className="h-4 w-4 text-accent" />
            <h2 className="text-lg font-bold">SNPs canônicos neste cromossomo</h2>
            <span className="text-xs text-fg-muted">({canonicalOnChrom.length})</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {canonicalOnChrom.map((c) => {
              const userSnp = snps.find((s) => s.rsid === c.rsid);
              return (
                <motion.div
                  key={c.rsid}
                  whileHover={{ y: -2 }}
                  className="card card-hover p-4"
                  style={{ borderLeftWidth: 3, borderLeftColor: categoryColor(c.category) }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-fg-muted">{c.rsid} · {c.gene}</div>
                      <div className="font-semibold text-sm leading-snug">{c.title}</div>
                    </div>
                    {userSnp && <GenotypePill gt={userSnp.gt} call={userSnp.call} />}
                  </div>
                  <p className="text-[11px] text-fg-dim line-clamp-3 leading-relaxed">{c.shortDesc}</p>
                  {userSnp && c.interpretations[userSnp.gt.toUpperCase()] && (
                    <div className="mt-2 text-[11px] bg-accent/5 border border-accent/20 rounded p-2">
                      <span className="text-accent text-[9px] uppercase tracking-wider">sua leitura: </span>
                      {c.interpretations[userSnp.gt.toUpperCase()]}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() =>
                        setSnp(c.rsid, { chrom: c.chrom, pos: c.position ?? 0, label: c.title, category: c.category })
                      }
                      className="btn-outline text-[10px] py-1 px-2 flex items-center gap-1"
                    >
                      <Target className="h-3 w-3" /> focar na hélice
                    </button>
                    <Link href={`/viewer/snp/${c.rsid}`} className="text-[10px] text-accent hover:underline ml-auto">
                      detalhes →
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold">Tabela de SNPs</h2>
          <div className="flex gap-1 text-xs">
            {(["all", "hetero", "indel"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  filter === f ? "bg-accent/20 text-accent border border-accent/30" : "bg-bg-card border border-border text-fg-dim hover:text-fg"
                }`}
              >
                {f === "all" ? "todos" : f === "hetero" ? "só heterozigotos" : "só indels"}
              </button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-soft text-xs text-fg-muted uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">rsID</th>
                <th className="text-left px-4 py-3">Posição</th>
                <th className="text-left px-4 py-3">Genótipo</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.rsid} className="border-t border-border hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-2 font-mono text-xs">{s.rsid}</td>
                  <td className="px-4 py-2 font-mono text-xs text-fg-dim">{fmt(s.pos)}</td>
                  <td className="px-4 py-2">
                    <GenotypePill gt={s.gt} call={s.call} />
                  </td>
                  <td className="px-4 py-2 text-xs">
                    <CallBadge call={s.call} />
                  </td>
                  <td className="px-4 py-2 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSnp(s.rsid, { chrom: s.chrom, pos: s.pos })}
                      className="text-[10px] text-fg-muted hover:text-accent"
                      title="focar na hélice"
                    >
                      <Target className="h-3 w-3" />
                    </button>
                    <Link href={`/viewer/snp/${s.rsid}`} className="text-xs text-accent hover:underline">detalhe →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-fg-muted">
            Página {page + 1} de {Math.max(1, Math.ceil(total / pageSize))} · exibindo {filtered.length} linhas
          </div>
          <div className="flex gap-2">
            <button
              className="btn-ghost text-xs"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              anterior
            </button>
            <button
              className="btn-ghost text-xs"
              disabled={(page + 1) * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              próxima
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-3 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />
      <div className="text-[10px] uppercase tracking-wider text-fg-muted">{label}</div>
      <div className="text-xl font-bold font-mono mt-0.5">{fmt(value)}</div>
    </div>
  );
}

type Density = { bins: number; counts: number[]; max: number };

function buildDensity(snps: Snp[], chromLen: number): Density {
  const bins = 200;
  const counts = new Array(bins).fill(0);
  for (const s of snps) {
    const idx = Math.min(bins - 1, Math.floor((s.pos / chromLen) * bins));
    counts[idx]++;
  }
  const max = counts.reduce((a, b) => Math.max(a, b), 1);
  return { bins, counts, max };
}

function DensityStrip({
  density,
  chromLen,
  centromere,
  canonical,
  onPick,
}: {
  density: Density;
  chromLen: number;
  centromere: [number, number];
  canonical: typeof CANONICAL_SNPS;
  onPick: (rsid: string, pos: number) => void;
}) {
  const w = 1000;
  const h = 80;
  const [cs, ce] = centromere;
  const centromereX = (cs / chromLen) * w;
  const centromereW = ((ce - cs) / chromLen) * w;
  const barW = w / density.bins;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[80px]">
      <defs>
        <linearGradient id="dens-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect x="0" y="55" width={w} height="10" rx="5" fill="rgb(var(--c-bg-elevated))" stroke="rgb(var(--c-border))" />
      {chromLen > 1 && ce > cs && (
        <rect x={centromereX} y="55" width={Math.max(4, centromereW)} height="10" fill="rgb(var(--c-fg-muted) / 0.5)" />
      )}
      {density.counts.map((c, i) => {
        if (c === 0) return null;
        const barH = (c / density.max) * 48;
        return (
          <rect
            key={i}
            x={i * barW}
            y={52 - barH}
            width={Math.max(1, barW - 0.5)}
            height={barH}
            fill="url(#dens-grad)"
          />
        );
      })}
      {canonical.map((c) => {
        if (!c.position) return null;
        const x = (c.position / chromLen) * w;
        return (
          <g key={c.rsid} className="cursor-pointer" onClick={() => onPick(c.rsid, c.position!)}>
            <line x1={x} y1="0" x2={x} y2="70" stroke={categoryColor(c.category)} strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
            <circle cx={x} cy="70" r="4" fill={categoryColor(c.category)}>
              <title>{c.rsid} — {c.title}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

function CallBadge({ call }: { call: Snp["call"] }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    homo: { bg: "bg-cyan-500/10 text-cyan-300", color: "border-cyan-500/30", label: "homo" },
    hetero: { bg: "bg-purple-500/10 text-purple-300", color: "border-purple-500/30", label: "hetero" },
    indel: { bg: "bg-amber-500/10 text-amber-300", color: "border-amber-500/30", label: "indel" },
    nocall: { bg: "bg-slate-600/20 text-slate-400", color: "border-slate-600/30", label: "no-call" },
  };
  const m = map[call];
  return <span className={`badge border ${m.bg} ${m.color}`}>{m.label}</span>;
}
