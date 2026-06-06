/// <reference lib="webworker" />
import Papa from "papaparse";
import Dexie, { type Table } from "dexie";
import { detectProvider, normalizeChrom, classifyCall } from "./detectProvider";

interface WorkerSnp {
  rsid: string;
  chrom: string;
  pos: number;
  gt: string;
  call: "homo" | "hetero" | "indel" | "nocall";
}

class WorkerDb extends Dexie {
  snps!: Table<WorkerSnp, string>;
  profiles!: Table<any, string>;
  annotations!: Table<any, string>;
  constructor() {
    super("DnaExplorer");
    this.version(1).stores({
      snps: "rsid, chrom, pos, call",
      profiles: "id, createdAt",
      annotations: "rsid, fetchedAt",
    });
  }
}

const db = new WorkerDb();

interface MsgIn {
  type: "parse";
  files: { name: string; buffer: ArrayBuffer }[];
  append: boolean;
}

self.onmessage = async (e: MessageEvent<MsgIn>) => {
  try {
    const t0 = performance.now();
    if (!e.data.append) {
      await db.snps.clear();
    }

    let totalProcessed = 0;
    let detectedProvider = "desconhecido";
    const fileNames: string[] = [];
    const buildHint = { build: "GRCh37/hg19" };

    for (const f of e.data.files) {
      fileNames.push(f.name);
      const text = new TextDecoder("utf-8").decode(f.buffer);
      const provider = detectProvider(text, f.name);
      detectedProvider = provider.name;

      const rows: WorkerSnp[] = [];
      let headerSkipped = false;

      await new Promise<void>((resolve, reject) => {
        Papa.parse<string[]>(text, {
          delimiter: provider.delimiter,
          quoteChar: provider.hasQuotes ? '"' : '\u0000',
          skipEmptyLines: true,
          header: false,
          chunkSize: 1024 * 256,
          chunk: async (results: { data: any[][] }) => {
            const batch: WorkerSnp[] = [];
            for (const row of results.data) {
              if (!row || row.length < 3) continue;
              if (!headerSkipped) {
                headerSkipped = true;
                if (String(row[0]).replace(/"/g, "").toLowerCase().startsWith("rsid")) continue;
              }
              let rsid = String(row[0] ?? "").replace(/"/g, "").trim();
              const chrom = normalizeChrom(String(row[1] ?? ""));
              const pos = parseInt(String(row[2] ?? "").replace(/"/g, ""), 10);
              let result: string;
              if (row.length >= 5) {
                // Ancestry format: allele1 + allele2
                const a1 = String(row[3] ?? "").replace(/"/g, "").trim();
                const a2 = String(row[4] ?? "").replace(/"/g, "").trim();
                result = (a1 === "0" || a2 === "0") ? "--" : a1 + a2;
              } else {
                result = String(row[3] ?? "").replace(/"/g, "").trim();
              }
              if (!rsid || !chrom || isNaN(pos)) continue;
              const { gt, call } = classifyCall(result);
              batch.push({ rsid, chrom, pos, gt, call });
            }
            rows.push(...batch);
          },
          complete: () => resolve(),
          error: (err: Error) => reject(err),
        });
      });

      const CHUNK = 10000;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        await db.snps.bulkPut(slice);
        totalProcessed += slice.length;
        (self as DedicatedWorkerGlobalScope).postMessage({
          kind: "progress",
          processed: totalProcessed,
        });
      }
    }

    const profile = {
      id: "profile_" + Date.now(),
      name: fileNames.map((n) => n.replace(/\.(csv|txt)$/i, "")).join(" + "),
      createdAt: Date.now(),
      provider: detectedProvider,
      build: buildHint.build,
      snpCount: await db.snps.count(),
      files: fileNames,
    };
    await db.profiles.clear();
    await db.profiles.put(profile);

    const elapsedMs = performance.now() - t0;
    (self as DedicatedWorkerGlobalScope).postMessage({
      kind: "done",
      processed: totalProcessed,
      provider: detectedProvider,
      build: buildHint.build,
      elapsedMs,
      profile,
    });
  } catch (err: any) {
    (self as DedicatedWorkerGlobalScope).postMessage({
      kind: "error",
      error: err?.message ?? String(err),
    });
  }
};

export {};
