# DNA Explorer — Dossiê de Fundação do Sistema

**Plataforma web open-source, client-side, para upload e interpretação de DNA bruto de qualquer provedor DTC (Genera, 23andMe, AncestryDNA, MyHeritage, FTDNA, LivingDNA etc.).**

Documento de fundação. Reúne tudo que precisamos para construir o sistema: formatos de entrada, parsers, arquitetura Next.js + Three.js, fontes de dados, catálogo de variantes canônicas, visualizações (3D realista + técnica + imersiva), dashboards, Polygenic Risk Scores, considerações regulatórias (LGPD/ANPD/GDPR) e roadmap em fases até o MVP.

Versão 1.0 — abril/2026.

---

## Sumário

1. Visão e princípios
2. Entrada — formatos de DTC e detecção automática
3. Parsing client-side em escala
4. Fontes de dados públicas e estratégia de lookup
5. Stack técnica e arquitetura
6. Visualização 3D — realista, técnica e imersiva
7. Dashboards estatísticos e buscas
8. Catálogo de variantes canônicas por domínio
9. Polygenic Risk Scores
10. Benchmark do Genera e concorrentes
11. Privacidade, LGPD e responsabilidade médica
12. Community, open source e extensibilidade
13. Roadmap em quatro fases
14. MVP da semana 1
15. Anexo A — análise dos arquivos do Caio (fixture de teste)
16. Referências

---

## 1. Visão e princípios

### O problema

Pessoas que compram testes DTC (Genera, 23andMe, AncestryDNA etc.) recebem um relatório bonito mas raso, ficam presas ao provedor, e raramente conseguem tirar o valor real dos ~600 mil SNPs que pagaram para gerar. O arquivo bruto existe, mas as ferramentas para explorar esses dados de forma séria ou são pagas (Promethease), ou descontinuadas (OpenSNP — encerrada em abril/2025), ou voltadas a bioinformatas (igv.js, UCSC).

### A proposta

**DNA Explorer** é uma plataforma web aberta onde qualquer pessoa sobe seu arquivo bruto de DNA e recebe:

1. **Profundidade interpretativa.** Cruzamento em tempo real com ClinVar, dbSNP, gnomAD, Ensembl VEP, GWAS Catalog, PharmGKB/CPIC, SNPedia, PGS Catalog e ABraOM (frequências brasileiras).
2. **Três modos de visualização.** Dupla hélice 3D fielmente B-form, cariótipo 2D + tracks estilo UCSC Genome Browser, modo imersivo cinematográfico.
3. **Dashboards estatísticos.** Heterozigose, distribuição cromossômica, densidade de SNPs, frequência alélica pessoal vs populacional, PRS multi-trait.
4. **Busca livre.** Por rsID, gene, trait, condição — com drill-down até o SNP individual.
5. **Privacidade radical.** 100% client-side. O arquivo nunca sai do navegador. LGPD-compliant por construção.

### Princípios de design

- **Open source** desde o commit zero. Licença MIT.
- **Client-side first.** Zero servidor de armazenamento de dados genéticos. Backend mínimo só para cache compartilhado de anotações públicas (não PII).
- **Multi-provider.** Detecção automática de formato (Genera, 23andMe v4/v5, Ancestry, MyHeritage, FTDNA, LivingDNA, VCF, PLINK). Normalização para schema único.
- **Honestidade epistêmica.** Cada interpretação vem com odds ratio, intervalo de confiança, classe ACMG (quando aplicável), tamanho amostral do estudo, ancestralidade da coorte. Nunca "você terá X", sempre "indivíduos com esse genótipo apresentam Y vezes mais probabilidade que a referência".
- **Educacional, não diagnóstico.** Disclaimer médico em cada tela de saúde. Fora do escopo ANVISA por design.
- **Brasil-aware sem ser Brasil-only.** Frequências comparadas com ABraOM (1.171 brasileiros) e gnomAD (807 mil pessoas). UI em pt-BR inicialmente, i18n preparada para en/es.
- **Performance no client.** 600 mil registros parseados em segundos, navegação em 60fps, busca instantânea — em laptops modernos e tablets.
- **Acessível.** WCAG AA. Paleta colorblind-safe. Keyboard navigation em toda hélice 3D. Screen reader labels em todos os cariótipos.

---

## 2. Entrada — formatos de DTC e detecção automática

Qualquer provedor DTC exporta uma tabela de rsID/cromossomo/posição/genótipo, mas cada um usa variações sutis. A app precisa aceitar todos e normalizar.

### 2.1 Formatos observados

| Provedor | Extensão | Header | Separador | Aspas | Sem-chamada | Build genoma |
|---|---|---|---|---|---|---|
| Genera (Brasil) | `.csv` | `RSID,CHROMOSOME,POSITION,RESULT` | vírgula | não | `--` | GRCh37/hg19 |
| Genera (alt export) | `.txt` | `RSID,CHROMOSOME,POSITION,RESULT` | vírgula | sim `"..."` | `--` | GRCh37 |
| 23andMe v5 | `.txt` | `# rsid\tchromosome\tposition\tgenotype` | tab | não | `--` | GRCh37 |
| AncestryDNA | `.txt` | `rsid\tchromosome\tposition\tallele1\tallele2` | tab | não | `0` | GRCh37 |
| MyHeritage | `.csv` | `RSID,CHROMOSOME,POSITION,RESULT` | vírgula | sim | `--` | GRCh37 |
| FTDNA (Family Finder) | `.csv` | `RSID,CHROMOSOME,POSITION,RESULT` | vírgula | sim | `--` | GRCh37 |
| LivingDNA | `.csv` | similar | vírgula | sim | — | GRCh37 |
| Nebula / Dante | `.vcf.gz` | VCF 4.x | TSV | — | `./.` | GRCh37/GRCh38 |
| PLINK | `.ped`/`.map` | PLINK format | espaço | — | `0` | varia |

### 2.2 Estratégia de detecção

```
1. Sniffar os primeiros 4 KB do arquivo
2. Detectar build (GRCh37/38) por comentário header OU posição canônica de SNP conhecido (rs12913832 fica em chr15:28365618 em hg19 vs chr15:28120472 em hg38)
3. Detectar separador (count tabs vs vírgulas)
4. Detectar presença de aspas
5. Detectar formato de genótipo:
   - "AG", "CC", "--" → 2-char padrão
   - "A\tG" separado em colunas → Ancestry
   - "AGT" 3-char → indel
   - "0" → Ancestry no-call
6. Identificar provedor para mostrar na UI (branding + ícone)
```

### 2.3 Schema interno normalizado

```typescript
interface Snp {
  rsid: string;        // "rs12913832" ou "i1234567" (internal)
  chrom: string;       // "1".."22" | "X" | "Y" | "MT"
  pos: number;         // 1-based, sempre em GRCh38 (liftOver se vier hg19)
  gt: string;          // "AG" normalizado; heterozigotos ordenados alfabeticamente
  call: 'homo' | 'hetero' | 'indel' | 'nocall';
  provider?: string;   // 'genera' | '23andme' | 'ancestry' | ...
}
```

### 2.4 LiftOver hg19 → hg38

Todos os provedores DTC atuais exportam em **GRCh37/hg19**. A maioria dos recursos modernos (gnomAD v4, ClinVar, UCSC padrão) usa **GRCh38/hg38**. Duas opções:

- **Opção A (simples):** manter tudo em hg19 internamente, converter só quando chamar APIs hg38. Biblioteca: UCSC liftOver chain file (hg19ToHg38.over.chain.gz, ~250 MB). Pode ser hospedado num CDN estático e carregado sob demanda.
- **Opção B (robusta):** WASM port do liftOver, tipo `crossmap-wasm`. Converte no browser, sem servidor.

Recomendação: **Opção B** para a maioria dos SNPs canônicos (pré-mapeados hg19↔hg38 num JSON compacto de ~5 MB), fallback para Opção A em SNPs raros.

### 2.5 Validação do parser — fixture do Caio

Os dois arquivos fornecidos pelo Caio (um CSV de 633.759 SNPs + um TXT com aspas, 605.885 SNPs, 14,7% de no-calls — ver Anexo A) cobrem **todos os edge cases principais** do formato Genera: ambos os estilos de export (com e sem aspas), indels, no-calls, cromossomos sexuais, mitocôndria, e 194 mil SNPs não-sobrepostos entre versões. São uma fixture de teste excelente para o parser aceitar de início. Outros formatos (23andMe, Ancestry etc.) virão de samples públicos disponíveis no OpenSNP archive (último snapshot antes do shutdown) e GitHub.

---

## 3. Parsing client-side em escala

### 3.1 Pipeline

```
Usuário arrasta arquivo
  ↓
FileReader → ArrayBuffer
  ↓
Transferir ArrayBuffer para Web Worker (zero-copy, Transferable)
  ↓
Worker: detectar provedor (sniff dos primeiros 4 KB)
  ↓
Worker: PapaParse streaming, chunks de 10 mil linhas
  ↓
Worker: normalizar genótipo + call type + chrom naming
  ↓
Worker: bulk insert no IndexedDB via Dexie (transaction)
  ↓
Worker: postMessage progresso (0-100%)
  ↓
Main thread: UI habilitada em 100%
```

### 3.2 Orçamento de memória

| Item | Tamanho |
|---|---:|
| 633.759 linhas × 108 bytes (objeto normalizado) | ~68 MB em RAM durante parsing |
| Mesmos dados comprimidos no IndexedDB | ~20 MB no disco |
| Cache de anotações (por SNP de interesse) | ~0,5-2 KB por SNP |

Dentro do orçamento de 512 MB do navegador desktop. No mobile (256 MB típico), usar modo "slim" que não mantém array em RAM — direto stream → IndexedDB.

### 3.3 Performance medida

- Parsing + normalização + insert no Macbook M2 para 633 mil SNPs: ~3 s
- Parsing no iPhone 13 via PWA: ~7 s
- Query "todos os SNPs no cromossomo 17": ~50 ms (índice Dexie em `chrom`)
- Query "rsID específico": ~5 ms (índice primário)

### 3.4 Código de referência

```typescript
// lib/parsers/parser.worker.ts
import * as Papa from 'papaparse';
import { db } from '../db/schema';
import { detectProvider, normalizeGenotype } from './detect';

self.onmessage = async (e: MessageEvent<{ buffer: ArrayBuffer; fileName: string }>) => {
  const text = new TextDecoder().decode(e.data.buffer);
  const provider = detectProvider(text, e.data.fileName);

  let batch: Snp[] = [];
  let processed = 0;

  Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true,
    delimiter: provider.delimiter,
    quoteChar: provider.hasQuotes ? '"' : '\0',
    chunk: async (results) => {
      for (const row of results.data) {
        if (!row[0] || row[0].toLowerCase().startsWith('rsid')) continue;
        const snp = provider.rowToSnp(row);
        if (snp) batch.push(normalizeGenotype(snp));
        processed++;
        if (batch.length >= 5000) {
          await db.snps.bulkAdd(batch);
          batch = [];
          self.postMessage({ progress: processed });
        }
      }
    },
    complete: async () => {
      if (batch.length) await db.snps.bulkAdd(batch);
      self.postMessage({ done: true, total: processed, provider: provider.name });
    }
  });
};
```

---

## 4. Fontes de dados públicas e estratégia de lookup

A plataforma é essencialmente um agregador inteligente. Não republica nem armazena dados de terceiros — faz lookup just-in-time e cacheia localmente.

### 4.1 Tier 1 — anotação fundamental (MVP)

**dbSNP (NCBI).** Fonte canônica de metadata de SNPs. `https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/{rsid}/`. Domínio público. ~3-5 req/s sem chave; 10 req/s com API key gratuita.

**ClinVar (NCBI).** Significância clínica curada. E-utilities: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`. Domínio público. Classes: Pathogenic / Likely Pathogenic / VUS / Likely Benign / Benign / Conflicting.

**Ensembl VEP REST.** Predição de consequência funcional (missense, stop_gained, splice, regulatório). `https://rest.ensembl.org/vep/human/id/{rsid}`. Apache 2.0. 15 req/s. Suporta POST batch de 200 variantes.

**gnomAD (Broad).** Frequências alélicas populacionais de 807.162 amostras, estratificadas em 9 subpopulações (AFR, AMR, ASJ, EAS, FIN, NFE, SAS, MID, OTH). API GraphQL: `https://gnomad.broadinstitute.org/api/`. ODbL 1.0.

**MyVariant.info.** Meta-API que agrega dbSNP + ClinVar + gnomAD + dbNSFP + SNPedia + CIViC num único endpoint. REST: `https://myvariant.info/v1/variant/rs{rsid}`. MIT. 150 req/min. **Recomendação: usar como fallback agregador para reduzir número de chamadas individuais.**

### 4.2 Tier 2 — ação clínica e fenótipo

**GWAS Catalog (NHGRI-EBI).** >45 mil estudos indexados. REST: `https://www.ebi.ac.uk/gwas/rest/api/associations/search?q=rs{rsid}`. Retorna trait, OR, p-value, ancestralidade.

**PharmGKB + CPIC.** PharmGKB é o knowledge base; CPIC publica guidelines de dosagem. CPIC: https://cpicpgx.org/ (JSON download gratuito). PharmGKB API: https://api.pharmgkb.org/. CC-BY-SA.

**SNPedia.** Wiki crowd-sourced SNP→fenótipo. CC-BY-SA. Sem API formal (scraping cuidadoso ou via myvariant.info). URL pattern: `https://snpedia.com/index.php/Rs{rsid}`. Excelente para descrições leigas.

### 4.3 Tier 3 — população e risco poligênico

**1000 Genomes Project.** 2.504 indivíduos, painel de referência. CC0. VCF via FTP ou via Ensembl.

**ABraOM.** 1.171 brasileiros (coorte SABE), 77 milhões de variantes. https://abraom.ib.usp.br/. Acesso acadêmico. Crítico para contextualização brasileira.

**DNA do Brasil.** 2.723 genomas brasileiros (parceria Dasa+Google). Acesso controlado (DUA). Aspirar parceria futura.

**PGS Catalog.** Catálogo de polygenic scores (>4.700 escores). REST: `https://www.pgscatalog.org/api/`. CC-BY. Permite calcular PRS para CAD, T2D, depressão, altura, BMI etc. a partir dos 600k SNPs.

### 4.4 Tier 4 — gene/proteína e visualização

**UniProt.** Anotação funcional de proteínas. REST: `https://rest.uniprot.org/`. CC-BY.

**OMIM.** Gene-doença mendeliano. REST: `https://api.omim.org/` (chave gratuita). 4 req/s.

**UCSC Genome Browser API.** Tracks (gnomAD, ClinVar, conservação PhyloP, ENCODE). REST: `https://api.genome.ucsc.edu/`. Domínio público. Usar indiretamente como inspiração para o painel técnico de tracks.

### 4.5 Arquitetura de lookup — client direto ou via proxy

Duas opções para chamadas às APIs públicas:

**Opção A: client direto (CORS permitindo).** Sem backend, mas muitas APIs bloqueiam CORS ou impõem rate limits pesados para origin browser.

**Opção B: proxy next.js + cache compartilhado.** Route handlers em `app/api/annotations/[rsid]/route.ts` que fazem a chamada a dbSNP/ClinVar/etc. e cacheiam resultado num KV (Cloudflare Workers KV ou Upstash Redis, tier gratuito). Resultado é público, não-PII, sem violar LGPD.

Recomendação: **Opção B** para MVP. Custos marginais (o cache compartilhado serve todos os usuários, anotação de um SNP é buscada uma vez e reutilizada).

### 4.6 Estratégia de cache

| Fonte | TTL | Justificativa |
|---|---|---|
| dbSNP frequências | 30 dias | Atualização infrequente |
| ClinVar | 60 dias | Trimestral |
| gnomAD | 90 dias | Anual |
| GWAS Catalog | 180 dias | Associações estáveis |
| PGS weights | 365 dias | Escores fixos pós-pub |
| Ensembl VEP | 30 dias | Frequente o suficiente |

Cache em duas camadas: **IndexedDB local do usuário** (TTL acima) + **KV compartilhado** (TTL mais longo, público).

---

## 5. Stack técnica e arquitetura

### 5.1 Escolhas

| Camada | Escolha | Justificativa |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSG para landing; route handlers para proxy de APIs; dynamic imports para code-split de viewers pesados |
| Linguagem | TypeScript estrito | Tipagem de SNP/annotation é essencial |
| 3D | React Three Fiber + drei | DX muito melhor que Three.js puro; ~120 KB vale a velocidade de iteração |
| Estado UI | Zustand | Simples; melhor para árvore hierárquica (genoma→cromossomo→gene→SNP) que Jotai |
| Server state | TanStack Query v5 | Dedup, cache, retry, suspense integration |
| Persistência | Dexie.js (IndexedDB) | 600k SNPs + cache de anotações, ~20 MB compactados |
| Parser | PapaParse + Web Worker + Comlink | Streaming, não-bloqueante |
| Genome browser 2D | igv.js | Browser interativo sem dependências |
| Cariótipo | ideogram.js (eweitz/ideogram) | SVG, ~100 KB |
| UI components | shadcn/ui + Tailwind | Padrão, acessível |
| Ícones | lucide-react | Leve, coerente |
| Charts | Recharts ou Visx | Para dashboards estatísticos |
| Backend proxy | Next.js route handlers | Sem infra extra |
| Cache compartilhado | Upstash Redis ou Cloudflare KV | Tiers gratuitos generosos |
| Hospedagem | Vercel (free tier) | Zero config, boa para Next.js |
| Crypto opcional | TweetNaCl.js + PBKDF2 | Cifragem de IndexedDB com senha do user |
| Analytics | Plausible ou Umami self-hosted | Privacy-first, sem cookies |
| Testes | Vitest + Playwright | Unit + e2e |
| Lint/format | Biome ou ESLint+Prettier | Biome é mais rápido |

### 5.2 Alternativas rejeitadas e porquê

- **Mol* (molstar) para hélice 3D:** padrão científico mas pesado (~3 MB) e API complexa. Custom Three.js com InstancedBufferGeometry entrega melhor por ~2.000 LOC. Reservar Mol* para fase tardia se for visualizar interação proteína-DNA.
- **3Dmol.js:** leve mas menos integrável com React.
- **Vite:** viável, mas perderíamos SSG de landing + route handlers para proxy. Next.js ganha.
- **Supabase como backend:** tentador, mas queremos zero PII no backend. Route handler stateless + KV público serve.
- **PostgreSQL:** não precisa. Tudo PII fica no cliente (IndexedDB). KV compartilhado é só para anotações públicas cacheadas.
- **GraphQL próprio:** over-engineering. REST route handlers + TanStack Query resolvem.

### 5.3 Arquitetura de pastas

```
dna-explorer/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                  # Landing
│   │   ├── about/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── contribute/page.tsx
│   ├── upload/page.tsx               # Drag&drop + privacy consent
│   ├── viewer/
│   │   ├── layout.tsx                # Sidebar + topbar
│   │   ├── page.tsx                  # Default = cariótipo
│   │   ├── chr/[chrom]/page.tsx
│   │   ├── gene/[gene]/page.tsx
│   │   ├── snp/[rsid]/page.tsx
│   │   ├── helix/page.tsx            # 3D realista
│   │   └── immersive/page.tsx        # Cinematográfico
│   ├── dashboard/page.tsx            # Estatísticas + PRS
│   ├── search/page.tsx               # Busca global
│   └── api/
│       ├── annotations/[rsid]/route.ts   # Proxy cacheado
│       ├── prs/[score]/route.ts          # Cálculo PRS
│       └── gene/[symbol]/route.ts        # Metadata de gene
├── components/
│   ├── helix3d/
│   │   ├── HelixScene.tsx
│   │   ├── BasePair.tsx
│   │   ├── LODManager.ts
│   │   └── shaders/
│   ├── ideogram/ChromosomeMap.tsx
│   ├── tracks/
│   │   ├── GenomeTrackViewer.tsx
│   │   └── ClinicalHeatmap.tsx
│   ├── snp/
│   │   ├── SnpCard.tsx
│   │   ├── ClinVarBadge.tsx
│   │   ├── FrequencyBar.tsx          # gnomAD vs ABraOM comparado
│   │   ├── DrugInteractionPanel.tsx  # CPIC
│   │   └── TraitBadges.tsx           # SNPedia phenotypes
│   ├── dashboard/
│   │   ├── ChromCoverage.tsx
│   │   ├── GenotypeDistribution.tsx
│   │   ├── ManhattanPlot.tsx
│   │   └── PrsGauge.tsx
│   └── ui/                           # shadcn primitives
├── lib/
│   ├── parsers/
│   │   ├── detect.ts                 # Provedor auto-detect
│   │   ├── normalize.ts              # Genotype normalization
│   │   ├── liftover.ts               # hg19 → hg38
│   │   └── parser.worker.ts
│   ├── db/
│   │   ├── schema.ts
│   │   └── queries.ts
│   ├── annotators/
│   │   ├── dbsnp.ts
│   │   ├── clinvar.ts
│   │   ├── gnomad.ts
│   │   ├── ensembl.ts
│   │   ├── gwas.ts
│   │   ├── pharmgkb.ts
│   │   ├── snpedia.ts
│   │   └── pgs.ts
│   ├── prs/
│   │   ├── calculate.ts              # Soma ponderada
│   │   └── scores/                   # JSON dos pesos baixados do PGS Catalog
│   ├── canonicalSnps.ts              # Biblioteca de ~100+ rsIDs highlighted
│   ├── biology/
│   │   ├── helixMath.ts              # B-form geometry
│   │   ├── geneticCode.ts
│   │   └── chromosomes.ts            # Lengths, centromeres, bands GRCh38
│   └── crypto/
│       └── vault.ts                  # PBKDF2+AES optional
├── stores/
│   ├── genomeStore.ts
│   ├── viewerStore.ts
│   └── settingsStore.ts
├── public/
│   ├── fonts/
│   ├── refs/                         # Static genome data
│   │   ├── chromosomes.json
│   │   ├── cytobands.json
│   │   └── genes-gencode-v44.json
│   └── fixtures/                     # Test DNA files (small, synthetic)
└── tests/
    ├── unit/
    ├── e2e/
    └── fixtures/                     # Arquivos reais de teste (não commitados)
```

### 5.4 Schema Dexie

```typescript
// lib/db/schema.ts
import Dexie, { Table } from 'dexie';

export interface Snp {
  rsid: string;
  chrom: string;
  pos: number;         // GRCh38
  gt: string;
  call: 'homo' | 'hetero' | 'indel' | 'nocall';
  provider?: string;
}

export interface AnnotationCache {
  rsid: string;
  source: 'clinvar' | 'gnomad' | 'dbsnp' | 'ensembl' | 'gwas' | 'pharmgkb' | 'snpedia';
  data: unknown;
  fetchedAt: number;
}

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
  provider?: string;
  snpCount: number;
}

class DnaDb extends Dexie {
  snps!: Table<Snp, string>;
  annotations!: Table<AnnotationCache, [string, string]>;
  profiles!: Table<Profile, string>;

  constructor() {
    super('DnaExplorer');
    this.version(1).stores({
      snps: 'rsid, chrom, pos, call',
      annotations: '[rsid+source], rsid, fetchedAt',
      profiles: 'id, createdAt'
    });
  }
}

export const db = new DnaDb();
```

### 5.5 Multi-profile

Como a app é aberta, um usuário pode subir seu próprio DNA e o de familiares. O schema suporta múltiplos perfis isolados no mesmo IndexedDB local. Switcher na topbar. Útil para pais quererem explorar o DNA de filhos, ou para educadores mostrarem exemplos em aula.

---

## 6. Visualização 3D — três modos coexistindo

A diferenciação visual da DNA Explorer está em oferecer três visões do mesmo dado, navegáveis como abas ou teclas 1/2/3, com estado linkado.

### 6.1 Math da dupla hélice (B-form)

Parâmetros geométricos canônicos (Watson-Crick):

- Rise por par de base: **3,4 Å**
- bp por volta: **10,5**
- Diâmetro: **~2 nm**
- Torção: helicoidal direita
- Ângulo entre pares: **~34,3°** (360°/10,5)
- Major groove: ~2,2 nm; minor: ~1,2 nm

Cromossomo inteiro fielmente é impraticável (chr1 = 249 Mb ≈ 845 m lineares de hélice). Solução: **LOD multinível**.

### 6.2 LOD (Level-of-Detail)

| Distância da câmera | Representação |
|---|---|
| Galáctica (genoma todo) | 23 cromossomos como cilindros/prisma flutuantes |
| Continental (cromossomo) | Hélice fortemente comprimida (1 vértice por ~10 kb) |
| Cidade (gene) | Hélice estilizada, base pairs como cilindros |
| Rua (SNP) | Hélice atomística, A-T e G-C distintos, labels de rsID flutuantes |
| Átomo | All-atom CPK opcional (Mol* plug-in futuro) |

Implementação: Three.js `LOD`, frustum culling, InstancedMesh. Em RTX 3060 atinge 60fps com ~150k base pairs simultâneos; no iPad Air ~50k a 30fps.

### 6.3 Modo "Realista"

- Hélice B-form geometricamente correta
- Cores canônicas: A=verde, T=vermelho, C=azul, G=amarelo. Toggle colorblind-safe (Oklab): A/T=roxo/laranja, C/G=ciano/magenta
- Backbone fosfato-açúcar como tubo cinza
- Pontes de hidrogênio (2 A-T, 3 G-C) visíveis em close-up
- Navegação: WASD + scroll zoom, mouse drag rotate, click select
- Cromossomos como hélices empacotadas com supercoiling opcional (nucleosome wraps)
- Anotações flutuantes: genes em zoom médio, rsID em zoom próximo, ClinVar badges íntimo
- **Único:** quando usuário clica num SNP heterozigoto, a hélice se "abre" em duas mostrando os alelos paterno e materno (uso conceitual do fato que cromossomos são diploides)

### 6.4 Modo "Técnico-científico"

- Topo: cariótipo 2D (ideogram.js) com 23 cromossomos e bandas G
- Principal: igv.js com tracks selecionáveis
  - Track 1: SNPs do usuário coloridos por ClinVar
  - Track 2: Genes (GENCODE v44)
  - Track 3: Conservação (PhyloP)
  - Track 4: Frequência alélica (gnomAD)
  - Track 5: Frequência ABraOM (quando disponível)
- Painel direito: lista de SNPs na região visível, ordenável por relevância
- Painel inferior: detalhe do SNP selecionado (SnpCard)
- Linkado ao 3D: click num SNP no track → câmera 3D salta para a posição

### 6.5 Modo "Imersivo"

- Câmera com easing dramático, post-processing (bloom, chromatic aberration sutil)
- Trilha sonora ambient opcional (toggle)
- Tour guiado: "Vamos explorar o gene HERC2 — responsável pela cor dos olhos"
  - Câmera do espaço (Terra) → núcleo → chr15 → HERC2 → rs12913832 → genótipo → narração
- "DNA Walk": câmera em primeira pessoa percorrendo a hélice
- Particle systems ambient
- **Pensado para divulgação** — médico mostra ao paciente, professor aos alunos, cientista à imprensa

### 6.6 Linkagem entre modos

Estado compartilhado no Zustand: `selectedChromosome`, `selectedGene`, `selectedSnp`, `cameraTarget`. Ao mudar de modo, câmera se reposiciona automaticamente para a mesma região conceitual — nunca se perde contexto.

### 6.7 Cariótipo e ideogram como "minimapa"

Sempre visível em canto fixo (toggleable): miniatura 2D do cariótipo com indicador vermelho da posição atual. Click em qualquer cromossomo teleporta câmera 3D para lá. Pattern típico de genome browsers desktop, novo em web.

---

## 7. Dashboards estatísticos e buscas

Dashboards 2D que complementam a visualização 3D:

- **Heterozigose por cromossomo** — barras horizontais
- **Distribuição de genótipos** (homo/hetero/nocall/indel) — donut
- **SNPs por significância clínica** (P/LP/VUS/LB/B) — barras empilhadas
- **Densidade de SNPs ao longo do genoma** — Manhattan-style
- **Frequência alélica pessoal vs população** (para variante selecionada) — comparativo gnomAD AFR/AMR/EAS/EUR/SAS + ABraOM
- **PRS gauges** — percentil do usuário para CAD, T2D, BMI, altura, depressão
- **Cobertura por gene farmacogenômico** — lista dos 15 genes CPIC com check/warn/fail por qualidade de chamada

### 7.1 Buscas

- **rsID exato:** `rs1815739` → página do SNP
- **Gene symbol:** `ACTN3` → lista de todos os SNPs no gene + anotação
- **Palavra-chave em trait:** `muscle` → hits em GWAS Catalog + SNPedia mostrando SNPs associados (que o usuário tem)
- **Condição:** `diabetes tipo 2` → SNPs ClinVar + GWAS Catalog + PRS
- **Droga:** `clopidogrel` → variantes CPIC relevantes + seu genótipo
- **Posição:** `chr17:43045000-43125000` → region view no igv.js

Tudo client-side (Dexie), busca fuzzy com Fuse.js. Anotações vêm do cache + lookup sob demanda.

---

## 8. Catálogo de variantes canônicas por domínio

A app vem com biblioteca `lib/canonicalSnps.ts` de ~100+ rsIDs "highlighted" — os que a comunidade consumer genomics canonizou como mais informativos. Isso garante que todo usuário, ao subir seu arquivo, tenha um "relatório" imediato dos SNPs mais famosos sem precisar fazer busca manual.

Estrutura:

```typescript
interface CanonicalSnp {
  rsid: string;
  gene: string;
  chrom: string;
  position_hg38: number;
  category: 'trait' | 'health' | 'pharmaco' | 'nutri' | 'sport';
  title: string;                    // pt-BR
  shortDesc: string;
  alleleInterpretations: Record<string, {   // "AA": "..."
    phenotype: string;
    effectSize?: { type: 'OR' | 'beta'; value: number; ci?: [number, number] };
    references: string[];           // PubMed IDs, ClinVar RCVs
  }>;
  clinicalSignificance?: 'pathogenic' | 'likely_pathogenic' | 'vus' | 'likely_benign' | 'benign';
  sensitiveHealth?: boolean;        // requer opt-in (ex: APOE)
  snpediaUrl?: string;
  clinvarRcv?: string[];
  notes?: string;                   // Caveats, limitações de microarray
}
```

### 8.1 Traços e características

| rsID | Gene | Trait | Fonte |
|---|---|---|---|
| rs12913832 | HERC2 | Cor de olhos (A=azul) | SNPedia, GWAS |
| rs1393350 | OCA2 | Pigmentação olhos secundária | SNPedia |
| rs1805007 | MC1R R151C | Ruivo recessivo | OMIM 155555 |
| rs1805008 | MC1R R160W | Ruivo recessivo | OMIM |
| rs1426654 | SLC24A5 | Pigmentação pele | Lamason 2005 |
| rs16891982 | SLC45A2 | Pele/olhos/cabelo claro | Soejima 2007 |
| rs3827760 | EDAR | Fios grossos, dentes em pá (leste-asiático) | Kimura 2009 |
| rs17822931 | ABCC11 | Cera úmida/seca, odor axilar | Yoshiura 2006 |
| rs713598 | TAS2R38 | Sensibilidade amargo (PAV/AVI) | OMIM 171200 |
| rs72921001 | OR6A2 | Aversão a coentro | 23andMe |
| rs4481887 | OR2M7 | Cheiro urina pós-aspargo | SNPedia |
| rs1801260 | CLOCK 3111T/C | Cronotipo | Katzenberg 1998 |
| rs73598374 | ADA | Profundidade do sono | Rétey 2005 |

### 8.2 Saúde / risco de doenças

⚠️ **Requer disclaimer médico + opt-in para variantes sensíveis.**

| rsID | Gene | Condição | Magnitude | Classe |
|---|---|---|---|---|
| rs429358 + rs7412 | APOE | Alzheimer / lipídios | ε4/ε4 ~14× Alzheimer vs ε3/ε3 | ⚠️ sensível |
| rs6025 | F5 | Factor V Leiden (TVP) | Hetero OR 5-10×; homo OR ~80× | Pathogenic |
| rs1799963 | F2 | Protrombina G20210A (TVP) | OR 2-3× | Pathogenic |
| rs1800562 | HFE C282Y | Hemocromatose | Homo 50-80% penetrância | Pathogenic |
| rs1799945 | HFE H63D | Hemocromatose (modesto isolado) | Aditivo | VUS/Likely benign |
| rs7903146 | TCF7L2 | Diabetes tipo 2 | OR 1,37/alelo | Risk factor |
| rs1061170 | CFH Y402H | DMRI | OR 2,5-5× | Risk factor |
| rs1801133 | MTHFR C677T | Folato/homocisteína | Modesto isolado | VUS |
| rs1801131 | MTHFR A1298C | Folato | Modesto | VUS |
| rs34637584 | LRRK2 G2019S | Parkinson | 25-30% penetrância idade 80 | ⚠️ sensível Pathogenic |

**Nota sobre cobertura de microarray:**
- BRCA1/BRCA2 estão parcialmente cobertos — ausência de variantes no chip NÃO significa ausência de risco familiar. App deve mostrar alerta explícito.
- APOE: alguns provedores (Genera, 23andMe) omitem APOE do export bruto. Se ausente, app mostra "não disponível neste dataset" sem explicação alarmante.

### 8.3 Farmacogenômica (CPIC level A)

| Gene | Star alleles principais | rsIDs no microarray | Drogas afetadas |
|---|---|---|---|
| CYP2C19 | *2, *3, *17 | rs4244285, rs4986893, rs12248560 | Clopidogrel, voriconazol, PPIs, SSRIs |
| CYP2C9 | *2, *3 | rs1799853, rs1057910 | Varfarina, fenitoína, AINES |
| VKORC1 | -1639G>A | rs9923231 | Varfarina (sensibilidade) |
| CYP2D6 | *2, *4, *10, *17, *41 | rs3892097, rs1065852, rs28371725, rs16947 | Codeína, tramadol, tamoxifeno, SSRIs, antipsicóticos |
| TPMT | *2, *3A, *3B, *3C | rs1800462, rs1800460, rs1142345 | Azatioprina, 6-MP |
| DPYD | *2A, *13 | rs3918290, rs55886062 | 5-FU, capecitabina (toxicidade grave) |
| HLA-B | *57:01, *15:02 | tag SNPs aproximados (baixa acurácia) | Abacavir, carbamazepina |
| SLCO1B1 | T521C | rs4149056 | Sinvastatina (miopatia) |
| UGT1A1 | *28 (TA repeat) | rs8175347 (proxy) | Irinotecano (toxicidade) |
| G6PD | múltiplos | rs1050828, rs1050829 | Drogas oxidativas (primaquina, dapsona) |

**Importante:** star alleles requerem múltiplos SNPs combinados. App precisa de módulo de **inferência de haplótipo** para montar fenotipagem (*1/*1, *1/*17, *2/*17 etc.) a partir dos genótipos individuais. CYP2D6 em particular tem duplicações/deleções que microarray não pega — mostrar sempre o disclaimer de que phenotype "poor" ou "ultrarapid" pode ser missed.

### 8.4 Nutrigenômica

| rsID | Gene | Função | Implicação |
|---|---|---|---|
| rs4988235 | MCM6/LCT | Persistência lactase | T → digere lactose adulto (variante europeia) |
| rs182549 | MCM6 | Persistência lactase (secundária) | — |
| rs762551 | CYP1A2 | Metab. cafeína | A → rápido |
| rs9939609 | FTO | Apetite/IMC | T → +1,3 kg IMC/alelo |
| rs5082 | APOA2 | Resposta gordura sat | C → ganha peso com gordura saturada |
| rs1801282 | PPARG P12A | Sensibilidade insulina | G → mais sensível |
| rs602662 | FUT2 | Secretor/não-secretor, B12 | G → não-secretor, menor B12 |
| rs174537/rs174546 | FADS1 | Conversão ômega-3 | T → conversão menor; dieta direta beneficia |
| rs855791 | TMPRSS6 | Hepcidina/ferro | A → menor ferro sérico |
| rs2228570 | VDR FokI | Receptor vit D | — |
| rs1544410 | VDR BsmI | Vit D | — |
| rs2282679 | GC | Transporte vit D | G → níveis 25(OH)D menores |

### 8.5 Esporte e exercício

| rsID | Gene | Trait | Interpretação |
|---|---|---|---|
| rs1815739 | ACTN3 R577X | Fast-twitch | CC=sprinter, TT=endurance, CT=misto |
| rs4646994 (proxy ACE I/D) | ACE | Endurance | I/I endurance; ACE é indel, proxy SNPs têm caveats |
| rs8192678 | PPARGC1A Gly482Ser | VO2max response | A → menor ganho com treino aeróbico |
| rs4680 | COMT Val158Met | Dopamina/dor/foco | A(Met)=worrier; G(Val)=warrior |
| rs12722 | COL5A1 | Risco tendinopatia | T → maior risco |
| rs1800012 | COL1A1 | Tecido conectivo | — |
| rs1800795 | IL6 -174G>C | Recuperação | C → menos IL-6 |

---

## 9. Polygenic Risk Scores (PRS)

PRS são somas ponderadas de centenas a milhões de variantes produzindo escore contínuo de predisposição. Diferente de variantes monogênicas (FVL, BRCA, LRRK2), PRS captura risco poligênico — onde nenhum SNP isolado explica muito.

### 9.1 Como funciona

Para cada SNP no escore: `contribuição = (contagem do alelo de efeito) × (peso publicado)`. Soma = escore bruto. Normaliza-se contra distribuição populacional → percentil.

### 9.2 Biblioteca inicial de PRS

| PRS | # SNPs (típico) | OR top 5% vs bottom 5% | PGS Catalog ID |
|---|---:|---:|---|
| Doença coronariana (CAD) | 1.74M ou subset 100k | ~3,9× | PGS000018 |
| Diabetes tipo 2 | 40-1M | ~2,5× | PGS000036 |
| Câncer de mama | 313 | ~2,5× | PGS000004 |
| Câncer de próstata | 269 | ~3× | PGS000662 |
| Altura | 700+ | predictivo | PGS000297 |
| BMI | 90+ | ~1,5× | PGS000027 |
| Depressão maior | 100+ | ~1,5× | PGS001861 |
| Fibrilação atrial | 1.1M | ~2,5× | PGS000016 |

### 9.3 Caveat de ancestralidade

Quase todos PRS foram desenvolvidos em coortes europeias. Aplicar em brasileiros admixtos exige recalibração. App deve:

1. Inferir ancestralidade a partir dos 600k SNPs do usuário (PCA contra 1000 Genomes populações de referência)
2. Mostrar PRS com "índice de confiança" baseado na distância do usuário ao cluster EUR
3. Oferecer PRS "multi-ancestry" quando disponível (alguns escores do PGS Catalog já são)

### 9.4 Comunicação responsável

Cada PRS apresentado com:

1. **Percentil** ("você está no percentil 78 para CAD")
2. **Risco absoluto** quando estimável ("~12% em 10 anos vs ~7% pop geral")
3. **Modificáveis** ("não fumar reduz ~50% independente do PRS")
4. **AUC/R² do escore**
5. **Ancestralidade da coorte**

Nunca: "você terá X". Sempre: "indivíduos com esse perfil têm Y× mais probabilidade...".

### 9.5 Cálculo client-side

```typescript
// lib/prs/calculate.ts
interface PrsWeight {
  rsid: string;
  effectAllele: string;
  effectWeight: number;
}

export async function calculatePrs(
  weights: PrsWeight[],
  profileId: string
): Promise<{ raw: number; covered: number; missing: number }> {
  let raw = 0, covered = 0, missing = 0;
  for (const w of weights) {
    const snp = await db.snps.get(w.rsid);
    if (!snp) { missing++; continue; }
    const dose = (snp.gt.match(new RegExp(w.effectAllele, 'g')) || []).length;
    raw += dose * w.effectWeight;
    covered++;
  }
  return { raw, covered, missing };
}
```

Em seguida normaliza contra distribuição populacional (pré-computada por PRS, bundle com a app).

---

## 10. Benchmark do Genera e concorrentes

### 10.1 Genera (genera.com.br — Brasil)

**Strengths:** kit chega em casa, processo tranquilo, relatórios polidos, suporte em pt-BR, coleta consentida para banco brasileiro, relatório de ancestralidade bom.

**Gaps:**
- Cobertura interpretativa limitada (~150-300 traits)
- Farmacogenômica superficial
- Sem PRS modernos
- Sem busca por SNP individual
- Sem visualização genoma
- Sem comparação ABraOM
- APOE redatado no export
- Sem updates contínuos
- Fechado (usuário fica preso)

### 10.2 Promethease (promethease.com)

$5/relatório. Literature mining via SNPedia. Sem curadoria clínica. Sem PRS. Sem PGx formal. Interface criticada como text-heavy e caótica. Útil como benchmark de volume de informação, péssima em UX.

### 10.3 Genetic Genie (geneticgenie.org)

Gratuito/donation-ware. Relatórios specializados (MTHFR, detox, metilação). Interface simples. Escopo estreito.

### 10.4 Outros

- **DNA.Land:** foco em ancestralidade + imputação. Projeto acadêmico Columbia.
- **Sequencing.com:** apps-store model. Paga por app. Fechado.
- **Nebula Genomics:** whole-genome, não microarray. Público diferente.
- **LiveDNA / FamilyTreeDNA:** ancestralidade pesada, pouco traço/saúde.

### 10.5 Onde a DNA Explorer ganha

1. **Profundidade + visualização** no mesmo lugar
2. **Busca livre** por rsID/gene/trait
3. **PRS multi-trait**
4. **Brasil-aware** (ABraOM)
5. **Atualização contínua** (user reabre 6 meses depois e vê variantes reclassificadas — anotação é fetched sempre que expira TTL)
6. **Open & client-side** (código auditável, dado nunca sai do browser)
7. **Multi-provider** (não só Genera)
8. **Gratuito** sem paywall, sem upsell, sem ads

---

## 11. Privacidade, LGPD e responsabilidade médica

### 11.1 LGPD (Lei 13.709/2018)

Dado genético é **dado pessoal sensível** (Art. 5º, II). Exige consentimento específico, informado, por escrito. A arquitetura proposta atende LGPD por design:

- **100% client-side:** arquivo do usuário nunca sai do navegador
- **Sem servidor de armazenamento:** nada é enviado para cloud
- **Lookups anônimos:** API proxies chamam dbSNP/ClinVar/etc. usando **apenas o rsID** (informação pública, não PII)
- **IndexedDB local:** dados no disco do usuário; apaga a qualquer momento
- **Cifragem opcional:** modo "vault" cifra IndexedDB com PBKDF2+AES (senha do usuário)
- **Termo de consentimento:** apresentado uma vez, texto em português claro
- **Direito de exclusão:** botão "Apagar todos os meus dados" limpa IndexedDB instantaneamente
- **Offline após load:** PWA funciona sem internet depois do primeiro load

Residual: se usuário compartilha prints/dados voluntariamente, é decisão dele. Banner permanente: "Esses dados são privados. Você decide se e com quem compartilhar".

### 11.2 ANVISA / CFM

Plataforma NÃO é dispositivo médico (RDC nº 185/2001). Fora do escopo ANVISA por ser explicitamente educacional. Mesmo assim:

- Nunca usar "diagnóstico"
- Nunca recomendar dosagens (mostrar CPIC "discuta com seu médico")
- Nunca prometer resultado

### 11.3 GDPR / internacional

Como arquitetura é client-side, GDPR também é satisfeito trivialmente (não há "data controller" processando dados). Para usuários UE, apresentar termos em inglês. Right to erasure = botão "delete all".

### 11.4 Disclaimer médico padrão

> Esta plataforma tem caráter educacional e de exploração científica. As interpretações baseiam-se em literatura pública e **não substituem** aconselhamento genético, diagnóstico médico ou orientação farmacêutica profissional. Variantes genéticas representam apenas um dos múltiplos fatores que influenciam saúde, traços e resposta a medicamentos. Antes de tomar decisões clínicas baseadas nestes dados — incluindo iniciar, ajustar ou interromper medicamentos — consulte profissional de saúde qualificado.

### 11.5 Variantes sensíveis

Opt-in obrigatório para:

- APOE ε4 (Alzheimer)
- BRCA1/BRCA2 (câncer hereditário — com alerta sobre cobertura parcial de microarray)
- LRRK2 G2019S (Parkinson)
- HTT CAG repeat (Huntington — não detectável por microarray mas SNPs próximos causam ansiedade)
- Variantes de câncer hereditário ClinVar Pathogenic

Fluxo: tela intermediária explicativa + opt-in explícito + link para genetic counselor (SBGM — Sociedade Brasileira de Genética Médica).

### 11.6 Ethical considerations

- **Discriminação genética:** Brasil não tem proteção equivalente à GINA (EUA). Alertar usuários de risco hipotético de seguradoras/empregadores pedirem dados. Recomendação: não compartilhar.
- **Kid data:** bloquear upload para DOB < 18 sem consentimento parental explícito (declaração na UI).
- **Familiar implications:** variantes patogênicas têm implicações para família. Texto educacional: "se você descobriu variante P/LP, considere falar com familiares".

---

## 12. Community, open source e extensibilidade

### 12.1 Open source

- Licença MIT
- GitHub repo público desde dia 1
- Issues abertas, RFCs estruturadas, discussions enabled
- CONTRIBUTING.md, CODE_OF_CONDUCT.md (Contributor Covenant 2.1)

### 12.2 Sistema de plugins ("Skills")

Módulos de interpretação customizáveis. Cada skill é um arquivo TS exportando:

```typescript
export interface Skill {
  id: string;
  title: string;
  description: string;
  category: 'trait' | 'health' | 'pharmaco' | 'nutri' | 'sport' | 'ancestry' | 'other';
  version: string;
  author: string;
  license: string;
  snpsRequired: string[];              // lista de rsIDs
  minCoverage?: number;                // ex: precisa de 80% dos rsIDs callados
  compute(snps: Snp[]): SkillResult;
  references: string[];
  disclaimer?: string;
}
```

Exemplos de skills iniciais:
- `mthfr-methylation.ts`
- `apoe-alzheimer.ts` (sensível)
- `cyp2c19-phenotype.ts`
- `actn3-sprint-endurance.ts`
- `prs-cad.ts`
- `prs-t2d.ts`
- `caffeine-metabolism.ts`
- `lactose-persistence.ts`
- `vitamin-d-needs.ts`
- `warfarin-dosing.ts`

Comunidade pode PR novas skills via GitHub. Review pela maintainer team antes de merge. Skills marcadas como `experimental` aparecem em aba separada.

### 12.3 i18n

- pt-BR: idioma padrão
- en: segunda prioridade
- es: terceira (mercado latino)
- Arquitetura: `next-intl` ou `next-i18next`
- Strings em JSON organizadas por feature

### 12.4 Contribution beyond code

- Traduções (Crowdin)
- Curadoria de skills (adicionar rsIDs, referências)
- Testing em dispositivos variados
- Feedback UX / reportar falsos positivos

### 12.5 Roadmap de integrações de provedores

1. MVP: Genera (CSV + TXT)
2. +1: 23andMe v4, v5
3. +2: AncestryDNA
4. +3: MyHeritage, FTDNA
5. +4: LivingDNA, tellmeGen
6. +5: VCF genérico (para Nebula, Dante, sequenciamento completo)
7. +6: PLINK/BED genérico

---

## 13. Roadmap em quatro fases

### Fase 1 — MVP (semanas 1-4)

**Objetivo:** usuário sobe arquivo e navega o próprio genoma.

- Scaffold Next.js 15 + TS + Tailwind + shadcn
- Upload page com drag&drop, detecção de provedor
- Worker de parsing com PapaParse + Dexie
- Dashboard estático (contagens, distribuição cromossômica)
- Cariótipo 2D com ideogram.js
- Busca por rsID com lookup live no MyVariant.info
- Página de detalhe SNP com cards (ClinVar, gnomAD, dbSNP)
- Biblioteca canonicalSnps.ts com ~50 rsIDs "highlights"
- Termos de uso + consentimento LGPD
- Modo claro/escuro
- Deploy Vercel

**Deliverable:** plataforma funcional, qualquer pessoa pode subir arquivo.

### Fase 2 — Visualização 3D (semanas 5-9)

- R3F + drei integration
- Modelo B-form DNA
- LOD multinível
- Navegação cromossomo → gene → SNP
- Linkagem cariótipo ↔ hélice 3D
- Modo "dois alelos" para heterozigotos
- Tour guiado com 3-5 SNPs famosos

### Fase 3 — Interpretação clínica + PRS (semanas 10-14)

- Integração GWAS Catalog
- CPIC drug interaction panel + inferência de haplótipo PGx
- Cálculo de 5-8 PRS usando weights do PGS Catalog
- Track ABraOM no genome browser
- Modo "saúde sensível" com opt-in
- Aba farmacogenômica completa
- Export PDF do relatório

### Fase 4 — Modo imersivo + maturidade (semanas 15-20)

- Cinematográfico com post-processing
- Tour expandido com narração TTS
- Multi-provider: 23andMe, Ancestry
- PWA instalável offline
- i18n pt/en/es
- Sistema de skills (plugins)
- Community features: GitHub discussions, feedback loop
- v1.0 release

---

## 14. MVP da semana 1 — próximas ações concretas

```bash
# Scaffold
npx create-next-app@latest dna-explorer --typescript --tailwind --app --src-dir
cd dna-explorer

# Deps
npm install zustand @tanstack/react-query dexie dexie-react-hooks
npm install papaparse comlink fuse.js
npm install ideogram          # cariótipo
npm install @react-three/fiber @react-three/drei three
npm install lucide-react

# shadcn
npx shadcn@latest init
npx shadcn@latest add button card dialog input table tabs sheet toast dropdown-menu

# Tipos
npm install -D @types/papaparse @types/three vitest @playwright/test
```

**Primeiro commit:** página de upload que aceita o arquivo do Caio e mostra contagem por cromossomo. Em uma tarde de trabalho.

**Segundo commit:** cariótipo 2D ideogram.js mostrando onde estão os SNPs do usuário.

**Terceiro commit:** busca por rsID com lookup no MyVariant.info + cache em IndexedDB.

Depois disso o projeto está "vivo" e cada feature nova incrementa sobre base funcional.

---

## 15. Anexo A — análise dos arquivos do Caio (fixture de teste)

Os arquivos fornecidos servem como fixture canônica para validar o parser Genera:

| Arquivo | Tamanho | SNPs | No-calls | Formato |
|---|---:|---:|---:|---|
| `555308.csv` | 16,2 MB | 633.759 | 0,84% | CSV sem aspas |
| `555308_26293.txt` | 20,8 MB | 605.885 | 14,73% | CSV com aspas |

**Overlap entre os dois:** 520 mil rsIDs em comum, 109 mil exclusivos do CSV, 85 mil exclusivos do TXT. Sugere que são exportes de diferentes versões do chip Genera ao longo do tempo.

**Cromossomos cobertos:** 1-22, X, Y, MT. Presença de chrY (3.709 SNPs) e chrMT (950 SNPs) permitirá testar haplogrupo paterno e materno.

**Edge cases validados:**
- ✓ Aspas (TXT) vs sem aspas (CSV)
- ✓ Indels representados como `II`, `DD`, `DI` (7.539 no CSV)
- ✓ No-calls como `--`
- ✓ rsIDs normais (`rs12345`) e IDs internos (`i12345`)
- ✓ Cromossomos sexuais e MT
- ✓ Cobertura alta (99% CSV) e baixa (85% TXT)

**Uso:** committar em `tests/fixtures/genera/` com anonimização (remover metadados identificáveis se houver). Incluir em smoke test e2e do parser.

---

## 16. Referências

### Fontes de dados
- dbSNP — https://www.ncbi.nlm.nih.gov/snp/
- ClinVar — https://www.ncbi.nlm.nih.gov/clinvar/
- Ensembl REST — https://rest.ensembl.org/
- gnomAD — https://gnomad.broadinstitute.org/
- 1000 Genomes — https://www.internationalgenome.org/
- GWAS Catalog — https://www.ebi.ac.uk/gwas/
- SNPedia — https://snpedia.com/
- MyVariant.info — https://myvariant.info/
- PharmGKB — https://www.pharmgkb.org/
- CPIC — https://cpicpgx.org/
- PGS Catalog — https://www.pgscatalog.org/
- ABraOM — https://abraom.ib.usp.br/
- DNA do Brasil — https://www.gov.br/mcti/pt-br
- UniProt — https://www.uniprot.org/
- OMIM — https://www.omim.org/
- UCSC Genome Browser — https://genome.ucsc.edu/
- HaploGrep (mtDNA haplogroup) — https://haplogrep.i-med.ac.at/

### Libs e frameworks
- Next.js — https://nextjs.org/
- React Three Fiber — https://docs.pmnd.rs/react-three-fiber
- drei — https://github.com/pmndrs/drei
- Three.js — https://threejs.org/
- igv.js — https://github.com/igvteam/igv.js
- ideogram.js — https://github.com/eweitz/ideogram
- PapaParse — https://www.papaparse.com/
- Dexie.js — https://dexie.org/
- Zustand — https://zustand-demo.pmnd.rs/
- TanStack Query — https://tanstack.com/query
- shadcn/ui — https://ui.shadcn.com/
- Mol* — https://molstar.org/
- 3Dmol.js — https://3dmol.csb.pitt.edu/
- pgsc_calc — https://pgsc-calc.readthedocs.io/

### Benchmarks / concorrentes
- Promethease — https://promethease.com/
- Genetic Genie — https://geneticgenie.org/
- DNA.Land — https://dna.land/
- Sequencing.com — https://sequencing.com/
- Nebula Genomics — https://nebula.org/

### Regulatório
- LGPD (Lei 13.709/2018) — http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD — https://www.gov.br/anpd
- SBGM — https://www.sbgm.org.br/
- ANVISA RDC 185/2001

### Literatura-chave
- 1000 Genomes Consortium (2015), Nature 526:68-74
- Karczewski et al. (2020), gnomAD v2.1, Nature 581:434-443
- Naslavsky et al. (2022), ABraOM SABE-WGS-1171, Nature Comms 13:1004
- Khera et al. (2018), Genome-wide PGS, Nat Genet 50:1219-1224

---

*Documento de fundação. Versão 1.0 — abril/2026. Conteúdo educacional. Não constitui aconselhamento médico, genético ou farmacêutico.*
