"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Dna, Activity, Sparkles, AlertTriangle, ChevronRight, Zap, Heart, Pill, Apple, Dumbbell, Info } from "lucide-react";
import { getStats, db } from "@/lib/db";
import { CANONICAL_SNPS, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, categoryColor } from "@/lib/canonicalSnps";
import { useFocus } from "@/lib/stores/focusStore";
import { fmt } from "@/lib/utils";
import type { CanonicalSnp, Snp } from "@/lib/types";

interface Stats {
  total: number;
  byChrom: Record<string, number>;
  byCall: Record<string, number>;
}

interface CanonicalFinding {
  canon: CanonicalSnp;
  snp: Snp | null;
  interpretation: string | null;
  significance: "hit" | "partial" | "miss" | "nocall" | "missing";
}

const CAT_ICONS: Record<string, any> = {
  trait: Sparkles,
  health: Heart,
  pharmaco: Pill,
  nutri: Apple,
  sport: Dumbbell,
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [findings, setFindings] = useState<CanonicalFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const { setSnp, snpRsid, markers, mode } = useFocus();
  const focusedIds = new Set(
    [snpRsid, ...markers.map((m) => m.rsid)].filter(Boolean) as string[]
  );
  const focusedCategories = new Set(
    markers.map((m) => m.category).filter(Boolean) as string[]
  );

  useEffect(() => {
    (async () => {
      const s = await getStats();
      setStats(s);
      if (!db) { setLoading(false); return; }
      const out: CanonicalFinding[] = [];
      for (const canon of CANONICAL_SNPS) {
        const snp = (await db.snps.get(canon.rsid)) ?? null;
        let significance: CanonicalFinding["significance"] = "missing";
        let interpretation: string | null = null;
        if (!snp) significance = "missing";
        else if (snp.call === "nocall") significance = "nocall";
        else {
          const gt = snp.gt.toUpperCase();
          interpretation = canon.interpretations[gt] ?? null;
          if (!interpretation) significance = "partial";
          else {
            const text = interpretation.toLowerCase();
            if (
              text.includes("risco") || text.includes("homozigoto") || text.includes("muito provável") ||
              text.includes("alto") || text.includes("ultrarrápido") || text.includes("lento") ||
              text.includes("persistência total") || text.includes("secretor")
            ) significance = "hit";
            else significance = "partial";
          }
        }
        out.push({ canon, snp, interpretation, significance });
      }
      setFindings(out);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 card" />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-28 card" />)}
        </div>
        <div className="h-72 card" />
      </div>
    );
  }

  const topFindings = findings
    .filter(f => f.significance === "hit" || f.significance === "partial")
    .sort((a, b) => {
      const score = (f: CanonicalFinding) =>
        (f.significance === "hit" ? 2 : 1) + (f.canon.sensitive ? 0.5 : 0);
      return score(b) - score(a);
    })
    .slice(0, 8);

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-4xl font-bold tracking-tight">Seu genoma</h1>
          <span className="chip text-[10px]">client-side</span>
        </div>
        <p className="text-fg-dim max-w-2xl leading-relaxed">
          Um retrato de <span className="font-mono text-accent font-semibold">{fmt(stats.total)}</span> pontos do seu código genético.
          A hélice ao lado é a sua — clique em qualquer cromossomo ou variante para localizá-la.
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Dna}
          label="Total"
          value={fmt(stats.total)}
          hint="SNPs genotipados"
          accent="accent"
        />
        <StatCard
          icon={Activity}
          label="Heterozigotos"
          value={fmt(stats.byCall.hetero || 0)}
          hint={`${((stats.byCall.hetero / stats.total) * 100).toFixed(1)}%`}
          accent="violet"
        />
        <StatCard
          icon={Zap}
          label="Homozigotos"
          value={fmt(stats.byCall.homo || 0)}
          hint={`${((stats.byCall.homo / stats.total) * 100).toFixed(1)}%`}
          accent="cyan"
        />
        <StatCard
          icon={AlertTriangle}
          label="No-calls"
          value={fmt(stats.byCall.nocall || 0)}
          hint={`${((stats.byCall.nocall / stats.total) * 100).toFixed(1)}%`}
          accent="amber"
        />
      </div>

      {/* Notable findings — primary content */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Achados do seu DNA</h2>
            <p className="text-xs text-fg-dim">Variantes canônicas com leitura acionável no seu genótipo</p>
          </div>
          <Link href="/viewer/catalog" className="btn-ghost text-xs">
            catálogo completo <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {topFindings.length === 0 ? (
          <div className="card p-6 text-sm text-fg-muted">Nenhum achado. Explore o catálogo para ver todas as interpretações.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {topFindings.map((f, i) => (
              <FindingCard
                key={f.canon.rsid}
                finding={f}
                delay={i * 0.04}
                focused={focusedIds.has(f.canon.rsid)}
                onFocus={() => setSnp(f.canon.rsid, {
                  chrom: f.canon.chrom,
                  pos: f.canon.position ?? 0,
                  label: f.canon.title,
                  category: f.canon.category,
                })}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* Category tiles — browse catalog */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className="mb-3">
          <h2 className="text-xl font-bold">Explorar por domínio</h2>
          <p className="text-xs text-fg-dim">32 variantes curadas em 5 áreas da biologia humana</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.keys(CATEGORY_LABELS).map((cat) => {
            const Icon = CAT_ICONS[cat];
            const list = findings.filter(f => f.canon.category === cat);
            const hits = list.filter(f => f.significance === "hit").length;
            const catActive = mode === "multi" && focusedCategories.size === 1 && focusedCategories.has(cat);
            return (
              <Link
                href={`/viewer/catalog?cat=${cat}`}
                key={cat}
                className={`card p-4 card-hover group relative overflow-hidden transition-all ${
                  catActive ? "ring-2 ring-offset-0" : ""
                }`}
                style={catActive ? { boxShadow: `0 0 24px ${categoryColor(cat)}66`, borderColor: categoryColor(cat) } : undefined}
              >
                <div
                  className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"
                  style={{ background: categoryColor(cat), transform: "translate(30%, -30%)" }}
                />
                <div className="relative">
                  <div className="flex items-start justify-between mb-2">
                    <Icon className="h-5 w-5" style={{ color: categoryColor(cat) }} />
                    <span className="text-[9px] text-fg-muted uppercase">{list.length} SNPs</span>
                  </div>
                  <div className="font-semibold text-sm">{CATEGORY_LABELS[cat]}</div>
                  <div className="text-[10px] text-fg-dim mt-1 leading-relaxed line-clamp-2">
                    {CATEGORY_DESCRIPTIONS[cat]}
                  </div>
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] text-fg-muted">{hits} achado(s)</span>
                    <ChevronRight className="h-3 w-3 text-fg-muted group-hover:text-accent transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="card p-4 text-[11px] text-fg-muted flex items-start gap-2"
      >
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-fg-dim">Disclaimer:</strong> este painel é exploratório e não constitui aconselhamento médico.
          Variantes de risco são fatores — não sentenças. Estilo de vida, ambiente e outras variantes genéticas
          interagem substancialmente. Discuta achados relevantes com seu médico.
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, accent }: any) {
  const colors: Record<string, string> = {
    accent: "text-accent",
    violet: "text-violet-400",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
  };
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="card p-4 card-hover"
    >
      <div className="flex items-center justify-between mb-1.5">
        <Icon className={`h-4 w-4 ${colors[accent]}`} />
      </div>
      <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
      <div className="text-xs text-fg-dim">{label}</div>
      <div className="text-[10px] text-fg-muted mt-1 leading-tight">{hint}</div>
    </motion.div>
  );
}

function FindingCard({ finding, delay, focused, onFocus }: { finding: CanonicalFinding; delay: number; focused: boolean; onFocus: () => void }) {
  const { canon, snp, interpretation } = finding;
  const color = categoryColor(canon.category);

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onFocus}
      className={`text-left card p-4 card-hover group relative overflow-hidden transition-all ${
        focused ? "ring-2 scale-[1.02]" : ""
      }`}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: color,
        boxShadow: focused ? `0 0 28px ${color}88, inset 0 0 20px ${color}22` : undefined,
        borderColor: focused ? color : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-1 gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="font-bold text-sm leading-tight">{canon.title}</span>
            {canon.sensitive && (
              <span className="badge bg-red-500/10 text-red-400 border border-red-500/30 text-[9px]">
                sensível
              </span>
            )}
          </div>
          <div className="text-[10px] text-fg-muted font-mono truncate">
            {canon.gene} · {canon.rsid} · chr{canon.chrom}
          </div>
        </div>
        {snp && <GenotypeMini gt={snp.gt} />}
      </div>
      {interpretation && (
        <div className="text-[12px] text-fg-dim mt-2 line-clamp-2 leading-relaxed">
          {interpretation}
        </div>
      )}
      <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-wider font-medium" style={{ color }}>
          {CATEGORY_LABELS[canon.category].split(" ")[0]}
        </span>
        <span className="text-[10px] text-fg-muted group-hover:text-accent transition-colors flex items-center gap-1">
          focar na hélice <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </motion.button>
  );
}

function GenotypeMini({ gt }: { gt: string }) {
  const colors: Record<string, string> = { A: "#22c55e", T: "#ef4444", G: "#eab308", C: "#3b82f6" };
  return (
    <div className="flex gap-0.5 font-mono text-[10px] font-bold">
      {gt.split("").slice(0, 2).map((b, i) => (
        <span key={i} style={{ color: colors[b] ?? "#64748b" }} className="px-1 rounded bg-bg-soft">{b}</span>
      ))}
    </div>
  );
}
