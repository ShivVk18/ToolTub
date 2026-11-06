"use client";

import { TOOL_COUNTS } from "@/lib/designTools";
import { useKlip } from "@/lib/store/klip";
import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { KINDS, SAMPLES } from "@/lib/fileKind";
import { genParse } from "@/lib/engines/generators";
import { looksLikeContent } from "@/lib/engines/detect";
import { markHTML } from "@/lib/engines/intent";
import { addLoop } from "@/lib/motion/animation";

interface HeroProps {
  onPickSample: (sampleKey: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onOrbSlotClick: () => void;
  onPasteText?: (text: string) => void;
  onSubmitAsk?: (text: string) => void;
  hintText?: string;
}

const TYPEWRITER_EXAMPLES = [
  "generate 10 UUIDs",
  "compress to under 2 MB",
  "is this JWT expired?",
  "remove the background",
  "sha256 of hello",
  "format this JSON",
  "convert to webp",
  "lorem ipsum, 3 paragraphs",
];

export function Hero({ onPickSample, onOrbSlotClick, onPasteText, onSubmitAsk, hintText }: HeroProps) {
  const [askValue, setAskValue] = useState("");
  const [placeholder, setPlaceholder] = useState("Try “generate 10 UUIDs” — or paste anything");
  const [mirrorHtml, setMirrorHtml] = useState("");
  const [mounted, setMounted] = useState(false);

  const askInputRef = useRef<HTMLInputElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const squigRef = useRef<SVGSVGElement>(null);
  const squigPathRef = useRef<SVGPathElement>(null);

  // Recents come from the persisted store but render only after mount, so server and client HTML match (B5, B8).
  const recentFiles = useKlip((st) => st.recentFiles);
  useEffect(() => {
    setMounted(true);
  }, []);
  const recents = mounted ? recentFiles.slice(0, 3) : [];

  // Hand-drawn squiggle underline placement
  const placeSquiggle = () => {
    if (!h1Ref.current || !squigRef.current || !squigPathRef.current) return;
    const ws = h1Ref.current.querySelectorAll(".l2 .w");
    if (ws.length < 3) return;

    // ws[1] is "just", ws[2] is "say". Layout offsets (relative to the h1) ignore the words' entrance
    // transform, so the result doesn't depend on when this runs. The reference measures while the words
    // are still shifted down by 0.35em and then subtracts 16 px; reproduce that resting position.
    const a = ws[1] as HTMLElement;
    const b = ws[2] as HTMLElement;
    const fontSize = parseFloat(getComputedStyle(h1Ref.current).fontSize) || 0;
    const sq = squigRef.current;
    const w = b.offsetLeft + b.offsetWidth - a.offsetLeft + 12;

    sq.style.left = `${a.offsetLeft - 6}px`;
    sq.style.top = `${a.offsetTop + a.offsetHeight + 0.35 * fontSize - 16}px`;
    sq.style.width = `${w}px`;
    sq.setAttribute("viewBox", `0 0 ${w} 26`);

    const p = `M4 16 C ${w * 0.18} 6, ${w * 0.34} 22, ${w * 0.5} 13 S ${w * 0.82} 5, ${w - 4} 15`;
    const sqP = squigPathRef.current;
    sqP.setAttribute("d", p);
    const L = sqP.getTotalLength();
    sqP.style.strokeDasharray = String(L);
    sqP.style.setProperty("--L", String(L));
    sq.classList.add("go");
  };

  useLayoutEffect(() => {
    if (typeof document !== "undefined" && "fonts" in document) {
      document.fonts.ready.then(() => {
        placeSquiggle();
      });
    } else {
      placeSquiggle();
    }
    window.addEventListener("resize", placeSquiggle);
    return () => window.removeEventListener("resize", placeSquiggle);
  }, []);

  // Typewriter placeholder animation loop
  useEffect(() => {
    let lastPh = "";
    const cleanup = addLoop(
      (t) => {
        if (askValue) return;
        const cyc = 3.6;
        const i = Math.floor(t / cyc) % TYPEWRITER_EXAMPLES.length;
        const lt = t % cyc;
        const s = TYPEWRITER_EXAMPLES[i];
        const n =
          lt < 1.5
            ? Math.floor((lt / 1.5) * s.length)
            : lt < 3.0
              ? s.length
              : Math.floor((1 - (lt - 3.0) / 0.6) * s.length);
        const cursor = lt < 3.0 && Math.floor(t * 2.6) % 2 ? "▍" : "";
        const ph = `Try “${s.slice(0, Math.max(0, n))}${cursor}” — or paste anything`;
        if (ph !== lastPh) {
          setPlaceholder(ph);
          lastPh = ph;
        }
      },
      { motion: true },
    );
    return cleanup;
  }, [askValue]);

  // Live syntax highlight for Hero ask input
  const handleAskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAskValue(val);

    const parsed = genParse(val);
    const spans = parsed?.spans || [];
    setMirrorHtml(markHTML(val, spans, true) + "&#8203;");
  };

  const handleAskSubmit = () => {
    const v = askValue.trim();
    if (!v) return;
    setAskValue("");
    setMirrorHtml("");

    if (looksLikeContent(v)) {
      onPasteText?.(v);
    } else {
      onSubmitAsk?.(v);
    }
  };

  const line1Words = ["Drop", "it.", "Paste", "it."];
  const line2Words = ["Or", "just", "say", "what", "you", "need."];

  return (
    <section id="hero" aria-label="Drop a file">
      <div className="eyebrow">
        <b>✦</b> {TOOL_COUNTS.live} tools live · {TOOL_COUNTS.total - TOOL_COUNTS.live} on the way · Free forever
      </div>

      <h1 ref={h1Ref} id="h1">
        <span className="l1">
          {line1Words.map((w, i) => (
            <React.Fragment key={w + i}>
              <span className="w" style={{ animationDelay: `${0.15 + i * 0.07}s` }}>
                {w}
              </span>{" "}
            </React.Fragment>
          ))}
        </span>
        <span className="l2">
          {line2Words.map((w, i) => (
            <React.Fragment key={w + i}>
              <span className="w" style={{ animationDelay: `${0.15 + 0.32 + i * 0.07}s` }}>
                {w}
              </span>{" "}
            </React.Fragment>
          ))}
        </span>
        <svg id="squig" ref={squigRef} aria-hidden="true">
          <defs>
            <linearGradient id="sqg" x1="0" x2="1">
              <stop offset="0" stopColor="#7C6BFF" />
              <stop offset="0.55" stopColor="#FF9C82" />
              <stop offset="1" stopColor="#FFD27A" />
            </linearGradient>
          </defs>
          <path id="squigP" ref={squigPathRef} />
        </svg>
      </h1>

      <div
        id="orbSlot"
        role="button"
        tabIndex={0}
        aria-label="Choose a file"
        onClick={onOrbSlotClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOrbSlotClick();
          }
        }}
      />

      <p id="hint" className="hint">
        {hintText || "Drop a file, paste text or code, or just ask:"}
      </p>

      {/* Hero Ask Bar */}
      <div className="ask" role="search">
        <div className="askf">
          <div id="heroMirror" aria-hidden="true" dangerouslySetInnerHTML={{ __html: mirrorHtml }} />
          <input
            ref={askInputRef}
            id="heroAsk"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            aria-label="Ask KlipKit or paste something"
            value={askValue}
            onChange={handleAskChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAskSubmit();
              }
            }}
          />
        </div>
        <button
          type="button"
          id="heroGo"
          className={askValue.trim() ? "on" : ""}
          aria-label="Go"
          onClick={handleAskSubmit}
        >
          ↵
        </button>
      </div>

      {/* Sample chips + Dashed alt chips (B6) */}
      <div id="samples" className="samples">
        {Object.entries(SAMPLES)
          .filter(([k]) => ["pdf", "image", "audio"].includes(k))
          .map(([k, s]) => (
            <button key={k} type="button" className="chip" data-sample={k} onClick={(e) => onPickSample(k, e)}>
              <span className="dot" style={{ background: KINDS[k as keyof typeof KINDS]?.c }} />
              {s.label}
            </button>
          ))}

        <span className="sep" aria-hidden="true" />

        {/* Dashed Alt Chips */}
        <button
          type="button"
          data-alt="0"
          className="chip alt"
          onClick={() => onPasteText?.('{"user":{"id":42,"name":"Asha Rao","roles":["admin"],"active":true}}')}
        >
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>&#123; &#125;</span> Paste JSON
        </button>

        <button
          type="button"
          data-alt="1"
          className="chip alt"
          onClick={() =>
            onPasteText?.(
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFzaGEgUmFvIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
            )
          }
        >
          <span style={{ color: "#F2734F", fontWeight: 600 }}>JWT</span> Paste a token
        </button>

        <button type="button" data-alt="2" className="chip alt" onClick={() => onSubmitAsk?.("generate 10 uuids")}>
          <span style={{ color: "var(--accent)" }}>✦</span> Generate UUIDs
        </button>
      </div>

      {/* Recents row - client only, max 3 items, ellipsis max 220px (B8) */}
      <div id="recents" className="recents">
        {mounted && recents.length > 0 && (
          <>
            <span>Recent:</span>
            {recents.slice(0, 3).map((r) => (
              <span
                key={r}
                className="r"
                style={{
                  maxWidth: "220px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  verticalAlign: "middle",
                }}
                title={r}
              >
                {r}
              </span>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
