import { NextRequest } from "next/server";

const CACHE = new Map<string, { data: any; ts: number }>();
const TTL = 1000 * 60 * 60 * 24 * 7;

export async function GET(_req: NextRequest, { params }: { params: { rsid: string } }) {
  const rsid = params.rsid.toLowerCase().replace(/[^a-z0-9]/gi, "");
  if (!/^rs\d+$/.test(rsid)) {
    return new Response(JSON.stringify({ error: "rsid inválido" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const cached = CACHE.get(rsid);
  if (cached && Date.now() - cached.ts < TTL) {
    return Response.json(cached.data, { headers: { "x-cache": "hit" } });
  }

  try {
    const url = `https://myvariant.info/v1/variant/${rsid}?assembly=hg19`;
    const r = await fetch(url, {
      headers: { "user-agent": "DNAExplorer/0.1 (educational)" },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!r.ok) {
      return Response.json({ error: `upstream ${r.status}` }, { status: 502 });
    }
    const data = await r.json();
    CACHE.set(rsid, { data, ts: Date.now() });
    return Response.json(data, { headers: { "x-cache": "miss" } });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "proxy error" }, { status: 500 });
  }
}
