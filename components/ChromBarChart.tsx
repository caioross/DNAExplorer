"use client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { CHROMOSOMES } from "@/lib/chromosomes";

export default function ChromBarChart({ byChrom }: { byChrom: Record<string, number> }) {
  const data = CHROMOSOMES.map((c) => ({ chrom: c, count: byChrom[c] || 0 }));
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: -10 }}>
          <XAxis dataKey="chrom" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={{ stroke: "#1f2739" }} tickLine={false} />
          <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={{ stroke: "#1f2739" }} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#0b0f1a", border: "1px solid #1f2739", borderRadius: 8, fontSize: 12 }}
            cursor={{ fill: "#151b2d" }}
            formatter={(v: number) => [v.toLocaleString("pt-BR"), "SNPs"]}
            labelFormatter={(l) => `chr${l}`}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill="#22d3ee" opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
