"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStats } from "@/lib/db";
import ChromosomeGrid from "@/components/ChromosomeGrid";

export default function ChromosomesIndexPage() {
  const router = useRouter();
  const [byChrom, setByChrom] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getStats();
      if (!s) {
        router.replace("/");
        return;
      }
      setByChrom(s.byChrom);
    })();
  }, [router]);

  if (!byChrom) return <div className="py-12 text-center text-fg-muted">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">Cromossomos</h1>
        <p className="text-sm text-fg-dim">
          Cobertura do seu DNA por cromossomo. A marca vertical fina indica a posição aproximada do centrômero.
        </p>
      </div>
      <ChromosomeGrid byChrom={byChrom} />
    </div>
  );
}
