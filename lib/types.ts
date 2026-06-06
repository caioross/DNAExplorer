export type ChromName =
  | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"
  | "11" | "12" | "13" | "14" | "15" | "16" | "17" | "18" | "19" | "20"
  | "21" | "22" | "X" | "Y" | "MT";

export type CallType = "homo" | "hetero" | "indel" | "nocall";

export interface Snp {
  rsid: string;
  chrom: string;
  pos: number;
  gt: string;
  call: CallType;
}

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
  provider: string;
  build: string;
  snpCount: number;
  files: string[];
}

export interface AnnotationCache {
  rsid: string;
  data: unknown;
  fetchedAt: number;
}

export interface ParseProgress {
  kind: "progress" | "done" | "error";
  processed?: number;
  total?: number;
  provider?: string;
  build?: string;
  elapsedMs?: number;
  error?: string;
}

export interface Reference {
  label: string;
  url?: string;
  pmid?: string;
}

export interface CanonicalSnp {
  rsid: string;
  gene: string;
  geneFullName?: string;
  chrom: string;
  position?: number;
  category: "trait" | "health" | "pharmaco" | "nutri" | "sport";
  title: string;
  shortDesc: string;
  longDesc?: string;
  mechanism?: string;
  interpretations: Record<string, string>;
  clinicalSignificance?: "pathogenic" | "likely_pathogenic" | "vus" | "likely_benign" | "benign";
  sensitive?: boolean;
  references?: Reference[];
  notes?: string;
  populationNotes?: string;
  actionable?: string;
  tags?: string[];
}

export interface ChromosomeInfo {
  chrom: string;
  commonName?: string;
  majorGenes: string[];
  knownFor: string;
  notableConditions?: string[];
  pArm?: string;
  qArm?: string;
}
