"use client";
import { cn } from "@/lib/utils";

const BASE_COLORS: Record<string, string> = {
  A: "text-green-400",
  T: "text-red-400",
  G: "text-yellow-400",
  C: "text-blue-400",
  I: "text-fuchsia-400",
  D: "text-orange-400",
};

export default function GenotypePill({ gt, call }: { gt: string; call: string }) {
  if (!gt || gt === "--" || call === "nocall") {
    return <span className="chip text-fg-muted">--</span>;
  }
  return (
    <span className="chip font-mono">
      {gt.split("").map((b, i) => (
        <span key={i} className={cn("font-bold", BASE_COLORS[b] || "text-fg")}>
          {b}
        </span>
      ))}
    </span>
  );
}
