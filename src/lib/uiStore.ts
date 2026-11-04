'use client';

import { create } from 'zustand';
import type { ToolItem } from './designTools';

interface UIState {
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
  isPaletteOpen: false,
  isVoiceSheetOpen: false,
  activeTool: null,
  panelTool: null,
  panelInput: '',
  isPanelFull: false,
  openPalette: () => set({ isPaletteOpen: true }),
  closePalette: () => set({ isPaletteOpen: false }),
  openVoiceSheet: () => set({ isVoiceSheetOpen: true }),
  closeVoiceSheet: () => set({ isVoiceSheetOpen: false }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  openPanel: (tool, initialInput = '') => {
    if (typeof document !== 'undefined') {
      document.body.classList.add('is-work', 'panel-open');
    }
    set({ panelTool: tool, panelInput: initialInput });
  },
  closePanel: () => {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('panel-open', 'panel-full');
      try {
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch {
        // ignore
      }
    }
    set({ panelTool: null, panelInput: '', isPanelFull: false });
  },
  togglePanelFull: () =>
    set((state) => {
      const next = !state.isPanelFull;
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('panel-full', next);
      }
      return { isPanelFull: next };
    }),
}));
