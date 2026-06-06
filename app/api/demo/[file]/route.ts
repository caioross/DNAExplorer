import { NextRequest } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const ALLOWED = new Set(["555308.csv", "555308_26293.txt"]);

export async function GET(_req: NextRequest, { params }: { params: { file: string } }) {
  const f = params.file;
  if (!ALLOWED.has(f)) {
    return new Response("not allowed", { status: 403 });
  }
  const path = join(process.cwd(), "dna_caio", f);
  try {
    await stat(path);
  } catch {
    return new Response("fixture not found. Put the file in /dna_caio/", { status: 404 });
  }
  const data = await readFile(path);
  return new Response(data, {
    headers: {
      "content-type": f.endsWith(".csv") ? "text/csv" : "text/plain",
      "content-length": String(data.byteLength),
      "cache-control": "public, max-age=3600",
    },
  });
}
