"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useUIStore } from "@/lib/store/ui";
import { PANELS } from "@/lib/livePanels";
import { CATS, TOOL_ICON_PATHS, tint } from "@/lib/designTools";

interface LiveToolPanelProps {
  onReturnToChat?: () => void;
}

export function LiveToolPanel({ onReturnToChat }: LiveToolPanelProps) {
  const { panelTool, panelInput, isPanelFull, closePanel, togglePanelFull } = useUIStore();
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [patValue, setPatValue] = useState<string>("");
  const [flValue, setFlValue] = useState<string>("g");
  const [outputHtml, setOutputHtml] = useState<string>("");
  const [copyText, setCopyText] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("Ready");
  const [isBad, setIsBad] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(0.8);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  const runSeqRef = useRef<number>(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const patRef = useRef<HTMLInputElement>(null);

  const P = panelTool ? PANELS[panelTool.slug] : null;

  // Initialize tool state when panelTool changes
  useEffect(() => {
    if (!panelTool || !P) return;

    const opt0 = P.opts ? P.opts[0][1] : null;
    setSelectedOpt(opt0);

    if (P.regex) {
      let pat = P.pat || "";
      let fl = P.flags || "g";
      if (panelInput && /^\/(.+)\/([gimsuy]*)$/.test(panelInput.trim())) {
        const m = /^\/(.+)\/([gimsuy]*)$/.exec(panelInput.trim())!;
        pat = m[1];
        fl = m[2] || "g";
      }
      setPatValue(pat);
      setFlValue(fl);
      setInputValue(panelInput && !/^\/.+\/[gimsuy]*$/.test(panelInput.trim()) ? panelInput : P.sample || "");
    } else if (P.gen) {
      setInputValue("");
    } else {
      setInputValue(panelInput || P.sample || "");
    }

    // Hash deep linking
    try {
      window.history.replaceState(null, "", "#" + panelTool.slug);
    } catch {
      // ignore
    }

    setTimeout(() => {
      if (P.regex) {
        patRef.current?.focus({ preventScroll: true });
      } else if (!P.gen) {
        inputRef.current?.focus({ preventScroll: true });
      }
    }, 400);
  }, [panelTool, panelInput]);

  // Execute panel runner function
  const runCurrent = useCallback(async () => {
    if (!panelTool || !P) return;
    const seq = ++runSeqRef.current;
    const t0 = performance.now();

    const res = await P.run(inputValue, selectedOpt, patValue, flValue);
    if (seq !== runSeqRef.current) return;

    const dt = Math.max(0.1, performance.now() - t0);
    setLatencyMs(dt);
    setOutputHtml(res.html || '<span class="pc">Output appears here as you type…</span>');
    setCopyText(res.copy || "");
    setStatusMsg(res.status || "Ready");
    setIsBad(!!res.bad);

    setIsFlashing(true);
    const tm = setTimeout(() => setIsFlashing(false), 500);
    return () => clearTimeout(tm);
  }, [panelTool, P, inputValue, selectedOpt, patValue, flValue]);

  // Auto-run on changes
  useEffect(() => {
    if (panelTool && P) {
      runCurrent();
    }
  }, [panelTool, P, inputValue, selectedOpt, patValue, flValue, runCurrent]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!panelTool) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runCurrent();
      }
      if (e.key === "Escape" && isPanelFull) {
        togglePanelFull();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelTool, isPanelFull, togglePanelFull, runCurrent]);

  if (!panelTool || !P) return null;

  const cat = CATS[panelTool.c];
  const iconPath = TOOL_ICON_PATHS[panelTool.i] || "M12 2v20M2 12h20";

  const handleCopy = async () => {
    if (!copyText) {
      setToastMsg("Nothing to copy yet");
      setTimeout(() => setToastMsg(null), 1800);
      return;
    }
    try {
      await navigator.clipboard.writeText(copyText);
      setToastMsg("Copied ✓");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = copyText;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setToastMsg("Copied ✓");
      } catch {
        setToastMsg("Select and copy manually");
      }
      ta.remove();
    }
    setTimeout(() => setToastMsg(null), 1800);
  };

  const handleSample = () => {
    if (P.regex) {
      setPatValue(P.pat || "");
      setFlValue(P.flags || "g");
    }
    setInputValue(P.sample || "");
  };

  const handleClear = () => {
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleChat = () => {
    closePanel();
    onReturnToChat?.();
  };

  return (
    <div id="panel" style={{ display: "flex" }} aria-label={`${panelTool.n} workspace`}>
      {/* Header */}
      <div className="pn-head">
        <div className="ti" id="pnIcon" style={{ background: tint(cat.c) }} aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={cat.c}
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={iconPath} />
          </svg>
        </div>
        <div>
          <div className="pn-t" id="pnT">
            {panelTool.n}
          </div>
          <div className="pn-d">
            <span id="pnD">{panelTool.d}</span> ·{" "}
            <span style={{ color: "var(--ok)", fontWeight: 500 }}>Live · on your device</span>
          </div>
        </div>
        <div className="pn-r">
          {P.opts && P.opts.length > 0 && (
            <div className="segs" id="pnOpts">
              {P.opts.map(([label, val]) => (
                <button
                  key={val}
                  type="button"
                  className={`seg ${selectedOpt === val ? "on" : ""}`}
                  onClick={() => setSelectedOpt(val)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="pill sm" id="pnFull" onClick={togglePanelFull}>
            {isPanelFull ? "Collapse" : "⤢ Full screen"}
          </button>
          <button type="button" className="pill sm" id="pnChat" onClick={handleChat}>
            Chat
          </button>
        </div>
      </div>

      {/* Workspace Body */}
      <div className="pn-body">
        {/* Left Input Box */}
        <div className="pn-box">
          <div className="pn-lab">
            <span id="pnInLab">{P.regex ? "Test text" : "Input"}</span>
            {!P.gen && (
              <span className="sp">
                <button type="button" className="mini" id="pnSample" onClick={handleSample}>
                  Sample
                </button>
                <button type="button" className="mini" id="pnClear" onClick={handleClear}>
                  Clear
                </button>
              </span>
            )}
          </div>

          {P.regex && (
            <div id="pnRx" style={{ display: "flex" }}>
              /
              <input
                ref={patRef}
                id="pnPat"
                spellCheck={false}
                placeholder="pattern"
                aria-label="Regex pattern"
                value={patValue}
                onChange={(e) => setPatValue(e.target.value)}
              />
              /
              <input
                id="pnFl"
                spellCheck={false}
                placeholder="flags"
                aria-label="Regex flags"
                value={flValue}
                onChange={(e) => setFlValue(e.target.value)}
              />
            </div>
          )}

          {!P.gen ? (
            <textarea
              ref={inputRef}
              id="pnIn"
              spellCheck={false}
              placeholder="Paste or type here — the output updates as you type"
              aria-label="Tool input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          ) : (
            <div id="pnGen" style={{ display: "flex" }}>
              <div>Choose an option above — or</div>
              <button type="button" className="pill ink" id="pnRegen" onClick={() => runCurrent()}>
                ↻ Generate again
              </button>
            </div>
          )}
        </div>

        {/* Right Output Box */}
        <div className="pn-box">
          <div className="pn-lab">
            Output
            <span className="sp">
              <button type="button" className="mini" id="pnCopy" onClick={handleCopy}>
                Copy
              </button>
            </span>
          </div>
          <div
            id="pnOut"
            className={isFlashing ? "flash" : ""}
            aria-live="polite"
            dangerouslySetInnerHTML={{ __html: outputHtml }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="pn-status" id="pnStatus">
        <i style={{ background: isBad ? "var(--red)" : "var(--ok)" }} />
        <span>{statusMsg}</span>
        <span style={{ marginLeft: "auto" }}>{latencyMs.toFixed(1)} ms · on your device · nothing uploaded</span>
      </div>

      {/* Micro Toast */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "var(--bg)",
            padding: "8px 18px",
            borderRadius: "999px",
            fontSize: "14px",
            fontWeight: 500,
            zIndex: 100,
            boxShadow: "var(--shadow)",
            animation: "msgIn .25s ease both",
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
