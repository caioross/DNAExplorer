import Dexie, { Table } from "dexie";
import type { Snp, Profile, AnnotationCache } from "./types";

class DnaDb extends Dexie {
  snps!: Table<Snp, string>;
  profiles!: Table<Profile, string>;
  annotations!: Table<AnnotationCache, string>;

  constructor() {
    super("DnaExplorer");
    this.version(1).stores({
      snps: "rsid, chrom, pos, call",
      profiles: "id, createdAt",
      annotations: "rsid, fetchedAt",
    });
  }
}

export const db = typeof window !== "undefined" ? new DnaDb() : (null as unknown as DnaDb);

export async function clearAllSnps(): Promise<void> {
  if (!db) return;
  await db.snps.clear();
}

export async function deleteEverything(): Promise<void> {
  if (!db) return;
  await db.snps.clear();
  await db.profiles.clear();
  await db.annotations.clear();
}

export async function getStats() {
  if (!db) return null;
  const total = await db.snps.count();
  if (!total) return null;

  const byChrom: Record<string, number> = {};
  const byCall: Record<string, number> = { homo: 0, hetero: 0, nocall: 0, indel: 0 };

  await db.snps.each((s) => {
    byChrom[s.chrom] = (byChrom[s.chrom] || 0) + 1;
    byCall[s.call] = (byCall[s.call] || 0) + 1;
  });

  return { total, byChrom, byCall };
}

export async function getChromosomeSnps(chrom: string, limit = 500, offset = 0): Promise<Snp[]> {
  if (!db) return [];
  return db.snps.where("chrom").equals(chrom).offset(offset).limit(limit).toArray();
}

export async function getSnp(rsid: string): Promise<Snp | undefined> {
  if (!db) return undefined;
  return db.snps.get(rsid);
}

export async function searchSnps(prefix: string, limit = 20): Promise<Snp[]> {
  if (!db) return [];
  if (!prefix) return [];
  return db.snps
    .where("rsid")
    .startsWithIgnoreCase(prefix)
    .limit(limit)
    .toArray();
}

export async function countChromosomeSnps(chrom: string): Promise<number> {
  if (!db) return 0;
  return db.snps.where("chrom").equals(chrom).count();
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!db) return null;
  const profiles = await db.profiles.orderBy("createdAt").reverse().limit(1).toArray();
  return profiles[0] ?? null;
}

/**
 * Stratified sample of the user's SNPs for helix visualization.
 * Distributes samples proportionally across chromosomes (ordered 1..22, X, Y, MT),
 * picking SNPs at uniform genomic strides within each chromosome. Returns SNPs in
 * genome-order (chrom-index, then pos).
 *
 * The helix renderer uses these as the actual base sequence — every bp shown
 * corresponds to a real user genotype at a real position.
 */
const HELIX_CHROM_ORDER = [
  "1","2","3","4","5","6","7","8","9","10",
  "11","12","13","14","15","16","17","18","19","20",
  "21","22","X","Y","MT",
];

export async function sampleSnpsForHelix(totalSamples: number): Promise<Snp[]> {
  if (!db) return [];
  const counts = await Promise.all(
    HELIX_CHROM_ORDER.map((c) => db.snps.where("chrom").equals(c).count())
  );
  const grandTotal = counts.reduce((a, b) => a + b, 0);
  if (grandTotal === 0) return [];

  const out: Snp[] = [];
  for (let i = 0; i < HELIX_CHROM_ORDER.length; i++) {
    const chrom = HELIX_CHROM_ORDER[i];
    const count = counts[i];
    if (count === 0) continue;
    const perChrom = Math.max(1, Math.round((totalSamples * count) / grandTotal));
    const all = await db.snps.where("chrom").equals(chrom).sortBy("pos");
    const stride = Math.max(1, Math.floor(count / perChrom));
    for (let j = 0; j < perChrom; j++) {
      const idx = j * stride;
      if (idx < all.length) out.push(all[idx]);
    }
  }
  return out;
}
