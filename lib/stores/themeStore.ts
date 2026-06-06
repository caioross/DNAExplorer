"use client";
import { create } from "zustand";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  hydrate: () => void;
}

const KEY = "dnaexplorer.theme";

export const useTheme = create<ThemeState>((set, get) => ({
  theme: "dark",
  setTheme: (t) => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t);
      try { localStorage.setItem(KEY, t); } catch {}
    }
    set({ theme: t });
  },
  toggle: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
  hydrate: () => {
    if (typeof document === "undefined") return;
    let stored: Theme | null = null;
    try { stored = localStorage.getItem(KEY) as Theme | null; } catch {}
    const t: Theme = stored === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    set({ theme: t });
  },
}));
