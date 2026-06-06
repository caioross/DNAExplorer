export interface ProviderSpec {
  name: string;
  delimiter: string;
  hasQuotes: boolean;
  columns: string[];
}

export function detectProvider(sample: string, fileName: string): ProviderSpec {
  const head = sample.slice(0, 4096);

  if (head.includes("23andMe") || /^#\s*rsid\s+chromosome/m.test(head)) {
    return { name: "23andMe", delimiter: "\t", hasQuotes: false, columns: ["rsid","chromosome","position","genotype"] };
  }

  if (head.includes("AncestryDNA") || /rsid\tchromosome\tposition\tallele1\tallele2/.test(head)) {
    return { name: "AncestryDNA", delimiter: "\t", hasQuotes: false, columns: ["rsid","chromosome","position","allele1","allele2"] };
  }

  const firstLine = head.split(/\r?\n/)[0]?.trim() ?? "";
  const hasQuotes = /^"/.test(head.split(/\r?\n/)[1] ?? "") || firstLine.startsWith('"');
  const delimiter = firstLine.includes(",") ? "," : firstLine.includes("\t") ? "\t" : ",";

  const isGeneraFormat = /RSID\s*,\s*CHROMOSOME\s*,\s*POSITION\s*,\s*RESULT/i.test(firstLine.replace(/"/g, ""));

  if (isGeneraFormat) {
    return {
      name: fileName.toLowerCase().endsWith(".txt") ? "Genera (export txt)" : "Genera",
      delimiter,
      hasQuotes,
      columns: ["rsid","chromosome","position","result"],
    };
  }

  return { name: "Unknown (CSV genérico)", delimiter, hasQuotes, columns: ["rsid","chromosome","position","result"] };
}

export function normalizeChrom(c: string): string {
  const up = String(c).toUpperCase().replace(/^CHR/, "");
  if (up === "23") return "X";
  if (up === "24") return "Y";
  if (up === "25" || up === "M") return "MT";
  if (up === "XY") return "X";
  return up;
}

export function classifyCall(result: string): { gt: string; call: "homo" | "hetero" | "indel" | "nocall" } {
  const r = result.replace(/"/g, "").trim().toUpperCase();
  if (!r || r === "--" || r === "00" || r === "NN" || r === "0") return { gt: "--", call: "nocall" };
  if (/^[IDN]{2}$/.test(r) || r.length > 2) return { gt: r, call: "indel" };
  if (r.length === 2) {
    const sorted = r.split("").sort().join("");
    return { gt: sorted, call: sorted[0] === sorted[1] ? "homo" : "hetero" };
  }
  return { gt: r, call: "nocall" };
}
