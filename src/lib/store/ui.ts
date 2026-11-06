"use client";

import { create } from "zustand";
import type { ToolItem } from "../designTools";

/** Home-stage actions other components may trigger (registered by HomeStage while it is mounted). */
export interface HomeActions {
  /** Run the Pro voice demo. */
  voice: () => void;
  /** Drop the currently loaded file or paste. */
  clearInput: () => void;
}

interface UIState {
  homeActions: HomeActions | null;
  setHomeActions: (a: HomeActions | null) => void;
  isPaletteOpen: boolean;
  isVoiceSheetOpen: boolean;
  activeTool: ToolItem | null;
  panelTool: ToolItem | null;
  panelInput: string;
  isPanelFull: boolean;
  openPalette: () => void;
  closePalette: () => void;
  openVoiceSheet: () => void;
  closeVoiceSheet: () => void;
  setActiveTool: (tool: ToolItem | null) => void;
  openPanel: (tool: ToolItem, initialInput?: string) => void;
  closePanel: () => void;
  togglePanelFull: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  homeActions: null,
  setHomeActions: (homeActions) => set({ homeActions }),
  isPaletteOpen: false,
  isVoiceSheetOpen: false,
  activeTool: null,
  panelTool: null,
  panelInput: "",
  isPanelFull: false,
  openPalette: () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("klipkit:search"));
    }
    set({ isPaletteOpen: true });
  },
  closePalette: () => set({ isPaletteOpen: false }),
  openVoiceSheet: () => set({ isVoiceSheetOpen: true }),
  closeVoiceSheet: () => set({ isVoiceSheetOpen: false }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  openPanel: (tool, initialInput = "") => {
    if (typeof document !== "undefined") {
      document.body.classList.add("is-work", "panel-open");
    }
    set({ panelTool: tool, panelInput: initialInput });
  },
  closePanel: () => {
    if (typeof document !== "undefined") {
      document.body.classList.remove("panel-open", "panel-full");
      try {
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      } catch {
        // ignore
      }
    }
    set({ panelTool: null, panelInput: "", isPanelFull: false });
  },
  togglePanelFull: () =>
    set((state) => {
      const next = !state.isPanelFull;
      if (typeof document !== "undefined") {
        document.body.classList.toggle("panel-full", next);
      }
      return { isPanelFull: next };
    }),
}));
