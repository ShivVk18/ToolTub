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
  openPalette: () => void;
  closePalette: () => void;
  openVoiceSheet: () => void;
  closeVoiceSheet: () => void;
  setActiveTool: (tool: ToolItem | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  homeActions: null,
  setHomeActions: (homeActions) => set({ homeActions }),
  isPaletteOpen: false,
  isVoiceSheetOpen: false,
  activeTool: null,
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
}));
