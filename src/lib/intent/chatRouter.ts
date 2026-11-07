/**
 * What a message typed in the chat composer does (chat-native tools). Pure: the caller passes what's on screen.
 * Order (spec): 1 option command for the active card · 2 content into the active card when it's the latest
 * message · 3 paste detection · "open <tool>" · 4 generator · 5 file intent · 6 help.
 */
import type { CardConfig } from "../toolCards";

export type Route =
  | { kind: "option"; value: string; label: string }
  | { kind: "intoCard" }
  | { kind: "paste" }
  | { kind: "open"; query: string }
  | { kind: "gen" }
  | { kind: "file" }
  | { kind: "help" };

export interface RouteContext {
  /** The active card's config (null when there's none). */
  card: Pick<CardConfig, "opts" | "gen"> | null;
  /** The active card is the latest message in the thread. */
  cardIsLatest: boolean;
  /** A file or paste is loaded in the conversation. */
  hasFile: boolean;
  looksLikeContent: (t: string) => boolean;
  isGenerator: (t: string) => boolean;
  /** The loaded file has a step this text asks for. */
  hasFileStep: (t: string) => boolean;
}

/**
 * The option a message asks for (reference: talkToWidget). Labels over two characters match anywhere in the
 * message ("minify it" → Minify, "4 spaces please" → 4 spaces); short ones must be a whole word ("give me 10").
 */
export function matchOption(text: string, opts: [string, string][] | undefined): [string, string] | null {
  if (!opts) return null;
  const low = text.toLowerCase();
  // longest label first, so "bold italic" wins over "bold" and "10" over "1"
  const sorted = [...opts].sort((a, b) => b[0].length - a[0].length);
  for (const o of sorted) {
    const k = o[0].toLowerCase().replace("¶", "").trim();
    if (!k) continue;
    if (
      k.length > 2 ? low.includes(k) : new RegExp(`(^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(low)
    )
      return o;
  }
  return null;
}

const OPEN =
  /^(?:open|show(?: me)?|use|launch|start|bring up)\s+(?:the\s+|a\s+|an\s+|my\s+)?(.+?)(?:\s+tool)?\s*[.!?]*$/i;

export function routeMessage(text: string, ctx: RouteContext): Route {
  const t = text.trim();
  const content = ctx.looksLikeContent(t);
  // 1. talk to the active card
  if (ctx.card && !ctx.hasFile && !content) {
    const o = matchOption(t, ctx.card.opts);
    if (o) return { kind: "option", value: o[1], label: o[0] };
  }
  // 2. content goes into the active card when it's the latest message
  if (content && ctx.card && ctx.cardIsLatest && !ctx.card.gen) return { kind: "intoCard" };
  // 3. pasted content starts the paste flow
  if (content) return { kind: "paste" };
  // "open regex tester"
  const m = OPEN.exec(t);
  if (m && !(ctx.hasFile && ctx.hasFileStep(t))) return { kind: "open", query: m[1] };
  // 4. generators — but a step for the loaded file wins ("protect it with a password" on a PDF)
  if (!(ctx.hasFile && ctx.hasFileStep(t)) && ctx.isGenerator(t)) return { kind: "gen" };
  // 5. file intent
  if (ctx.hasFile) return { kind: "file" };
  // 6. help
  return { kind: "help" };
}
