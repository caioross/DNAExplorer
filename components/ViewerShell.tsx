"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Dna, Layers, BookOpen, Home, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentProfile, deleteEverything } from "@/lib/db";
import ThemeToggle from "./ThemeToggle";
import type { Profile } from "@/lib/types";
import { fmt } from "@/lib/utils";

const GenomeHelix = dynamic(() => import("./GenomeHelix"), { ssr: false });
const HelixContextPanel = dynamic(() => import("./HelixContextPanel"), { ssr: false });

const TABS = [
  { href: "/viewer", label: "Dashboard", icon: Home },
  { href: "/viewer/catalog", label: "Catálogo", icon: BookOpen },
  { href: "/viewer/chromosomes", label: "Cromossomos", icon: Layers },
];

export default function ViewerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getCurrentProfile();
      if (!p) router.replace("/");
      else setProfile(p);
    })();
  }, [router]);

  const handleDelete = async () => {
    if (!confirm("Apagar todos os dados carregados? Isso limpa o IndexedDB local.")) return;
    await deleteEverything();
    router.push("/");
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-bg">
      {/* Top bar */}
      <header className="border-b border-border bg-bg-soft/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight hover:text-accent transition-colors">
            <Dna className="h-5 w-5 text-accent animate-pulse-slow" />
            <span className="grad-text">DNAExplorer</span>
          </Link>

          <nav className="flex items-center gap-1 ml-6">
            {TABS.map((t) => {
              const active = pathname === t.href || (t.href !== "/viewer" && pathname.startsWith(t.href));
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    active ? "text-accent" : "text-fg-dim hover:text-fg hover:bg-bg-elevated"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                  {active && (
                    <motion.div
                      layoutId="active-tab"
                      className="absolute inset-0 bg-accent/10 border border-accent/30 rounded-lg -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto" />
          <ThemeToggle />

          <button
            onClick={handleDelete}
            title="apagar dados locais"
            className="btn-ghost text-xs p-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {profile && (
          <div className="px-4 py-1.5 border-t border-border/50 flex items-center gap-3 text-[10px] text-fg-muted">
            <span className="font-mono">{profile.name}</span>
            <span>·</span>
            <span>{fmt(profile.snpCount)} SNPs</span>
            <span>·</span>
            <span>{profile.provider}</span>
            <span>·</span>
            <span>{profile.build}</span>
          </div>
        )}
      </header>

      {/* Body: center + helix */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-y-auto scroll-fade">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="p-6 md:p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <aside className="border-l border-border bg-bg-soft/30 backdrop-blur-sm flex flex-col w-[38vw] min-w-[420px] max-w-[640px]">
          <div className="h-10 border-b border-border flex items-center px-3 gap-2">
            <Dna className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold">Hélice do genoma</span>
            <span className="text-[10px] text-fg-muted ml-auto">persistente</span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <GenomeHelix />
          </div>
          <HelixContextPanel />
        </aside>
      </div>
    </div>
  );
}
