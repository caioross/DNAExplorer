"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Slice {
  name: string;
  value: number;
  color: string;
}

type Props =
  | { data: Slice[]; stats?: undefined }
  | { stats: Record<string, number>; data?: undefined };

export default function GenotypeDonut(props: Props) {
  const data: Slice[] = props.data ?? [
    { name: "Homozigotos", value: props.stats?.homo || 0, color: "#22d3ee" },
    { name: "Heterozigotos", value: props.stats?.hetero || 0, color: "#a855f7" },
    { name: "Indels", value: props.stats?.indel || 0, color: "#f59e0b" },
    { name: "No-calls", value: props.stats?.nocall || 0, color: "#64748b" },
  ];
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "rgb(var(--c-bg-soft))", border: "1px solid rgb(var(--c-border))", borderRadius: 8, fontSize: 12, color: "rgb(var(--c-fg))" }}
            formatter={(v: number, n) => [`${v.toLocaleString("pt-BR")} (${((v / total) * 100).toFixed(1)}%)`, n]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2 text-[11px]">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            <span className="text-fg-dim">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
