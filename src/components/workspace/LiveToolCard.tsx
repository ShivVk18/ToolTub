"use client";
/**
 * A Live Tool Card: a chat message that IS the tool (reference: toolWidget / runW / setOpt). Input on the left,
 * output on the right, re-rendered on every keystroke by the same pure engine the chat uses (lib/toolCards.ts).
 * Its state lives in the workspace store, so several cards keep their own and chat commands can drive it.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { CARDS, type CardRunResult } from "@/lib/toolCards";
import { CATS, TOOL_ICON_PATHS, tint, toolBySlug } from "@/lib/designTools";
import { useWorkspace } from "@/lib/store/workspace";

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function CardIcon({ slug, size = 19 }: { slug: string; size?: number }) {
  const t = toolBySlug(slug);
  if (!t) return null;
  const c = CATS[t.c].c;
  return (
    <div className="ti" style={{ background: tint(c) }} aria-hidden>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={TOOL_ICON_PATHS[t.i] || TOOL_ICON_PATHS.code} />
      </svg>
    </div>
  );
}

/** Expand grows the card in place; the chat column widens while any card is expanded (reference: body.wide). */
export function useExpand(id: string) {
  const expanded = useWorkspace((s) => s.cards[id]?.expanded ?? false);
  const updateCard = useWorkspace((s) => s.updateCard);
  useEffect(() => {
    const any = Object.values(useWorkspace.getState().cards).some((c) => c.expanded);
    document.body.classList.toggle("wide", any);
  }, [expanded]);
  useEffect(
    () => () => {
      // a removed card can't keep the column wide
      const any = Object.values(useWorkspace.getState().cards).some((c) => c.expanded && c.id !== id);
      document.body.classList.toggle("wide", any);
    },
    [id],
  );
  return { expanded, toggle: () => updateCard(id, { expanded: !expanded }) };
}

export function LiveToolCard({ id, onCopy }: { id: string; onCopy: (s: string) => void }) {
  const card = useWorkspace((s) => s.cards[id]);
  const updateCard = useWorkspace((s) => s.updateCard);
  const setActiveCard = useWorkspace((s) => s.setActiveCard);
  const { expanded, toggle } = useExpand(id);
  const [r, setR] = useState<CardRunResult & { ms?: number }>({});
  const [flash, setFlash] = useState(0);
  const runSeq = useRef(0);
  const P = card ? CARDS[card.toolId] : undefined;
  const tool = card ? toolBySlug(card.toolId) : undefined;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const patRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async () => {
    if (!card || !P) return;
    const my = ++runSeq.current;
    const t0 = now();
    const res = await P.run(card.input, card.option, card.pattern, card.flags);
    if (my !== runSeq.current) return;
    setR({ ...res, ms: now() - t0 });
    setFlash((f) => f + 1);
  }, [card, P]);

  useEffect(() => {
    run();
  }, [run]);

  // focus the field people type in first, as the reference does
  useEffect(() => {
    const t = setTimeout(() => (patRef.current ?? inputRef.current)?.focus({ preventScroll: true }), 450);
    return () => clearTimeout(t);
  }, []);

  if (!card || !P || !tool) return null;
  const set = (patch: Partial<typeof card>) => updateCard(id, patch);
  const ms = r.ms ?? 0;

  return (
    <div
      className={`card tw${expanded ? " big" : ""}`}
      role="group"
      aria-label={`${tool.n}, live tool`}
      data-testid="tool-card"
      data-tool={card.toolId}
      onFocusCapture={() => setActiveCard(id)}
      onPointerDown={() => setActiveCard(id)}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          run();
        }
      }}
    >
      <div className="tw-head">
        <CardIcon slug={card.toolId} />
        <div className="tw-meta">
          <div className="tw-t">{tool.n}</div>
          <div className="pn-d">
            {tool.d} · <span style={{ color: "var(--g-c)", fontWeight: 500 }}>● Live · on your device</span>
          </div>
        </div>
        <div className="pn-r">
          {P.opts && (
            <div className="segs" role="group" aria-label={`${tool.n} options`}>
              {P.opts.map(([label, v]) => (
                <button
                  key={v}
                  type="button"
                  className={`seg${card.option === v ? " on" : ""}`}
                  aria-pressed={card.option === v}
                  onClick={() => set({ option: v })}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="mini tw-exp" onClick={toggle} aria-expanded={expanded}>
            {expanded ? "⤡ Collapse" : "⤢ Expand"}
          </button>
        </div>
      </div>
      <div className="tw-body">
        <div className="pn-box">
          <div className="pn-lab">
            <span>{P.regex ? "Test text" : P.gen ? "Generate" : "Input"}</span>
            <span className="sp">
              {P.gen ? (
                <button type="button" className="mini tw-regen" onClick={run}>
                  ↻ Again
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="mini tw-sample"
                    onClick={() =>
                      set({
                        input: P.sample ?? "",
                        ...(P.regex ? { pattern: P.pat ?? "", flags: P.flags ?? "g" } : {}),
                      })
                    }
                  >
                    Sample
                  </button>
                  <button
                    type="button"
                    className="mini tw-clear"
                    onClick={() => {
                      set({ input: "" });
                      inputRef.current?.focus();
                    }}
                  >
                    Clear
                  </button>
                </>
              )}
            </span>
          </div>
          {P.regex && (
            <div className="tw-rx">
              /
              <input
                ref={patRef}
                className="tw-pat"
                spellCheck={false}
                aria-label="Pattern"
                value={card.pattern}
                onChange={(e) => set({ pattern: e.target.value })}
              />
              /
              <input
                className="tw-fl"
                spellCheck={false}
                aria-label="Flags"
                value={card.flags}
                onChange={(e) => set({ flags: e.target.value })}
              />
            </div>
          )}
          {P.gen ? (
            <div className="tw-gen">
              Fresh values every time — made on your device.
              <br />
              Pick an option above, or say it in the chat.
            </div>
          ) : (
            <textarea
              ref={inputRef}
              className="tw-in"
              spellCheck={false}
              placeholder="Paste or type — the output updates as you type"
              aria-label={`${tool.n} input`}
              value={card.input}
              onChange={(e) => set({ input: e.target.value })}
            />
          )}
        </div>
        <div className="pn-box">
          <div className="pn-lab">
            Output
            <span className="sp">
              <button type="button" className="mini tw-copy" onClick={() => onCopy(r.copy ?? "")}>
                Copy
              </button>
            </span>
          </div>
          <div
            key={flash}
            className={`tw-out${flash > 1 ? " flash" : ""}`}
            aria-live="polite"
            aria-label={`${tool.n} output`}
            data-copy={r.copy ?? ""}
            dangerouslySetInnerHTML={{ __html: r.html || '<span class="pc">Output appears here as you type…</span>' }}
          />
        </div>
      </div>
      <div className="pn-status" data-testid="tool-card-status">
        <i style={{ background: r.bad ? "var(--red)" : "var(--ok)" }} />
        {r.status || "Ready"}
        <span style={{ marginLeft: "auto" }}>{ms.toFixed(1)} ms · nothing uploaded</span>
      </div>
    </div>
  );
}
