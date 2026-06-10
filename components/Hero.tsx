"use client";
import { motion } from "framer-motion";
import {
  Dna, Shield, Cpu, Microscope, Github, ChevronRight, Upload as UploadIcon,
  Search, Lock, Zap, FileCode2, Eye, Database, ArrowDown,
} from "lucide-react";
import Upload from "./Upload";
import HelixBackdrop from "./HelixBackdrop";

const GITHUB_URL = "https://github.com/caioross/DNAExplorer";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.21, 0.47, 0.32, 0.98] as const },
  }),
};

export default function Hero() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* 3D helix backdrop */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <HelixBackdrop />
      </div>
      {/* Fade the backdrop into the page */}
      <div className="absolute inset-x-0 top-[80vh] h-64 bg-gradient-to-b from-transparent to-bg pointer-events-none" />

      {/* ───────────────────────── Header ───────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 px-6 py-5 flex items-center justify-between max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-2.5">
          <Dna className="h-7 w-7 text-accent helix-glow animate-pulse-slow" />
          <span className="font-bold text-lg tracking-tight">DNA Explorer</span>
          <span className="chip ml-2 text-[10px] opacity-70">v0.1 · MVP</span>
        </div>
        <nav className="flex items-center gap-1 sm:gap-4 text-sm text-fg-dim">
          <a href="#how" className="hidden sm:inline hover:text-fg transition-colors">Como funciona</a>
          <a href="#features" className="hidden sm:inline hover:text-fg transition-colors">Recursos</a>
          <a href="#privacy" className="hidden sm:inline hover:text-fg transition-colors">Privacidade</a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-outline !py-1.5 !px-3 ml-1"
          >
            <Github className="h-4 w-4" /> <span className="hidden sm:inline">GitHub</span>
          </a>
        </nav>
      </motion.header>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-10 md:pt-16 pb-24">
        <div className="max-w-3xl">
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
            <div className="inline-flex items-center gap-2 chip mb-6 border-accent/30 bg-accent/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              <span>100% client-side · seus dados nunca saem do navegador</span>
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6"
          >
            Seu DNA bruto,{" "}
            <span className="grad-text">explorável</span>{" "}
            como nunca antes.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={2}
            className="text-fg-dim text-lg md:text-xl max-w-2xl mb-8 leading-relaxed"
          >
            Suba o arquivo do seu teste de DNA (Genera, 23andMe, AncestryDNA, MyHeritage…) e
            navegue seu genoma em <strong className="text-fg font-semibold">3D</strong>, explore
            o cariótipo, descubra variantes famosas e veja estatísticas — tudo rodando{" "}
            <strong className="text-fg font-semibold">no seu próprio navegador</strong>.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}>
            <Upload />
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={4}
            className="mt-4 text-xs text-fg-muted max-w-2xl flex items-start gap-2"
          >
            <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent/70" />
            <span>
              Plataforma educacional e de exploração científica. Não substitui aconselhamento
              médico ou genético profissional. Os arquivos ficam no seu navegador (IndexedDB) —
              apague a qualquer momento.
            </span>
          </motion.div>
        </div>

        {/* ───────────────────────── Stats bar ───────────────────────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          custom={0}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { value: "~600k", label: "SNPs por arquivo", icon: <Database className="h-4 w-4" /> },
            { value: "100+", label: "variantes curadas", icon: <FileCode2 className="h-4 w-4" /> },
            { value: "5+", label: "provedores suportados", icon: <UploadIcon className="h-4 w-4" /> },
            { value: "0 bytes", label: "enviados a servidores", icon: <Shield className="h-4 w-4" /> },
          ].map((s) => (
            <div key={s.label} className="card card-hover p-5 text-center">
              <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center mx-auto mb-3">
                {s.icon}
              </div>
              <div className="text-2xl md:text-3xl font-extrabold grad-text">{s.value}</div>
              <div className="text-xs text-fg-dim mt-1">{s.label}</div>
            </div>
          ))}
        </motion.section>

        {/* ───────────────────────── How it works ───────────────────────── */}
        <section id="how" className="mt-28 scroll-mt-20">
          <SectionHeading
            eyebrow="Em 3 passos"
            title="Do arquivo esquecido ao genoma navegável"
          />
          <div className="grid md:grid-cols-3 gap-4 mt-8 relative">
            {[
              {
                n: "01",
                icon: <UploadIcon className="h-5 w-5" />,
                title: "Suba o arquivo",
                body: "Arraste o export bruto do seu teste DTC. A detecção de provedor é automática — Genera, 23andMe, Ancestry, MyHeritage ou VCF.",
              },
              {
                n: "02",
                icon: <Zap className="h-5 w-5" />,
                title: "Parsing instantâneo",
                body: "Um Web Worker faz o streaming de ~600k SNPs para o IndexedDB em segundos. Sua máquina não trava, nada é enviado para a rede.",
              },
              {
                n: "03",
                icon: <Eye className="h-5 w-5" />,
                title: "Explore tudo",
                body: "Hélice 3D, cariótipo, dashboard estatístico, catálogo de variantes e busca por rsID — tudo linkado e interativo.",
              },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                custom={i}
                className="card card-hover p-6 relative overflow-hidden"
              >
                <div className="absolute -top-4 -right-2 text-7xl font-black text-fg/[0.04] select-none">
                  {step.n}
                </div>
                <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4 ring-1 ring-accent/20">
                  {step.icon}
                </div>
                <div className="font-semibold text-lg mb-2">{step.title}</div>
                <div className="text-sm text-fg-dim leading-relaxed">{step.body}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ───────────────────────── Features ───────────────────────── */}
        <section id="features" className="mt-28 scroll-mt-20">
          <SectionHeading
            eyebrow="Recursos"
            title="O que você consegue fazer"
          />
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {[
              {
                icon: <Microscope className="h-5 w-5" />,
                title: "Navegação multi-escala",
                body: "Do genoma inteiro até um SNP individual. Cariótipo, cromossomo, gene, variante — tudo conectado.",
                color: "cat-trait",
              },
              {
                icon: <Dna className="h-5 w-5" />,
                title: "Hélice 3D realista",
                body: "Dupla hélice B-form com coloração Watson-Crick. Gire, aproxime e explore a fita com Bloom e profundidade.",
                color: "accent",
              },
              {
                icon: <Cpu className="h-5 w-5" />,
                title: "Catálogo canônico",
                body: "100+ SNPs famosos pré-anotados — cor dos olhos, lactase, Fator V Leiden, CYP2C19, ACTN3 e muito mais.",
                color: "cat-pharmaco",
              },
              {
                icon: <Shield className="h-5 w-5" />,
                title: "Privacidade radical",
                body: "Seu DNA nunca sai do navegador. Sem conta, sem servidor, sem log. LGPD por construção.",
                color: "cat-health",
              },
              {
                icon: <UploadIcon className="h-5 w-5" />,
                title: "Multi-provider",
                body: "Genera (CSV e TXT), 23andMe, AncestryDNA, MyHeritage e VCF genérico — tudo num schema único.",
                color: "cat-nutri",
              },
              {
                icon: <Search className="h-5 w-5" />,
                title: "Busca livre",
                body: "Por rsID, gene, traço ou cromossomo. Drill-down até o genótipo com interpretações e referências.",
                color: "cat-sport",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                custom={i % 3}
                className="card p-5 group hover:border-accent/40 transition-all hover:-translate-y-1 hover:shadow-glow-soft"
              >
                <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <div className="font-semibold mb-1">{f.title}</div>
                <div className="text-sm text-fg-dim leading-relaxed">{f.body}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ───────────────────────── Privacy ───────────────────────── */}
        <motion.section
          id="privacy"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-28 scroll-mt-20 card p-8 md:p-10 relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 chip mb-4 border-accent/30 bg-accent/5">
              <Lock className="h-3.5 w-3.5 text-accent" /> Privacidade por construção
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 max-w-2xl">
              Seu genoma é o dado mais íntimo que existe. Aqui ele{" "}
              <span className="grad-text">nunca sai de casa</span>.
            </h2>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
              {[
                "Seu arquivo é lido e processado 100% no navegador — nenhum byte trafega pela rede.",
                "Armazenado em IndexedDB local. O botão \"Apagar tudo\" elimina instantaneamente.",
                "Anotações de variantes usam apenas o rsID (informação pública), nunca o genótipo.",
                "Arquitetura atende a LGPD Art. 11 (dado sensível) por nunca hospedar dados pessoais.",
                "Sem cadastro, sem cookies de rastreamento, sem analytics de terceiros.",
                "Código aberto sob licença MIT — auditável por qualquer pessoa.",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2.5 text-fg-dim">
                  <Shield className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                  <span className="text-sm leading-relaxed">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ───────────────────────── Stack + Sources ───────────────────────── */}
        <section id="stack" className="mt-16 grid md:grid-cols-2 gap-4">
          <div className="card p-6">
            <div className="font-semibold text-fg mb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-accent" /> Stack técnica
            </div>
            <div className="flex flex-wrap gap-2">
              {["Next.js 14", "React 18", "TypeScript", "Tailwind", "Dexie / IndexedDB", "Zustand",
                "PapaParse", "Web Workers", "React Three Fiber", "Three.js", "Recharts", "Framer Motion"].map((t) => (
                <span key={t} className="chip text-[11px]">{t}</span>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <div className="font-semibold text-fg mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-accent" /> Fontes de dados
            </div>
            <div className="flex flex-wrap gap-2">
              {["dbSNP", "ClinVar", "gnomAD", "Ensembl VEP", "GWAS Catalog", "MyVariant.info",
                "SNPedia", "PharmGKB/CPIC", "PGS Catalog", "ABraOM (Brasil)"].map((t) => (
                <span key={t} className="chip text-[11px]">{t}</span>
              ))}
            </div>
            <div className="text-[11px] text-fg-muted mt-3">
              Integrações de anotação ao vivo são parte do roadmap (fases 3–4).
            </div>
          </div>
        </section>

        {/* ───────────────────────── Final CTA ───────────────────────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-20 text-center card card-elevated p-10 md:p-14 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.06] via-transparent to-violet-500/[0.04] pointer-events-none" />
          <div className="relative">
            <Dna className="h-10 w-10 text-accent mx-auto mb-4 helix-glow" />
            <h2 className="text-2xl md:text-4xl font-extrabold mb-3">
              Pronto para conhecer seu <span className="grad-text">código genético</span>?
            </h2>
            <p className="text-fg-dim max-w-xl mx-auto mb-7">
              Sem cadastro, sem custo, sem nuvem. Suba seu arquivo ou teste com a fixture de
              demonstração agora mesmo.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="btn-primary">
                <ArrowDown className="h-4 w-4 rotate-180" /> Voltar ao upload
              </a>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn-outline">
                <Github className="h-4 w-4" /> Ver no GitHub
              </a>
            </div>
          </div>
        </motion.section>
      </main>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="relative z-10 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-fg-muted">
          <div className="flex items-center gap-2">
            <Dna className="h-4 w-4 text-accent" />
            <span>DNA Explorer · open source · MIT</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono">Build GRCh37/hg19 · v0.1.0</span>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-fg transition-colors flex items-center gap-1">
              <Github className="h-3.5 w-3.5" /> código
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-accent mb-3">
        <span className="h-px w-6 bg-accent/50" /> {eyebrow}
      </div>
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
    </motion.div>
  );
}
