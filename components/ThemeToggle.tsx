"use client";
import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/stores/themeStore";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
  const { theme, toggle, hydrate } = useTheme();
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <button
      onClick={toggle}
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-accent/60 bg-bg-soft transition-colors group"
      aria-label="alternar tema"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25 }}
          >
            <Moon className="h-4 w-4 text-accent" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25 }}
          >
            <Sun className="h-4 w-4 text-accent" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="text-xs font-medium text-fg-dim group-hover:text-fg transition">
        {theme === "dark" ? "escuro" : "claro"}
      </span>
    </button>
  );
}
