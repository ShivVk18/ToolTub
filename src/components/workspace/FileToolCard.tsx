"use client";
/**
 * A file tool (Merge PDF, Crop, Video to GIF, …) as a card in the chat thread. The tool's own UI (dropzone,
 * settings, run, results) renders inside the card, so nothing ever navigates away from the conversation.
 * Results offer "Send to next tool", which opens the next tool as another card in the same thread.
 */
import { useMemo } from "react";
import { ToolUI } from "@/tools";
import { catalog } from "@/registry/catalog";
import { toolBySlug } from "@/lib/designTools";
import { useWorkspace } from "@/lib/store/workspace";
import { CardIcon, useExpand } from "./LiveToolCard";

const mimeMatches = (actual: string, pattern: string) =>
  pattern === actual || (pattern.endsWith("/*") && actual.startsWith(pattern.slice(0, -1)));

/** Tools an output of `slug` can feed (same rule as the registry's canChain), from the client-safe catalog. */
export function nextTools(slug: string) {
  const a = catalog.find((t) => t.slug === slug);
  if (!a) return [];
  return catalog
    .filter(
      (b) =>
        b.slug !== slug &&
        b.status !== "planned" &&
        a.outputs.some((o) => b.inputs.some((i) => mimeMatches(o, i) || mimeMatches(i, o))),
    )
    .slice(0, 6)
    .map((b) => ({ slug: b.slug, name: b.home?.name ?? b.name }));
}

export function FileToolCard({ id }: { id: string }) {
  const card = useWorkspace((s) => s.cards[id]);
  const setActiveCard = useWorkspace((s) => s.setActiveCard);
  const { expanded, toggle } = useExpand(id);
  const tool = card ? toolBySlug(card.toolId) : undefined;
  const core = card ? catalog.find((t) => t.slug === card.toolId) : undefined;
  const next = useMemo(() => (card ? nextTools(card.toolId) : []), [card]);
  if (!card || !tool || !core) return null;
  const server = core.processing.where === "own-server";
  return (
    <div
      className={`card tw tw-file${expanded ? " big" : ""}`}
      role="group"
      aria-label={`${tool.n}, live tool`}
      data-testid="tool-card"
      data-tool={card.toolId}
      onPointerDown={() => setActiveCard(id)}
    >
      <div className="tw-head">
        <CardIcon slug={card.toolId} />
        <div className="tw-meta">
          <div className="tw-t">{tool.n}</div>
          <div className="pn-d">
            {tool.d} ·{" "}
            <span style={{ color: "var(--g-c)", fontWeight: 500 }}>
              {server ? "● Private server · deleted after 1 hour" : "● Live · on your device"}
            </span>
          </div>
        </div>
        <div className="pn-r">
          <button type="button" className="mini tw-exp" onClick={toggle} aria-expanded={expanded}>
            {expanded ? "⤡ Collapse" : "⤢ Expand"}
          </button>
        </div>
      </div>
      <div className="tw-tool">
        <ToolUI slug={card.toolId} next={next} preset={card.option ? safePreset(card.option) : undefined} />
      </div>
    </div>
  );
}

/** A long-tail landing page's preset (e.g. {"targetKB":50}) travels in the card's option as JSON. */
function safePreset(s: string) {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? (v as Record<string, string | number | boolean>) : undefined;
  } catch {
    return undefined;
  }
}
