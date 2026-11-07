"use client";
/**
 * The chat thread as typed messages, and the Live Tool Cards inside it (chat-native tools: tools come to the chat,
 * the chat never sends the user to a tool page). A `toolCard` message points at a card by id; the card's own state
 * (input, option, regex fields, expanded) lives here so it survives re-renders and several cards keep their own.
 */
import { create } from "zustand";
import type { FileInfo } from "../fileKind";
import type { PasteItem } from "../engines/detect";
import type { ActionResult } from "../actions";
import type { IntentStep } from "../engines/intent";
import type { PlanFile } from "../plan/run";

export interface ThreadMessage {
  id: string;
  type: "bot" | "user" | "file" | "paste" | "chips" | "plan" | "results" | "resultCard" | "continue" | "toolCard";
  html?: string;
  file?: FileInfo;
  pasteItem?: PasteItem;
  chips?: [string, string][];
  onPickChip?: (cmd: string) => void;
  planSteps?: IntentStep[];
  /** Steps whose tool runs as its own card: continue there with the plan's latest output. */
  continueIn?: { slug: string; name: string; file: PlanFile }[];
  actionResult?: ActionResult;
  results?: Array<{ name: string; size: number; url?: string; gain: number; m?: string; blob?: Blob; real?: boolean }>;
  /** For `toolCard` messages. */
  cardId?: string;
}

export interface ToolCardState {
  id: string;
  toolId: string;
  input: string;
  option: string | null;
  pattern: string;
  flags: string;
  expanded: boolean;
}

/** A request to open a tool in the chat, from anywhere (⌘K, Explore grid, chips, deep links, /slug routes). */
export interface OpenRequest {
  slug: string;
  input: string;
  option?: string | null;
  /** Increments on every request, so the same tool can be opened twice. */
  n: number;
}

type Updater<T> = T | ((prev: T) => T);

interface WorkspaceState {
  messages: ThreadMessage[];
  setMessages: (u: Updater<ThreadMessage[]>) => void;
  cards: Record<string, ToolCardState>;
  /** Target for chat commands and pastes: the last card opened or used. */
  activeCardId: string | null;
  addCard: (c: ToolCardState) => void;
  updateCard: (id: string, patch: Partial<Omit<ToolCardState, "id" | "toolId">>) => void;
  setActiveCard: (id: string | null) => void;
  openRequest: OpenRequest | null;
  requestOpen: (slug: string, input?: string, option?: string | null) => void;
  clearOpenRequest: () => void;
  /** "+ New": an empty thread and no cards. */
  reset: () => void;
}

let seq = 0;

export const useWorkspace = create<WorkspaceState>((set) => ({
  messages: [],
  setMessages: (u) => set((s) => ({ messages: typeof u === "function" ? u(s.messages) : u })),
  cards: {},
  activeCardId: null,
  addCard: (c) => set((s) => ({ cards: { ...s.cards, [c.id]: c }, activeCardId: c.id })),
  updateCard: (id, patch) =>
    set((s) => (s.cards[id] ? { cards: { ...s.cards, [id]: { ...s.cards[id], ...patch } } } : {})),
  setActiveCard: (activeCardId) => set({ activeCardId }),
  openRequest: null,
  requestOpen: (slug, input = "", option) => set({ openRequest: { slug, input, option, n: ++seq } }),
  clearOpenRequest: () => set({ openRequest: null }),
  reset: () => set({ messages: [], cards: {}, activeCardId: null }),
}));

/** The active card, but only when it's the latest message in the thread (then a paste goes into it). */
export function liveCard(): ToolCardState | null {
  const { messages, cards, activeCardId } = useWorkspace.getState();
  const last = messages[messages.length - 1];
  if (!activeCardId || last?.type !== "toolCard" || last.cardId !== activeCardId) return null;
  return cards[activeCardId] ?? null;
}
