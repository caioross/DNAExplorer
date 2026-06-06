import { create } from "zustand";
import type { Profile } from "../types";

type Status = "idle" | "parsing" | "ready" | "error";

interface GenomeState {
  status: Status;
  processed: number;
  elapsedMs: number;
  provider?: string;
  build?: string;
  error?: string;
  profile?: Profile | null;
  setStatus: (s: Status) => void;
  setProgress: (n: number) => void;
  setDone: (p: { provider: string; build: string; elapsedMs: number; profile: Profile }) => void;
  setError: (e: string) => void;
  setProfile: (p: Profile | null) => void;
  reset: () => void;
}

export const useGenomeStore = create<GenomeState>((set) => ({
  status: "idle",
  processed: 0,
  elapsedMs: 0,
  profile: null,
  setStatus: (status) => set({ status }),
  setProgress: (processed) => set({ processed }),
  setDone: ({ provider, build, elapsedMs, profile }) =>
    set({ status: "ready", provider, build, elapsedMs, profile }),
  setError: (error) => set({ status: "error", error }),
  setProfile: (profile) => set({ profile, status: profile ? "ready" : "idle" }),
  reset: () =>
    set({
      status: "idle",
      processed: 0,
      elapsedMs: 0,
      provider: undefined,
      build: undefined,
      error: undefined,
      profile: null,
    }),
}));
