"use client";
import Link from "next/link";
import { Dna, Shield, Cpu, Microscope, Github, ChevronRight, Upload as UploadIcon } from "lucide-react";
import Upload from "./Upload";
import HelixBackdrop from "./HelixBackdrop";

export default function Hero() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <HelixBackdrop />
      </div>

      <header className="relative z-10 px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <Dna className="h-7 w-7 text-accent helix-glow" />
          <span className="font-bold text-lg tracking-tight">DNA Explorer</span>
          <span className="chip ml-2 text-[10px] opacity-70">v0.1 · MVP</span>
        </div>
        <nav className="flex items-center gap-4 text-sm text-fg-dim">
          <a href="#features" className="hover:text-fg transition-colors">Recursos</a>
          <a href="#privacy" className="hover:text-fg transition-colors">Privacidade</a>
          <a href="#stack" className="hover:text-fg transition-colors">Stack</a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-fg transition-colors flex items-center gap-1">
            <Github className="h-4 w-4" /> código
          </a>
        </nav>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 chip mb-6 border-accent/30 bg-accent/5">
            <Shield className="h-3.5 w-3.5 text-accent" />
            <span>100% client-side · dados nunca saem do navegador</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mb-6">
            Explore seu <span className="grad-text">código genético</span> como nunca antes.
          </h1>

          <p className="text-fg-dim text-lg md:text-xl max-w-2xl mb-8 leading-relaxed">
            Suba o arquivo bruto do seu teste de DNA (Genera, 23andMe, AncestryDNA, MyHeritage…) e navegue seu
            genoma em 3D, cruze variantes com ClinVar e gnomAD, explore farmacogenômica e traços — tudo rodando
            no seu próprio navegador.
          </p>

          <Upload />

          <div className="mt-4 text-xs text-fg-muted max-w-2xl">
            Plataforma educacional e de exploração científica. Não substitui aconselhamento médico ou genético profissional.
            Os arquivos do seu teste ficam no seu navegador (IndexedDB) — apague a qualquer momento.
          </div>
        </div>

        <section id="features" className="mt-24">
          <h2 className="text-2xl font-bold mb-6">O que você consegue fazer</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Microscope className="h-5 w-5" />}
              title="Navegação multi-escala"
              body="Do genoma inteiro até um SNP individual. Cariótipo, cromossomo, gene, variante — tudo linkado."
            />
            <FeatureCard
              icon={<Dna className="h-5 w-5" />}
              title="Hélice 3D realista"
              body="Dupla hélice B-form com coloração Watson-Crick. Gire, aproxime, explore a fita."
            />
            <FeatureCard
              icon={<Cpu className="h-5 w-5" />}
              title="Catálogo canônico"
              body="Dezenas de SNPs famosos pré-anotados — cor dos olhos, lactase, Fator V Leiden, CYP2C19, ACTN3 e muito mais."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Privacidade radical"
              body="Seu DNA nunca sai do seu navegador. Sem conta, sem servidor, sem log. LGPD por construção."
            />
            <FeatureCard
              icon={<UploadIcon className="h-5 w-5" />}
              title="Multi-provider"
              body="Aceita os dois exports da Genera (CSV e TXT). Estendível para 23andMe, Ancestry, MyHeritage, VCF."
            />
            <FeatureCard
              icon={<ChevronRight className="h-5 w-5" />}
              title="Busca livre"
              body="Por rsID, gene, traço ou cromossomo. Drill-down até o genótipo."
            />
          </div>
        </section>

        <section id="privacy" className="mt-20 card p-8">
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent" /> Privacidade por construção
          </h2>
          <ul className="space-y-2 text-fg-dim">
            <li>· Seu arquivo é lido e processado 100% no seu navegador — nenhum byte trafega pela rede.</li>
            <li>· Armazenado em IndexedDB local. O botão &quot;Apagar tudo&quot; elimina instantaneamente.</li>
            <li>· Anotações de variantes são buscadas em APIs públicas usando apenas o rsID (informação pública).</li>
            <li>· Arquitetura atende LGPD Art. 11 (dado sensível) por nunca hospedar dados pessoais.</li>
          </ul>
        </section>

        <section id="stack" className="mt-16 grid md:grid-cols-2 gap-4 text-sm text-fg-dim">
          <div className="card p-6">
            <div className="font-semibold text-fg mb-2">Stack</div>
            Next.js 14 · React 18 · TypeScript · Tailwind · Dexie (IndexedDB) · Zustand · PapaParse (Web Worker) · React Three Fiber + drei · Recharts · Lucide
          </div>
          <div className="card p-6">
            <div className="font-semibold text-fg mb-2">Fontes de dados</div>
            dbSNP · ClinVar · gnomAD · Ensembl VEP · GWAS Catalog · MyVariant.info · SNPedia · PharmGKB/CPIC · PGS Catalog · ABraOM (Brasil)
          </div>
        </section>
      </main>

      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 border-t border-border text-xs text-fg-muted flex justify-between">
        <div>DNA Explorer · open source · MIT</div>
        <div>Build GRCh37/hg19 · v0.1.0</div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card p-5 hover:border-border-strong transition-colors">
      <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-fg-dim">{body}</div>
    </div>
  );
}
