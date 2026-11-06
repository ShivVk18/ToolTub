"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** One artifact passed between tools in a chain. Kept in memory only, never persisted or uploaded. */
export interface Artifact {
  name: string;
  type: string; // MIME, matched against the next tool's IOType inputs
  blob?: Blob;
  text?: string;
}

interface KlipState {
  /** Recently used tool slugs (tool pages). */
  recents: string[];
  /** Recently dropped file names on the home page (max 5). */
  recentFiles: string[];
  favourites: string[];
  /** Hand-off for "Send to next tool": not persisted. */
  handoff: { from: string; items: Artifact[] } | null;
  visit: (slug: string) => void;
  addRecentFile: (name: string) => void;
  toggleFavourite: (slug: string) => void;
  setHandoff: (h: KlipState["handoff"]) => void;
  takeHandoff: () => KlipState["handoff"];
}

/** Older builds kept recent file names under "kk.recents"; read them once into the store and drop the key. */
function takeLegacyRecentFiles(): string[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem("kk.recents");
    if (!raw) return [];
    localStorage.removeItem("kk.recents");
    const names = JSON.parse(raw);
    return Array.isArray(names) ? names.filter((x) => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

export const useKlip = create<KlipState>()(
  persist(
    (set, get) => ({
      recents: [],
      recentFiles: takeLegacyRecentFiles(),
      favourites: [],
      handoff: null,
      addRecentFile: (name) =>
        set((s) => ({ recentFiles: [name, ...s.recentFiles.filter((x) => x !== name)].slice(0, 5) })),
      visit: (slug) => set((s) => ({ recents: [slug, ...s.recents.filter((x) => x !== slug)].slice(0, 8) })),
      toggleFavourite: (slug) =>
        set((s) => ({
          favourites: s.favourites.includes(slug) ? s.favourites.filter((x) => x !== slug) : [slug, ...s.favourites],
        })),
      setHandoff: (handoff) => set({ handoff }),
      takeHandoff: () => {
        const h = get().handoff;
        set({ handoff: null });
        return h;
      },
    }),
    {
      name: "klipkit",
      partialize: (s) => ({ recents: s.recents, recentFiles: s.recentFiles, favourites: s.favourites }),
    },
  ),
);
