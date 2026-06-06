import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toLocaleString("pt-BR");
}

export function pct(num: number, den: number, decimals = 2): string {
  if (!den) return "0%";
  return ((num / den) * 100).toFixed(decimals) + "%";
}

export function formatBp(pos: number): string {
  if (pos >= 1e6) return (pos / 1e6).toFixed(2) + " Mb";
  if (pos >= 1e3) return (pos / 1e3).toFixed(1) + " kb";
  return pos + " bp";
}
