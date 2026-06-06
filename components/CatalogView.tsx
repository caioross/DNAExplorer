"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown, AlertTriangle, ExternalLink, Heart, Pill, Sparkles, Apple, Dumbbell, Target, FlaskConical } from "lucide-react";
import { CANONICAL_SNPS, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, categoryColor, groupByCategory } from "@/lib/canonicalSnps";
import { db } from "@/lib/db";
import { useFocus } from "@/lib/stores/focusStore";
import type { CanonicalSnp, Snp } from "@/lib/types";
import GenotypePill from "./GenotypePill";

const CAT_ICONS: Record<string, any> = {
  trait: Sparkles,
  health: Heart,
  pharmaco: Pill,
  nutri: Apple,
  sport: Dumbbell,
};

interface Entry {
  canon: CanonicalSnp;
  user: Snp | null;
}

export default function CatalogView() {
  const params = useSearchParams();
  const router = useRouter();
  const catFilter = params.get("cat");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(catFilter);
  const { setSnp, setMarkers } = useFocus();

  useEffect(() => {
    (async () => {
      if (!db) return;
      const out: Entry[] = [];
      for (const canon of CANONICAL_SNPS) {
        const user = (await db.snps.get(canon.rsid)) ?? null;
        out.push({ canon, user });
      }
      setEntries(out);
    })();
  }, []);

  useEffect(() => {
    const cat = activeCat;
    const visible = entries.filter((e) => {
      if (cat && e.canon.category !== cat) return false;
      return true;
    }).filter(e => e.canon.position);
    setMarkers(
      visible.slice(0, 40).map((e) => ({
        rsid: e.canon.rsid,
        chrom: e.canon.chrom,
        pos: e.canon.position!,
        color: categoryColor(e.canon.category),
        label: e.canon.gene,
        category: e.canon.category,
      }))
    );
    return () => { setMarkers([]); };
  }, [activeCat, entries, setMarkers]);

  const grouped = useMemo(() => groupByCategory(
    entries
      .filter((e) => !activeCat || e.canon.category === activeCat)
      .map((e) => e.canon)
  ), [entries, activeCat]);

  const userByRsid = useMemo(() => {
    const m: Record<string, Snp | null> = {};
    for (const e of entries) m[e.canon.rsid] = e.user;
    return m;
  }, [entries]);

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-5 w-5 text-accent" />
          <h1 className="text-3xl font-bold tracking-tight">Catálogo canônico</h1>
        </div>
        <p className="text-fg-dim max-w-3xl">
          32 variantes genéticas curadas com interpretação, mecanismo molecular, frequência populacional e
          referências primárias. Clique em qualquer entrada para expandir; use "Focar na hélice" para
          destacar a variante no modelo 3D ao lado.
        </p>
      </motion.div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setActiveCat(null); router.replace("/viewer/catalog"); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            !activeCat ? "bg-accent/10 border-accent text-accent" : "border-border text-fg-dim hover:text-fg hover:border-border-strong"
          }`}
        >
          Todas ({entries.length})
        </button>
        {Object.keys(CATEGORY_LABELS).map((cat) => {
          const Icon = CAT_ICONS[cat];
          const count = entries.filter(e => e.canon.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => { setActiveCat(cat); router.replace(`/viewer/catalog?cat=${cat}`); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                activeCat === cat ? "" : "border-border text-fg-dim hover:text-fg"
              }`}
              style={activeCat === cat ? { borderColor: categoryColor(cat), background: `${categoryColor(cat)}15`, color: categoryColor(cat) } : {}}
            >
              <Icon className="h-3 w-3" />
              {CATEGORY_LABELS[cat].split(" ")[0]} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-8">
        {Object.entries(grouped).map(([cat, list]) => {
          const Icon = CAT_ICONS[cat];
          const color = categoryColor(cat);
          return (
            <section key={cat}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div>
                  <h2 className="font-bold text-lg">{CATEGORY_LABELS[cat]}</h2>
                  <p className="text-[10px] text-fg-muted">{CATEGORY_DESCRIPTIONS[cat]}</p>
                </div>
              </div>
              <div className="space-y-2">
                {list.map((canon, i) => (
                  <CanonicalCard
                    key={canon.rsid}
                    canon={canon}
                    user={userByRsid[canon.rsid]}
                    expanded={expanded === canon.rsid}
                    onToggle={() => setExpanded(expanded === canon.rsid ? null : canon.rsid)}
                    onFocusHelix={() => setSnp(canon.rsid, { chrom: canon.chrom, pos: canon.position ?? 0, label: canon.title, category: canon.category })}
                    delay={i * 0.03}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CanonicalCard({ canon, user, expanded, onToggle, onFocusHelix, delay }: {
  canon: CanonicalSnp;
  user: Snp | null | undefined;
  expanded: boolean;
  onToggle: () => void;
  onFocusHelix: () => void;
  delay: number;
}) {
  const color = categoryColor(canon.category);
  const userGt = user?.gt.toUpperCase();
  const userInterp = userGt ? canon.interpretations[userGt] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="card overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <div
        onClick={onToggle}
        className="p-4 cursor-pointer hover:bg-bg-elevated/40 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-base leading-tight">{canon.title}</span>
              {canon.sensitive && (
                <span className="badge bg-red-500/10 text-red-400 border border-red-500/30">
                  <AlertTriangle className="h-2.5 w-2.5" /> sensível
                </span>
              )}
              {canon.clinicalSignificance && (
                <span className="badge border" style={{
                  background: canon.clinicalSignificance === "pathogenic" ? "#ef444420" : canon.clinicalSignificance === "vus" ? "#eab30820" : "#22c55e20",
                  color: canon.clinicalSignificance === "pathogenic" ? "#f87171" : canon.clinicalSignificance === "vus" ? "#fbbf24" : "#4ade80",
                  borderColor: canon.clinicalSignificance === "pathogenic" ? "#ef444450" : canon.clinicalSignificance === "vus" ? "#eab30850" : "#22c55e50",
                }}>
                  {canon.clinicalSignificance}
                </span>
              )}
            </div>
            <div className="text-[11px] text-fg-muted font-mono mb-1.5">
              {canon.geneFullName || canon.gene} · {canon.rsid} · chr{canon.chrom}{canon.position ? `:${canon.position.toLocaleString("pt-BR")}` : ""}
            </div>
            <p className="text-sm text-fg-dim leading-relaxed">{canon.shortDesc}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {user ? <GenotypePill gt={user.gt} call={user.call} /> : <span className="badge bg-bg-soft text-fg-muted">não no perfil</span>}
            <ChevronDown className={`h-4 w-4 text-fg-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </div>

        {userInterp && !expanded && (
          <div className="mt-3 p-2.5 rounded-md border text-[12px]" style={{ background: `${color}10`, borderColor: `${color}40` }}>
            <span className="font-semibold" style={{ color }}>{userGt}:</span>{" "}
            <span className="text-fg">{userInterp}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-5 space-y-5 bg-bg-soft/30">
              {canon.longDesc && (
                <div>
                  <SectionLabel icon={BookOpen} label="Descrição" />
                  <p className="text-[13px] text-fg leading-relaxed">{canon.longDesc}</p>
                </div>
              )}

              {canon.mechanism && (
                <div>
                  <SectionLabel icon={FlaskConical} label="Mecanismo molecular" />
                  <p className="text-[13px] text-fg-dim leading-relaxed">{canon.mechanism}</p>
                </div>
              )}

              <div>
                <SectionLabel icon={Target} label="Interpretações por genótipo" />
                <div className="space-y-1.5">
                  {Object.entries(canon.interpretations).map(([gt, text]) => {
                    const isUserGt = gt === userGt;
                    return (
                      <div
                        key={gt}
                        className={`rounded-lg p-3 text-[12px] border flex items-start gap-3 ${
                          isUserGt ? "border-accent bg-accent/5 ring-glow" : "border-border bg-bg-soft/50"
                        }`}
                      >
                        <div className={`font-mono font-bold w-12 flex-shrink-0 text-center rounded-md py-1 ${
                          isUserGt ? "bg-accent/20 text-accent" : "bg-bg-soft text-fg-dim"
                        }`}>
                          {gt}
                        </div>
                        <div className="flex-1">
                          {isUserGt && <span className="badge bg-accent/15 text-accent mb-1 text-[9px]">seu genótipo</span>}
                          <div className="text-fg">{text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {canon.populationNotes && (
                <div>
                  <SectionLabel icon={Sparkles} label="Frequência populacional" />
                  <p className="text-[12px] text-fg-dim leading-relaxed">{canon.populationNotes}</p>
                </div>
              )}

              {canon.actionable && (
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-accent mb-1.5">
                    <Target className="h-3 w-3" /> Ação prática
                  </div>
                  <p className="text-[12px] leading-relaxed">{canon.actionable}</p>
                </div>
              )}

              {canon.notes && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-amber-400 mb-1">Observações</div>
                  <p className="text-[12px] leading-relaxed text-fg-dim">{canon.notes}</p>
                </div>
              )}

              {canon.references && canon.references.length > 0 && (
                <div>
                  <SectionLabel icon={BookOpen} label="Referências" />
                  <ul className="space-y-1">
                    {canon.references.map((r, i) => (
                      <li key={i} className="text-[11px] text-fg-dim flex items-start gap-1.5">
                        <span className="text-fg-muted">[{i + 1}]</span>
                        {r.pmid ? (
                          <a href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}`} target="_blank" rel="noreferrer" className="hover:text-accent flex items-start gap-1">
                            {r.label} <span className="text-fg-muted">PMID:{r.pmid}</span>
                            <ExternalLink className="h-2.5 w-2.5 mt-0.5" />
                          </a>
                        ) : r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer" className="hover:text-accent flex items-start gap-1">
                            {r.label}
                            <ExternalLink className="h-2.5 w-2.5 mt-0.5" />
                          </a>
                        ) : (
                          <span>{r.label}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2 flex-wrap">
                <button
                  onClick={(e) => { e.stopPropagation(); onFocusHelix(); }}
                  className="btn-primary text-xs"
                >
                  Focar na hélice →
                </button>
                <Link href={`/viewer/snp/${canon.rsid}`} onClick={(e) => e.stopPropagation()} className="btn-outline text-xs">
                  Página detalhada
                </Link>
                <a href={`https://www.ncbi.nlm.nih.gov/snp/${canon.rsid}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="btn-ghost text-xs">
                  dbSNP <ExternalLink className="h-3 w-3" />
                </a>
                <a href={`https://www.snpedia.com/index.php/${canon.rsid}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="btn-ghost text-xs">
                  SNPedia <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-fg-muted mb-1.5">
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}
