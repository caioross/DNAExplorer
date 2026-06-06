"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft, ExternalLink, FlaskConical, BarChart3, Info, Loader2, BookText,
  Target, Users, Compass, Shield, AlertTriangle, Dna, Zap
} from "lucide-react";
import { getSnp } from "@/lib/db";
import type { Snp } from "@/lib/types";
import { findCanonicalByRsid, categoryColor, CATEGORY_LABELS } from "@/lib/canonicalSnps";
import { CHROM_INFO } from "@/lib/chromosomeInfo";
import { useFocus } from "@/lib/stores/focusStore";
import { fmt } from "@/lib/utils";
import GenotypePill from "./GenotypePill";

interface Annot {
  gene?: string;
  clinvar?: { sig?: string; conditions?: string[] };
  gnomad?: { af?: number; popmax?: { pop: string; af: number } };
  dbsnp?: { alleles?: string };
  vep?: { most_severe_consequence?: string };
  loading: boolean;
  error?: string;
  raw?: unknown;
}

export default function SnpDetail({ rsid }: { rsid: string }) {
  const [snp, setSnp] = useState<Snp | undefined | null>(null);
  const [annot, setAnnot] = useState<Annot>({ loading: true });
  const canonical = findCanonicalByRsid(rsid.toLowerCase());
  const chromInfo = canonical ? CHROM_INFO[canonical.chrom] : snp ? CHROM_INFO[snp.chrom] : null;
  const setFocus = useFocus((s) => s.setSnp);

  useEffect(() => {
    (async () => {
      const s = await getSnp(rsid.toLowerCase());
      setSnp(s ?? undefined);
      if (s) {
        setFocus(s.rsid, {
          chrom: s.chrom,
          pos: s.pos,
          label: canonical?.title,
          category: canonical?.category,
        });
      } else if (canonical?.position) {
        setFocus(canonical.rsid, {
          chrom: canonical.chrom,
          pos: canonical.position,
          label: canonical.title,
          category: canonical.category,
        });
      }
    })();

    (async () => {
      try {
        const r = await fetch(`/api/annotations/${rsid}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setAnnot({ loading: false, ...extractAnnotation(j) });
      } catch (err: any) {
        setAnnot({ loading: false, error: err?.message ?? "falha" });
      }
    })();
  }, [rsid]);

  if (snp === null) return <div className="py-12 text-center text-fg-muted">Carregando SNP...</div>;
  const catColor = canonical ? categoryColor(canonical.category) : "rgb(var(--c-accent))";
  const userGt = snp ? snp.gt.toUpperCase() : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button onClick={() => history.back()} className="btn-ghost text-xs inline-flex">
        <ChevronLeft className="h-3.5 w-3.5" /> voltar
      </button>

      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card-elevated p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none opacity-40"
             style={{ background: `radial-gradient(ellipse at top left, ${catColor}20, transparent 60%)` }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            {canonical && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider font-bold"
                      style={{ color: catColor }}>
                  {CATEGORY_LABELS[canonical.category]}
                </span>
                {canonical.sensitive && (
                  <span className="badge bg-red-500/10 text-red-400 border border-red-500/30 text-[9px]">
                    <AlertTriangle className="h-2.5 w-2.5" /> sensível
                  </span>
                )}
                {canonical.clinicalSignificance && (
                  <ClinSigBadge sig={canonical.clinicalSignificance} />
                )}
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-bold font-mono tracking-tight">{rsid.toLowerCase()}</h1>
            {canonical && (
              <div className="mt-1 text-lg font-semibold text-fg-dim">{canonical.title}</div>
            )}
            <div className="text-sm text-fg-muted mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono">
              {annot.gene && <span className="text-accent">gene {annot.gene}</span>}
              {canonical?.gene && !annot.gene && <span className="text-accent">gene {canonical.gene}</span>}
              {(canonical?.chrom || snp?.chrom) && (
                <Link href={`/viewer/chromosome/${canonical?.chrom ?? snp?.chrom}`} className="hover:text-accent">
                  chr{canonical?.chrom ?? snp?.chrom}
                </Link>
              )}
              {snp && <span>{fmt(snp.pos)}</span>}
              {annot.vep?.most_severe_consequence && (
                <span>{annot.vep.most_severe_consequence.replace(/_/g, " ")}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {snp ? (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-fg-muted">seu genótipo</div>
                <div className="mt-1"><GenotypePill gt={snp.gt} call={snp.call} /></div>
              </div>
            ) : (
              <div className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> não está no seu chip
              </div>
            )}
            {(snp || canonical?.position) && (
              <button
                onClick={() =>
                  setFocus(rsid.toLowerCase(), {
                    chrom: canonical?.chrom ?? snp!.chrom,
                    pos: canonical?.position ?? snp!.pos,
                    label: canonical?.title,
                    category: canonical?.category,
                  })
                }
                className="btn-outline text-[10px] py-1 px-2 flex items-center gap-1"
              >
                <Target className="h-3 w-3" /> focar na hélice
              </button>
            )}
          </div>
        </div>

        {canonical?.geneFullName && (
          <div className="mt-4 text-xs text-fg-dim relative">
            <Dna className="inline h-3 w-3 mr-1" />{canonical.geneFullName}
          </div>
        )}
      </motion.header>

      {canonical && snp && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="card-elevated p-6 relative overflow-hidden"
          style={{ borderColor: `${catColor}60` }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-20"
               style={{ background: `radial-gradient(circle at 100% 0%, ${catColor}, transparent 60%)` }} />
          <div className="flex items-start gap-3 mb-3 relative">
            <FlaskConical className="h-5 w-5 mt-1" style={{ color: catColor }} />
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider mb-1" style={{ color: catColor }}>Sua leitura</div>
              <div className="text-[11px] text-fg-muted">Genótipo {snp.gt} em {CATEGORY_LABELS[canonical.category]}</div>
            </div>
          </div>
          <div className="relative rounded-lg bg-bg/60 border p-4" style={{ borderColor: `${catColor}40` }}>
            <div className="text-fg leading-relaxed">
              {canonical.interpretations[userGt!] ||
                canonical.interpretations[userGt!.split("").reverse().join("")] ||
                "Seu genótipo não está mapeado na lista curada — consulte a anotação bruta abaixo."}
            </div>
          </div>

          {canonical.actionable && (
            <div className="mt-3 flex gap-2 items-start bg-accent/5 border border-accent/20 rounded-md p-2 relative">
              <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" />
              <span className="text-xs text-fg-dim"><strong className="text-accent">Ação possível: </strong>{canonical.actionable}</span>
            </div>
          )}
          {canonical.notes && (
            <div className="mt-3 flex gap-2 items-start relative">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-fg-muted" />
              <span className="text-xs text-fg-dim">{canonical.notes}</span>
            </div>
          )}
        </motion.div>
      )}

      {canonical && (
        <div className="space-y-5">
          {canonical.longDesc && (
            <Section title="Visão geral" icon={<BookText className="h-4 w-4" />} color={catColor}>
              <p className="text-sm text-fg-dim leading-relaxed">{canonical.longDesc}</p>
            </Section>
          )}
          {canonical.mechanism && (
            <Section title="Mecanismo biológico" icon={<Dna className="h-4 w-4" />} color={catColor}>
              <p className="text-sm text-fg-dim leading-relaxed">{canonical.mechanism}</p>
            </Section>
          )}

          <Section title="Todas as interpretações possíveis" icon={<Compass className="h-4 w-4" />} color={catColor}>
            <div className="space-y-2">
              {Object.entries(canonical.interpretations).map(([gt, text]) => {
                const isUser = userGt === gt;
                return (
                  <div
                    key={gt}
                    className={`rounded-md p-3 border text-sm ${
                      isUser ? "ring-glow bg-accent/8 border-accent/40" : "bg-bg-soft/50 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-mono font-bold text-xs ${isUser ? "text-accent" : "text-fg"}`}>{gt}</span>
                      {isUser && <span className="text-[9px] uppercase tracking-wider text-accent">você</span>}
                    </div>
                    <div className="text-fg-dim leading-relaxed">{text}</div>
                  </div>
                );
              })}
            </div>
          </Section>

          {canonical.populationNotes && (
            <Section title="Frequência populacional" icon={<Users className="h-4 w-4" />} color={catColor}>
              <p className="text-sm text-fg-dim leading-relaxed">{canonical.populationNotes}</p>
            </Section>
          )}

          {canonical.tags && canonical.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {canonical.tags.map((t) => (
                <span key={t} className="chip text-[10px]">#{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-fg-muted mb-2 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Frequência populacional (gnomAD)
          </div>
          {annot.loading ? (
            <div className="text-sm text-fg-muted flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> buscando...</div>
          ) : annot.gnomad?.af !== undefined ? (
            <div>
              <div className="text-2xl font-bold font-mono">{(annot.gnomad.af * 100).toFixed(3)}%</div>
              <div className="text-xs text-fg-dim">AF global em gnomAD</div>
              {annot.gnomad.popmax && (
                <div className="text-xs text-fg-dim mt-2">
                  popmax: {annot.gnomad.popmax.pop} ({(annot.gnomad.popmax.af * 100).toFixed(3)}%)
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-fg-muted">Sem dado de frequência retornado</div>
          )}
        </div>

        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-fg-muted mb-2 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" /> ClinVar
          </div>
          {annot.loading ? (
            <div className="text-sm text-fg-muted flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> buscando...</div>
          ) : annot.clinvar?.sig ? (
            <div>
              <ClinvarBadge sig={annot.clinvar.sig} />
              {annot.clinvar.conditions && annot.clinvar.conditions.length > 0 && (
                <ul className="mt-2 text-sm text-fg-dim space-y-1">
                  {annot.clinvar.conditions.slice(0, 4).map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="text-sm text-fg-muted">Sem registro clínico significativo</div>
          )}
        </div>
      </div>

      {canonical?.references && canonical.references.length > 0 && (
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-fg-muted mb-3">Referências científicas</div>
          <ul className="space-y-2">
            {canonical.references.map((r, i) => (
              <li key={i} className="text-xs text-fg-dim flex items-start gap-2">
                <span className="text-fg-muted font-mono">[{i + 1}]</span>
                <span className="flex-1">
                  {r.label}
                  {r.pmid && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-accent hover:underline"
                    >
                      PMID:{r.pmid} <ExternalLink className="inline h-2.5 w-2.5" />
                    </a>
                  )}
                  {r.url && !r.pmid && (
                    <a href={r.url} target="_blank" rel="noreferrer" className="ml-2 text-accent hover:underline">
                      link <ExternalLink className="inline h-2.5 w-2.5" />
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {chromInfo && (
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-fg-muted mb-2 flex items-center gap-2">
            <Compass className="h-3.5 w-3.5" /> Contexto cromossômico
          </div>
          <div className="text-sm font-semibold mb-1">{chromInfo.commonName}</div>
          <p className="text-xs text-fg-dim leading-relaxed">{chromInfo.knownFor}</p>
          <Link
            href={`/viewer/chromosome/${chromInfo.chrom}`}
            className="mt-3 btn-outline text-[10px] py-1.5 px-3 inline-flex items-center gap-1"
          >
            explorar chr{chromInfo.chrom} →
          </Link>
        </div>
      )}

      <div className="card p-5">
        <div className="text-xs uppercase tracking-wider text-fg-muted mb-3">Consultar em bases externas</div>
        <div className="flex flex-wrap gap-2">
          <ExtLink href={`https://www.ncbi.nlm.nih.gov/snp/${rsid}`} label="dbSNP" />
          <ExtLink href={`https://www.ncbi.nlm.nih.gov/clinvar/?term=${rsid}%5BVariant+ID%5D`} label="ClinVar" />
          <ExtLink href={`https://gnomad.broadinstitute.org/variant/${rsid}`} label="gnomAD" />
          <ExtLink href={`https://www.snpedia.com/index.php/${rsid.toLowerCase().replace(/^rs/, "Rs")}`} label="SNPedia" />
          <ExtLink href={`https://rest.ensembl.org/vep/human/id/${rsid}?content-type=application/json`} label="Ensembl VEP" />
          <ExtLink href={`https://www.ebi.ac.uk/gwas/search?query=${rsid}`} label="GWAS Catalog" />
          <ExtLink href={`https://myvariant.info/v1/variant/${rsid}?assembly=hg19`} label="MyVariant.info" />
          <ExtLink href={`https://www.pharmgkb.org/search?query=${rsid}`} label="PharmGKB" />
        </div>
      </div>

      {annot.raw ? (
        <details className="card p-5">
          <summary className="cursor-pointer text-xs uppercase tracking-wider text-fg-muted">
            Anotação bruta (MyVariant.info / hg19)
          </summary>
          <pre className="mt-3 text-xs text-fg-dim max-h-[400px] overflow-auto font-mono">
            {JSON.stringify(annot.raw, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function Section({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      <div className="text-xs uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color }}>
        {icon} {title}
      </div>
      {children}
    </motion.div>
  );
}

function ClinSigBadge({ sig }: { sig: string }) {
  const map: Record<string, { color: string; label: string }> = {
    pathogenic: { color: "bg-red-500/15 text-red-300 border-red-500/40", label: "Patogênica" },
    likely_pathogenic: { color: "bg-orange-500/15 text-orange-300 border-orange-500/40", label: "Provável patogênica" },
    vus: { color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40", label: "VUS" },
    likely_benign: { color: "bg-lime-500/15 text-lime-300 border-lime-500/40", label: "Provável benigna" },
    benign: { color: "bg-green-500/15 text-green-300 border-green-500/40", label: "Benigna" },
  };
  const m = map[sig] ?? { color: "bg-slate-600/20 text-slate-300 border-slate-600/30", label: sig };
  return <span className={`badge border text-[9px] ${m.color}`}>{m.label}</span>;
}

function ClinvarBadge({ sig }: { sig: string }) {
  const map: Record<string, { color: string; label: string }> = {
    Pathogenic: { color: "bg-red-500/15 text-red-300 border-red-500/40", label: "Pathogenic" },
    "Likely pathogenic": { color: "bg-orange-500/15 text-orange-300 border-orange-500/40", label: "Likely pathogenic" },
    "Uncertain significance": { color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40", label: "VUS" },
    "Likely benign": { color: "bg-lime-500/15 text-lime-300 border-lime-500/40", label: "Likely benign" },
    Benign: { color: "bg-green-500/15 text-green-300 border-green-500/40", label: "Benign" },
  };
  const m = map[sig] ?? { color: "bg-slate-600/20 text-slate-300 border-slate-600/30", label: sig };
  return <span className={`badge border ${m.color}`}>{m.label}</span>;
}

function ExtLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="chip hover:border-accent hover:text-accent transition-colors"
    >
      {label} <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function extractAnnotation(j: any) {
  const out: Omit<Annot, "loading"> = { raw: j };
  try {
    if (j?.dbsnp) {
      out.dbsnp = { alleles: (j.dbsnp?.alleles || []).map((a: any) => a.allele).join("/") };
      if (j.dbsnp.gene?.symbol) out.gene = j.dbsnp.gene.symbol;
    }
    if (j?.cadd?.gene?.genename && !out.gene) out.gene = j.cadd.gene.genename;

    if (j?.clinvar) {
      const rcv = Array.isArray(j.clinvar.rcv) ? j.clinvar.rcv : j.clinvar.rcv ? [j.clinvar.rcv] : [];
      const sig = rcv[0]?.clinical_significance;
      const conditions = rcv.map((r: any) => r?.conditions?.name).filter(Boolean);
      if (sig) out.clinvar = { sig, conditions };
    }
    if (j?.gnomad_genome?.af) {
      out.gnomad = { af: j.gnomad_genome.af.af };
    } else if (j?.gnomad_exome?.af) {
      out.gnomad = { af: j.gnomad_exome.af.af };
    }
    if (j?.snpeff?.ann) {
      const ann = Array.isArray(j.snpeff.ann) ? j.snpeff.ann[0] : j.snpeff.ann;
      if (ann?.effect) out.vep = { most_severe_consequence: ann.effect };
      if (ann?.gene_name && !out.gene) out.gene = ann.gene_name;
    }
  } catch {}
  return out;
}
