"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload as UploadIcon, FileCheck2, AlertTriangle, Loader2, Database, Trash2, Sparkles } from "lucide-react";
import { db, deleteEverything, getCurrentProfile } from "@/lib/db";
import { fmt } from "@/lib/utils";
import type { Profile } from "@/lib/types";

interface Progress {
  kind: "progress" | "done" | "error";
  processed?: number;
  elapsedMs?: number;
  provider?: string;
  build?: string;
  error?: string;
  profile?: Profile;
}

export default function Upload() {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [existing, setExisting] = useState<Profile | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getCurrentProfile();
      if (p) setExisting(p);
    })();
  }, []);

  const onFiles = (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => /\.(csv|txt|tsv)$/i.test(f.name));
    setFiles((prev) => [...prev, ...arr]);
    setProgress(null);
  };

  const startParse = async () => {
    if (!files.length) return;
    setProgress({ kind: "progress", processed: 0 });

    const buffers = await Promise.all(
      files.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer() }))
    );

    const worker = new Worker(new URL("../lib/parser.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<Progress>) => {
      setProgress(e.data);
      if (e.data.kind === "done") {
        worker.terminate();
        workerRef.current = null;
        setTimeout(() => router.push("/viewer"), 800);
      }
      if (e.data.kind === "error") {
        worker.terminate();
        workerRef.current = null;
      }
    };

    const transferables = buffers.map((b) => b.buffer);
    worker.postMessage({ type: "parse", files: buffers, append: false }, transferables);
  };

  const clearStored = async () => {
    await deleteEverything();
    setExisting(null);
  };

  const loadDemo = async () => {
    try {
      setProgress({ kind: "progress", processed: 0 });
      const fetchFile = async (name: string) => {
        const r = await fetch(`/api/demo/${name}`);
        if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
        const buffer = await r.arrayBuffer();
        return { name, buffer };
      };
      const buffers = await Promise.all([
        fetchFile("555308.csv"),
        fetchFile("555308_26293.txt"),
      ]);

      const worker = new Worker(new URL("../lib/parser.worker.ts", import.meta.url), { type: "module" });
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<Progress>) => {
        setProgress(e.data);
        if (e.data.kind === "done") {
          worker.terminate();
          workerRef.current = null;
          setTimeout(() => router.push("/viewer"), 800);
        }
        if (e.data.kind === "error") {
          worker.terminate();
          workerRef.current = null;
        }
      };

      const transferables = buffers.map((b) => b.buffer);
      worker.postMessage({ type: "parse", files: buffers, append: false }, transferables);
    } catch (err: any) {
      setProgress({ kind: "error", error: err?.message ?? "erro no demo" });
    }
  };

  return (
    <div className="space-y-4">
      {existing && (
        <div className="card p-4 flex items-center justify-between bg-accent/5 border-accent/30">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-accent" />
            <div>
              <div className="font-semibold">Perfil já carregado: {existing.name}</div>
              <div className="text-sm text-fg-dim">
                {fmt(existing.snpCount)} SNPs · {existing.provider} · {existing.build}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/viewer")}
              className="btn-primary"
            >
              Abrir explorer
            </button>
            <button onClick={clearStored} className="btn-ghost" title="Apagar dados">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInput.current?.click()}
        className={`card cursor-pointer p-8 border-dashed border-2 text-center transition-all ${
          dragOver ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
        }`}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".csv,.txt,.tsv"
          className="hidden"
          onChange={(e) => e.target.files && onFiles(e.target.files)}
        />
        <UploadIcon className="h-10 w-10 mx-auto text-accent mb-3" />
        <div className="font-semibold text-lg mb-1">Arraste seus arquivos de DNA aqui</div>
        <div className="text-sm text-fg-dim">
          Genera (.csv, .txt) · 23andMe (.txt) · AncestryDNA (.txt) — ou clique para escolher
        </div>
        <div className="text-xs text-fg-muted mt-2">
          Você pode subir múltiplos arquivos do mesmo perfil (ex: os dois exports da Genera — eles serão mesclados).
        </div>
      </div>

      {!existing && !progress && (
        <button
          onClick={(e) => { e.stopPropagation(); loadDemo(); }}
          className="w-full card p-4 flex items-center justify-center gap-2 text-sm text-fg-dim hover:text-accent hover:border-accent transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Ou carregar a fixture local (DNA_Caio — CSV + TXT mesclados, ~1,2M SNPs)
        </button>
      )}

      {files.length > 0 && !progress && (
        <div className="card p-4 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-accent" />
                <span className="font-mono">{f.name}</span>
                <span className="text-fg-muted">({(f.size / 1e6).toFixed(1)} MB)</span>
              </div>
              <button
                className="text-fg-muted hover:text-fg text-xs"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                remover
              </button>
            </div>
          ))}
          <div className="pt-2 flex gap-2">
            <button className="btn-primary" onClick={startParse}>
              Processar e explorar
            </button>
            <button className="btn-ghost" onClick={() => setFiles([])}>cancelar</button>
          </div>
        </div>
      )}

      {progress && progress.kind === "progress" && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <span className="text-sm font-medium">Processando…</span>
          </div>
          <div className="text-xs text-fg-dim mb-2">{fmt(progress.processed ?? 0)} SNPs carregados</div>
          <div className="h-1 bg-bg-soft rounded-full overflow-hidden">
            <div className="h-full bg-accent animate-pulse" style={{ width: "100%" }} />
          </div>
        </div>
      )}

      {progress?.kind === "done" && (
        <div className="card p-4 bg-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck2 className="h-4 w-4 text-green-400" />
            <span className="font-semibold">Pronto!</span>
          </div>
          <div className="text-sm text-fg-dim">
            {fmt(progress.processed ?? 0)} SNPs em {((progress.elapsedMs ?? 0) / 1000).toFixed(1)}s ·{" "}
            {progress.provider} · {progress.build}. Redirecionando…
          </div>
        </div>
      )}

      {progress?.kind === "error" && (
        <div className="card p-4 bg-red-500/5 border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="font-semibold">Erro ao processar</span>
          </div>
          <div className="text-sm text-fg-dim font-mono">{progress.error}</div>
        </div>
      )}
    </div>
  );
}
