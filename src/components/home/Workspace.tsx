"use client";

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import {
  type FileInfo,
  KINDS,
  SUG,
  NEXT,
  describe as describeFile,
  meta as metaFile,
  fmtSize,
  kindOf,
} from "@/lib/fileKind";
import { type PasteItem, PSUG, pasteAct, looksLikeContent } from "@/lib/engines/detect";
import { PT_TILE, PT_COLOR, ACT, runGen, ActionResult } from "@/lib/actions";
import { genParse } from "@/lib/engines/generators";
import { wordStats } from "@/lib/engines/text";
import { parse, markHTML, esc as escHtml, type IntentStep } from "@/lib/engines/intent";
import { tween, wait, ease } from "@/lib/motion/animation";
import { LiveToolCard } from "@/components/workspace/LiveToolCard";
import { FileToolCard } from "@/components/workspace/FileToolCard";
import { CARDS } from "@/lib/toolCards";
import { routeMessage } from "@/lib/intent/chatRouter";
import { createToolSearch } from "@/lib/search";
import { useWorkspace, liveCard, type ThreadMessage } from "@/lib/store/workspace";
import { toolBySlug } from "@/lib/designTools";
import { catalog } from "@/registry/catalog";
import { planFor, stepTag, type StepPlan } from "@/lib/engines/plan";
import { runStep, type PlanFile } from "@/lib/plan/run";
import { useKlip } from "@/lib/store/klip";

export interface WorkspaceProps {
  file: FileInfo | null;
  /** A request from the hero ask bar: sent as if typed into the composer. */
  pendingAsk?: { text: string; n: number } | null;
  pasteData?: PasteItem | null;
  contextToolName?: string | null;
  contextToolIcon?: React.ReactNode;
  onNew: () => void;
  onOpenVoice: () => void;
  isListening?: boolean;
  voiceTranscript?: string;
  onSetStatus?: (status: { text: string; color?: string; busy?: boolean }) => void;
  /** Content typed into the composer starts the paste flow (the same path as a paste). */
  onPasteIn?: (text: string) => void;
}

type MessageItem = ThreadMessage;

/** "open regex tester": fuzzy search over the tools that work (card tools and tools with their own UI). */
const searchTools = createToolSearch(
  catalog
    .filter((t) => t.status !== "planned" || t.card)
    .map((t) => ({
      slug: t.slug,
      name: t.home?.name ? `${t.name} ${t.home.name}` : t.name,
      tagline: t.tagline,
      hub: t.hub,
      synonyms: t.synonyms,
      available: true,
      category: t.category,
    })),
);
const findTool = (q: string) => searchTools(q, 1)[0]?.slug;

export function Workspace({
  file,
  pendingAsk,
  pasteData,
  contextToolName,
  contextToolIcon,
  onNew,
  onOpenVoice,
  isListening = false,
  voiceTranscript = "",
  onSetStatus,
  onPasteIn,
}: WorkspaceProps) {
  const messages = useWorkspace((st) => st.messages);
  const setMessages = useWorkspace((st) => st.setMessages);
  const [inputText, setInputText] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const setHandoff = useKlip((st) => st.setHandoff);
  const [statusText, setStatusText] = useState("Ready · runs on your device");
  const [statusColor, setStatusColor] = useState("var(--ok)");

  const threadRef = useRef<HTMLDivElement>(null);
  const cmpRef = useRef<HTMLTextAreaElement>(null);

  // Grow the composer with its text, like the reference: reset to one line, then fit (max 140 px).
  useLayoutEffect(() => {
    const el = cmpRef.current;
    if (!el) return;
    el.style.overflowY = "hidden";
    el.style.height = "46px";
    // Empty: stay one line (Chrome counts the wrapped placeholder in scrollHeight).
    if (!inputText) return;
    el.style.height = `${Math.min(140, el.scrollHeight)}px`;
    if (el.scrollHeight > 140) el.style.overflowY = "auto";
  }, [inputText]);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const currentFileRef = useRef<FileInfo | null>(file);
  const currentPasteRef = useRef<PasteItem | null>(pasteData || null);

  useEffect(() => {
    currentFileRef.current = file;
  }, [file]);

  useEffect(() => {
    currentPasteRef.current = pasteData || null;
  }, [pasteData]);

  const updateStatus = (txt: string, color: string = "var(--ok)", busy: boolean = false) => {
    setStatusText(txt);
    setStatusColor(color);
    setIsBusy(busy);
    onSetStatus?.({ text: txt, color, busy });
  };

  const scrollThreadToBottom = () => {
    if (!threadRef.current) return;
    const el = threadRef.current;
    const to = el.scrollHeight - el.clientHeight;
    const from = el.scrollTop;
    if (to <= from + 2) return;
    tween(
      650,
      (p) => {
        el.scrollTop = from + (to - from) * p;
      },
      ease.io,
    );
  };

  const toast = (text: string) => {
    const el = document.getElementById("toast");
    if (el) {
      el.textContent = text;
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 2600);
    }
  };

  const copyText = async (s?: string) => {
    if (!s) return;
    try {
      await navigator.clipboard.writeText(s);
      toast("Copied ✓");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = s;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast("Copied ✓");
      } catch {
        toast("Select and copy manually");
      }
      ta.remove();
    }
  };

  // ---- Tools come to the chat (reference: openPanel / toolWidget): a card appended to the thread ----
  const addCard = useWorkspace((st) => st.addCard);
  const openRequest = useWorkspace((st) => st.openRequest);
  const clearOpenRequest = useWorkspace((st) => st.clearOpenRequest);
  const openCard = useCallback(async (slug: string, input = "", option?: string | null) => {
    const tool = toolBySlug(slug);
    if (!tool) return;
    const P = CARDS[slug];
    // From the hero (or after "+ New"), the card starts a fresh thread, as in the reference.
    if (!document.body.classList.contains("is-work")) useWorkspace.getState().reset();
    updateStatus("Thinking…", "var(--accent)", true);
    await wait(360);
    updateStatus("Ready · runs on your device", "var(--ok)", false);
    const core = catalog.find((t) => t.slug === slug);
    const msg = P
      ? P.gen
        ? `Here's the <b>${escHtml(tool.n)}</b> — pick an option, or just tell me (“${escHtml((P.opts?.[2] ?? P.opts?.[0])?.[0] ?? "again")}”).`
        : `Here's the <b>${escHtml(tool.n)}</b>, right here in the chat. ${input ? "I loaded your content — " : ""}Type or paste in it; it updates live.${
            P.opts
              ? `<span class="sub">You can keep talking to it too — try “${escHtml(P.opts[P.opts.length - 1][0])}”.</span>`
              : ""
          }`
      : `Here's <b>${escHtml(tool.n)}</b>, right here in the chat. ${escHtml(tool.d)}.<span class="sub">${
          core?.processing.where === "own-server"
            ? "Your file goes to KlipKit's own server only and is deleted within an hour."
            : "Everything stays on your device."
        }</span>`;
    let pattern = P?.pat ?? "";
    let flags = P?.flags ?? "g";
    let inp = input;
    const rx = P?.regex ? /^\/(.+)\/([gimsuy]*)$/.exec(input.trim()) : null;
    if (rx) [pattern, flags, inp] = [rx[1], rx[2] || "g", P!.sample ?? ""];
    if (P && !P.gen && !inp) inp = P.sample ?? "";
    const opt = P?.opts ? (option && P.opts.some((o) => o[1] === option) ? option : P.opts[0][1]) : (option ?? null);
    const id = `card-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    addCard({ id, toolId: slug, input: P?.gen ? "" : inp, option: opt, pattern, flags, expanded: false });
    setMessages((prev) => [...prev, { id: "bot-" + id, type: "bot", html: msg }, { id, type: "toolCard", cardId: id }]);
    // The URL stays on the chat: on the home page it only gains #slug (a /slug page keeps its path).
    try {
      if (location.pathname === "/") history.replaceState(null, "", "#" + slug);
    } catch {
      // ignore
    }
    setTimeout(scrollThreadToBottom, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!openRequest) return;
    clearOpenRequest();
    openCard(openRequest.slug, openRequest.input, openRequest.option);
  }, [openRequest, clearOpenRequest, openCard]);

  // When voice transcript streams in
  useEffect(() => {
    if (voiceTranscript) {
      setInputText(voiceTranscript);
    }
  }, [voiceTranscript]);

  // Handle Paste Item landing
  useEffect(() => {
    if (!pasteData) return;
    const f = pasteData;

    const prev =
      f.text.trim().split("\n").slice(0, 4).join("\n").slice(0, 260) +
      (f.text.trim().split("\n").length > 4 || f.text.length > 260 ? "\n…" : "");

    const art = /^[aeiou]/i.test(f.label) ? "an" : "a";
    const botHtml = f.bad
      ? `That's ${art} <b>${f.label}</b> snippet — but it doesn't parse. Want me to find the problem?`
      : `That's ${art} <b>${f.label}</b>${
          f.pt === "text" ? ` — ${wordStats(f.text)[0][1]} words` : ""
        }. What should we do?`;

    const chips: [string, string][] = f.bad ? [["Find the error", "fmt"]] : PSUG[f.pt] || [];

    setMessages([
      { id: "paste-" + Date.now(), type: "paste", pasteItem: f, html: prev },
      { id: "bot-desc-" + Date.now(), type: "bot", html: botHtml },
      { id: "chips-" + Date.now(), type: "chips", chips },
    ]);
    setTimeout(scrollThreadToBottom, 100);
  }, [pasteData]);

  // Handle File landing or Context Tool
  useEffect(() => {
    if (pasteData) return; // Paste data takes precedence

    if (!file) {
      if (contextToolName) {
        setMessages([
          {
            id: "ctx-bot",
            type: "bot",
            html: `<b>${contextToolName}</b> is ready.<span class="sub text-muted block text-[15px] mt-[4px]">Drop a file anywhere, paste, or try a sample.</span>`,
          },
        ]);
      }
      return;
    }

    const initialMsgs: MessageItem[] = [{ id: "fcard-" + Date.now(), type: "file", file }];

    if (file.multi && file.multi.length > 1) {
      initialMsgs.push(
        {
          id: "multi-bot",
          type: "bot",
          html: `Got ${file.multi.length} PDFs. Want me to merge them into one?`,
        },
        {
          id: "multi-chips",
          type: "chips",
          chips: [["Merge them", "merge them"], ...SUG.pdf.slice(0, 3)],
        },
      );
    } else {
      initialMsgs.push(
        {
          id: "bot-desc",
          type: "bot",
          html: `Got it — ${describeFile(file)}. What should we do?`,
        },
        {
          id: "bot-chips",
          type: "chips",
          chips: SUG[file.kind] || SUG.other,
        },
      );
    }

    setMessages(initialMsgs);
    setTimeout(scrollThreadToBottom, 100);
  }, [file, pasteData, contextToolName]);

  // Execute paste action
  const doPasteAction = useCallback(
    async (act: string, label?: string) => {
      const f = currentPasteRef.current;
      if (!f) return;

      const lab =
        label ||
        (Object.values(PSUG)
          .flat()
          .find((x) => x[1] === act) || [act])[0];
      setMessages((prev) => [...prev, { id: "u-" + Date.now(), type: "user", html: lab }]);
      setTimeout(scrollThreadToBottom, 50);

      updateStatus("Working…", "var(--accent)", true);
      await wait(450);

      const fn = ACT[act];
      if (!fn) {
        updateStatus("Ready · runs on your device", "var(--ok)", false);
        return;
      }

      const r = await fn(f);
      updateStatus("Ready · runs on your device", "var(--ok)", false);

      if (r.go && r.open) {
        openCard(r.open, r.openInput ?? f.text, r.openOpt);
        return;
      }

      const newMsgs: MessageItem[] = [
        { id: "bot-res-" + Date.now(), type: "bot", html: r.msg },
        { id: "res-card-" + Date.now(), type: "resultCard", actionResult: r },
      ];

      if (!r.bad) {
        const nextChips = (PSUG[f.pt] || []).filter((x) => x[1] !== act).slice(0, 3);
        if (nextChips.length) {
          newMsgs.push(
            { id: "bot-next-" + Date.now(), type: "bot", html: '<span class="text-muted">What next?</span>' },
            { id: "chips-next-" + Date.now(), type: "chips", chips: nextChips },
          );
        }
      }

      setMessages((prev) => [...prev, ...newMsgs]);
      setTimeout(scrollThreadToBottom, 100);
    },
    [openCard],
  );

  // Main input handler from composer
  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    setInputText("");

    // ---- Chat router (lib/intent/chatRouter): the active card first, then paste, open, generator, file, help ----
    const ws = useWorkspace.getState();
    const active = ws.activeCardId ? ws.cards[ws.activeCardId] : undefined;
    const activeMsg = active ? ws.messages.find((m) => m.type === "toolCard" && m.cardId === active.id) : undefined;
    const cardCfg = active && activeMsg ? (CARDS[active.toolId] ?? null) : null;
    const loaded = currentFileRef.current;
    const route = routeMessage(trimmed, {
      card: cardCfg,
      cardIsLatest: !!liveCard(),
      hasFile: !!(loaded || currentPasteRef.current),
      looksLikeContent,
      isGenerator: (t) => !!genParse(t),
      hasFileStep: (t) => (loaded ? parse(t, loaded.kind).steps.some((x) => x.ok) : false),
    });
    if (route.kind === "option" && active && activeMsg) {
      // reference: talkToWidget — switch the option, confirm, and bring the card down next to the conversation
      const u: MessageItem = { id: "u-" + Date.now(), type: "user", html: escHtml(trimmed) };
      setMessages((prev) => [...prev, u]);
      await wait(280);
      ws.updateCard(active.id, { option: route.value });
      ws.setActiveCard(active.id);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== activeMsg.id),
        { id: "bot-opt-" + Date.now(), type: "bot", html: `Done — switched to <b>${escHtml(route.label)}</b>.` },
        activeMsg,
      ]);
      setTimeout(scrollThreadToBottom, 60);
      return;
    }
    if (route.kind === "intoCard" && active) {
      ws.updateCard(active.id, { input: trimmed });
      toast(`Pasted into ${toolBySlug(active.toolId)?.n ?? "the tool"}`);
      return;
    }
    if (route.kind === "paste" && onPasteIn) {
      onPasteIn(trimmed);
      return;
    }
    if (route.kind === "open") {
      const hit = findTool(route.query);
      setMessages((prev) => [...prev, { id: "u-" + Date.now(), type: "user", html: escHtml(trimmed) }]);
      if (hit) openCard(hit);
      else
        setMessages((prev) => [
          ...prev,
          {
            id: "bot-nf-" + Date.now(),
            type: "bot",
            html: `I couldn't find a tool called “${escHtml(route.query)}”. Try ⌘K to search them all.`,
          },
        ]);
      return;
    }

    // Check if this is a generator request (e.g. "generate 5 uuids"). With a file loaded, words that
    // describe a step for that file win: "protect it with a password" on a PDF used to print a password.
    const f0 = currentFileRef.current;
    const fileSteps = f0 ? parse(trimmed, f0.kind).steps.filter((s) => s.ok) : [];
    const gen = fileSteps.length ? null : genParse(trimmed);
    if (gen) {
      setMessages((prev) => [...prev, { id: "u-" + Date.now(), type: "user", html: trimmed }]);
      setTimeout(scrollThreadToBottom, 50);

      updateStatus("Generating…", "var(--accent)", true);
      await wait(420);
      const r = await runGen(gen);
      updateStatus("Ready · runs on your device", "var(--ok)", false);

      if (r.go && r.open) {
        // QR and every other tool open as a card right here in the chat.
        openCard(r.open, r.openInput ?? "", r.openOpt);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: "bot-res-" + Date.now(), type: "bot", html: r.msg },
        { id: "res-card-" + Date.now(), type: "resultCard", actionResult: r },
      ]);
      setTimeout(scrollThreadToBottom, 100);
      return;
    }

    // Check if there is an active paste item and instruction matches pasteAct
    if (currentPasteRef.current) {
      const pAct = pasteAct(trimmed, currentPasteRef.current.pt);
      if (pAct) {
        doPasteAction(pAct.act, trimmed);
        return;
      }
    }

    // Otherwise standard file instruction parsing
    const kind = currentFileRef.current?.kind;
    const { steps, spans } = parse(trimmed, kind);

    // 1. Add user bubble
    const userMsgId = "u-" + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        type: "user",
        html: markHTML(trimmed, spans, false),
      },
    ]);
    setTimeout(scrollThreadToBottom, 50);

    // 2. Think
    updateStatus("Thinking…", "var(--accent)", true);
    await wait(650);

    if (!currentFileRef.current && !currentPasteRef.current) {
      updateStatus("Ready · runs on your device", "var(--ok)", false);
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-nofile-" + Date.now(),
          type: "bot",
          html: "Drop a file first, paste text, or try a sample:",
        },
      ]);
      return;
    }

    const good = steps.filter((s) => s.ok);
    if (!good.length) {
      updateStatus("Ready · runs on your device", "var(--ok)", false);
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-sorry-" + Date.now(),
          type: "bot",
          html: `I didn't quite catch a plan for that. Try one of these:`,
        },
        {
          id: "bot-sug-" + Date.now(),
          type: "chips",
          chips: SUG[kind || "other"] || SUG.other,
        },
      ]);
      setTimeout(scrollThreadToBottom, 50);
      return;
    }

    // 3. Plan card
    const isPrivateServer = good.some((s) => ["word", "pdf", "protect"].includes(s.id));
    setMessages((prev) => [
      ...prev,
      {
        id: "bot-plan-" + Date.now(),
        type: "bot",
        html: `Here's the plan — ${good.length === 1 ? "one step" : good.length + " steps"}, ${
          isPrivateServer ? "processed privately" : "all on your device"
        }.`,
      },
      {
        id: "card-plan-" + Date.now(),
        type: "plan",
        planSteps: good,
      },
    ]);

    updateStatus("Ready · runs on your device", "var(--ok)", false);
    setTimeout(scrollThreadToBottom, 50);
  };

  /**
   * Runs a plan for real (Phase 4): each "run" step calls its worker on the previous step's output.
   * Steps with their own tool page are offered as "Continue in …"; unbuilt steps were shown as Coming soon
   * and are skipped. Results show the actual output files and sizes. Busy is always released.
   */
  const executePlan = async (steps: IntentStep[], cardEl: HTMLElement) => {
    const f = currentFileRef.current;
    if (!f || isBusy) return;
    const runBtn = cardEl.querySelector(".run") as HTMLButtonElement | null;
    const stepEls = cardEl.querySelectorAll<HTMLElement>(".step");
    setIsBusy(true);
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.textContent = "Running…";
    }
    const t0 = performance.now();
    const plans = steps.map((s) => planFor(s, { kind: f.kind, name: f.name }));
    let failed: string | null = null;
    let cur: PlanFile | null = f.file ? { blob: f.file, name: f.name, type: f.type, kind: f.kind } : null;
    const outputs: { file: PlanFile; note?: string; input: number }[] = [];
    let ran = 0;
    try {
      if (!cur) throw new Error("This sample has no file behind it. Drop your own file to run the plan.");
      for (let i = 0; i < steps.length; i++) {
        if (plans[i].how !== "run") continue;
        const s = steps[i];
        const el = stepEls[i];
        updateStatus(`Step ${i + 1} of ${steps.length} · ${s.t}`, "var(--accent)", true);
        const bar = el?.querySelector<HTMLElement>(".bar b");
        if (bar) bar.style.width = "35%";
        try {
          const inSize = cur.blob.size;
          const out = await runStep(s, cur);
          cur = out;
          outputs.push({ file: out, note: out.note, input: inSize });
          ran++;
        } catch (e) {
          failed = `Step ${i + 1} (${s.t}) didn't work: ${(e as Error).message}`;
          break;
        }
        if (bar) await tween(250, (p) => (bar.style.width = `${35 + p * 65}%`), ease.io);
        const ok = el?.querySelector<HTMLElement>(".ok");
        if (ok) ok.style.transform = "scale(1)";
      }
    } catch (e) {
      failed = (e as Error).message;
    } finally {
      setIsBusy(false);
      const done = ran > 0 && !failed;
      updateStatus(done ? "Done · nothing left your device" : "Ready · runs on your device", "var(--ok)", false);
      if (runBtn) {
        runBtn.disabled = done; // as in the reference: a finished plan shows "Done ✓"
        runBtn.textContent = done ? "Done ✓" : "Run";
        if (done) runBtn.style.background = "var(--ok)";
      }
    }

    const msgs: MessageItem[] = [];
    if (failed) msgs.push({ id: "bot-fail-" + Date.now(), type: "bot", html: escHtml(failed) });
    if (ran > 0 && cur && !failed) {
      const secs = ((performance.now() - t0) / 1000).toFixed(1);
      msgs.push(
        {
          id: "bot-done-" + Date.now(),
          type: "bot",
          html: `Done in ${secs} s — your ${outputs.length > 1 ? "files are" : "file is"} ready.`,
        },
        {
          id: "results-" + Date.now(),
          type: "results",
          // One row per step, as in the reference; each is that step's real output.
          results: outputs.map((o) => ({
            name: o.file.name,
            size: o.file.blob.size,
            gain: o.file.blob.size < o.input ? Math.round((1 - o.file.blob.size / o.input) * 100) : 0,
            m: o.note,
            blob: o.file.blob,
            url: o.file.kind === "image" ? URL.createObjectURL(o.file.blob) : undefined,
            real: true,
          })),
        },
      );
    }
    const opens = steps
      .map((s, i) => [s, plans[i]] as const)
      .filter((x): x is readonly [IntentStep, Extract<StepPlan, { how: "open" }>] => x[1].how === "open");
    if (opens.length && cur && !failed)
      msgs.push({
        id: "continue-" + Date.now(),
        type: "continue",
        continueIn: opens.map(([, p]) => ({ slug: p.slug, name: toolBySlug(p.slug)?.n ?? p.slug, file: cur! })),
      });
    if (ran > 0 && !failed)
      msgs.push(
        { id: "next-bot-" + Date.now(), type: "bot", html: '<span class="text-muted">What next?</span>' },
        { id: "next-chips-" + Date.now(), type: "chips", chips: NEXT[f.kind] || [] },
      );
    setMessages((prev) => [...prev, ...msgs]);
    setTimeout(scrollThreadToBottom, 100);
  };

  const continueIn = (slug: string, file: PlanFile) => {
    // The file goes into the next tool's card, in this same thread.
    setHandoff({ from: "home", items: [{ name: file.name, type: file.type, blob: file.blob }] });
    openCard(slug);
  };

  // Hero ask bar → send it through the normal path (latest handleSend via a ref, once per request).
  const sendRef = useRef(handleSend);
  sendRef.current = handleSend;
  useEffect(() => {
    if (pendingAsk) sendRef.current(pendingAsk.text);
  }, [pendingAsk]);

  const handleDownload = (res: { name: string; url?: string; blob?: Blob; real?: boolean }) => {
    if (!res.blob) return;
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Saved " + res.name);
  };

  const { steps: previewSteps, spans: mirrorSpans } = parse(inputText, currentFileRef.current?.kind);

  return (
    <section id="work" aria-label="Workspace" className="select-text">
      <div className="col w-[min(880px,92vw)] flex flex-col h-full">
        {/* Workspace Header */}
        <div className="wk-head flex items-center gap-[16px] py-[10px] pb-[14px] flex-none">
          <div id="orbDock" className="w-[58px] h-[58px] rounded-full flex-none" />
          <div>
            <div className="wk-name font-semibold text-[19px]">KlipKit</div>
            <div id="status" className="wk-status text-[14px] text-muted flex items-center gap-[7px]">
              <i className="w-[7px] h-[7px] rounded-full block" style={{ background: statusColor }} />
              <span>{statusText}</span>
            </div>
          </div>
          <div className="wk-pill ml-auto flex items-center gap-[10px]">
            {contextToolName && (
              <span className="chip inline-flex items-center gap-[9px] h-[40px] px-[16px] rounded-full bg-solid border border-line text-[15px] font-medium cursor-default">
                {contextToolIcon}
                {contextToolName}
              </span>
            )}
            <button
              id="newBtn"
              type="button"
              onClick={() => onNew()}
              className="pill inline-flex items-center gap-[8px] h-[44px] px-[20px] rounded-full text-[15px] font-medium border border-line2 bg-panel text-ink transition-transform active:scale-[0.96]"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New
            </button>
          </div>
        </div>

        {/* Chat thread and composer (tools appear inside the thread as cards; nothing replaces it) */}
        <>
          {/* Chat Thread */}
          <div
            ref={threadRef}
            id="thread"
            aria-live="polite"
            className="flex-1 overflow-y-auto overflow-x-hidden py-[18px] px-[4px] pb-[40px] scrollbar-none [mask-image:linear-gradient(to_bottom,transparent_0,#000_34px,#000_calc(100%-34px),transparent)]"
          >
            {messages.map((m) => {
              // Tool card: the tool itself, inside the conversation
              if (m.type === "toolCard" && m.cardId) {
                const tool = useWorkspace.getState().cards[m.cardId]?.toolId;
                return tool && CARDS[tool] ? (
                  <LiveToolCard
                    key={m.id}
                    id={m.cardId}
                    onCopy={(t) => (t ? copyText(t) : toast("Nothing to copy yet"))}
                  />
                ) : (
                  <FileToolCard key={m.id} id={m.cardId} />
                );
              }

              // File Card
              if (m.type === "file" && m.file) {
                const f = m.file;
                const K = KINDS[f.kind];
                return (
                  <div
                    key={m.id}
                    className="fcard ml-[48px] max-[640px]:ml-0 flex items-center gap-[16px] p-[14px_18px_14px_14px] rounded-[20px] bg-solid border border-line shadow-[var(--shadow)] w-max max-w-full my-[14px]"
                  >
                    {f.url ? (
                      <div
                        className="ftile w-[48px] h-[56px] rounded-[10px] grid place-items-center bg-cover bg-center flex-none"
                        style={{ backgroundImage: `url(${f.url})` }}
                      />
                    ) : (
                      <div
                        className="ftile w-[48px] h-[56px] rounded-[10px] grid place-items-center text-white text-[12px] font-bold tracking-[0.4px] flex-none"
                        style={{ background: K.c }}
                      >
                        {K.l}
                      </div>
                    )}
                    <div>
                      <div className="fname font-semibold text-[17px] text-ink">{f.name}</div>
                      <div className="fmeta text-[14px] text-muted mt-[3px]">{metaFile(f)}</div>
                    </div>
                  </div>
                );
              }

              // Paste Card
              if (m.type === "paste" && m.pasteItem) {
                const p = m.pasteItem;
                return (
                  <div
                    key={m.id}
                    className="fcard pcard ml-[48px] max-[640px]:ml-0 flex items-start gap-[16px] p-[16px_18px] rounded-[20px] bg-solid border border-line shadow-[var(--shadow)] my-[14px]"
                  >
                    <div
                      className="ftile flex-none grid place-items-center rounded-[10px] text-white font-bold"
                      style={{
                        background: PT_COLOR[p.pt],
                        width: "46px",
                        height: "46px",
                        fontSize: PT_TILE[p.pt].length > 3 ? "10px" : "13px",
                      }}
                    >
                      {PT_TILE[p.pt]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="fname font-semibold text-[17px] text-ink">Pasted {p.label}</div>
                      <div className="fmeta text-[14px] text-muted mt-[2px]">
                        {p.lines.toLocaleString()} line{p.lines > 1 ? "s" : ""} · {fmtSize(p.size)}
                      </div>
                      <pre className="pprev mt-[8px] font-mono text-[13px] text-muted whitespace-pre-wrap break-all max-h-[84px] overflow-hidden">
                        {m.html}
                      </pre>
                    </div>
                  </div>
                );
              }

              // Bot bubble
              if (m.type === "bot" && m.html) {
                return (
                  <div
                    key={m.id}
                    className="msg flex gap-[14px] mb-[20px] animate-[msgIn_0.55s_cubic-bezier(.2,.8,.2,1)_both]"
                  >
                    <div
                      className="av w-[34px] h-[34px] rounded-full flex-none overflow-hidden relative shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]"
                      style={{
                        background:
                          "conic-gradient(from 200deg, #7C6BFF, #B38BFF, #FF9C82, #FFD27A, #8FE0BE, #6FB7FF, #7C6BFF)",
                      }}
                    >
                      <div
                        className="absolute inset-0"
                        style={{
                          background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.9), transparent 45%)",
                        }}
                      />
                    </div>
                    <div
                      className="bub text-[19px] leading-[1.5] text-ink pt-[3px] max-w-[760px]"
                      dangerouslySetInnerHTML={{ __html: m.html }}
                    />
                  </div>
                );
              }

              // User bubble
              if (m.type === "user" && m.html) {
                return (
                  <div
                    key={m.id}
                    className="msg user flex justify-end mb-[20px] animate-[msgIn_0.55s_cubic-bezier(.2,.8,.2,1)_both]"
                  >
                    <div
                      className="ub bg-ink text-bg px-[20px] py-[14px] rounded-[22px_22px_6px_22px] text-[19px] leading-[1.45] max-w-[640px]"
                      dangerouslySetInnerHTML={{ __html: m.html }}
                    />
                  </div>
                );
              }

              // Chips
              if (m.type === "chips" && m.chips) {
                return (
                  <div
                    key={m.id}
                    className="chips flex flex-wrap gap-[10px] my-[2px] mb-[22px] ml-[48px] max-[640px]:ml-0"
                  >
                    {m.chips.map(([label, cmd], idx) => (
                      <button
                        key={label}
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          if (currentPasteRef.current) {
                            doPasteAction(cmd, label);
                          } else {
                            handleSend(cmd);
                          }
                        }}
                        style={{ animationDelay: `${idx * 70}ms` }}
                        className="chip inline-flex items-center gap-[9px] h-[44px] px-[18px] rounded-full bg-solid border border-line text-[16px] font-medium shadow-[0_6px_18px_-12px_rgba(0,0,0,0.25)] transition-[transform,border-color,box-shadow,background] duration-250 hover:-translate-y-[2px] hover:border-line2 hover:shadow-[0_12px_26px_-14px_rgba(0,0,0,0.3)] active:scale-[0.96] animate-[chipIn_0.5s_cubic-bezier(.2,.9,.3,1.3)_forwards]"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                );
              }

              // Action Result Card (for paste & generators)
              if (m.type === "resultCard" && m.actionResult) {
                const r = m.actionResult;
                return (
                  <div
                    key={m.id}
                    className="card rcard2 bg-solid border border-line rounded-[24px] shadow-[var(--shadow)] p-[20px] mb-[22px] ml-[48px] max-[640px]:ml-0"
                  >
                    {r.html && <div dangerouslySetInnerHTML={{ __html: r.html }} />}
                    <div className="rfoot flex items-center gap-[8px] mt-[14px] flex-wrap">
                      {r.copy && (
                        <button
                          type="button"
                          className="pill sm inline-flex items-center gap-[6px] h-[38px] px-[15px] rounded-full text-[14px] font-medium border border-line bg-panel text-ink hover:-translate-y-[1px]"
                          onClick={() => copyText(r.copy)}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          >
                            <rect x="9" y="9" width="11" height="11" rx="2.5" />
                            <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                          </svg>
                          Copy
                        </button>
                      )}
                      {r.open && (
                        <button
                          type="button"
                          className="pill sm inline-flex items-center gap-[6px] h-[38px] px-[15px] rounded-full text-[14px] font-medium border border-line bg-panel text-ink hover:-translate-y-[1px]"
                          onClick={() =>
                            openCard(r.open!, r.openInput ?? currentPasteRef.current?.text ?? "", r.openOpt)
                          }
                        >
                          Edit live here <span className="opacity-60">· {toolBySlug(r.open)?.n ?? r.open}</span>
                        </button>
                      )}
                      <span className="rnote ml-auto text-[13px] text-faint">On your device · nothing uploaded</span>
                    </div>
                  </div>
                );
              }

              // Plan Card
              if (m.type === "plan" && m.planSteps) {
                const steps = m.planSteps;
                const kindNow = currentFileRef.current?.kind ?? "other";
                const nameNow = currentFileRef.current?.name ?? "";
                const stepPlans = steps.map((s) => planFor(s, { kind: kindNow, name: nameNow }));
                const hasServer = stepPlans.some((p) => p.how === "open" && p.where === "server");
                const canRun = stepPlans.some((p) => p.how !== "soon");
                return (
                  <div
                    key={m.id}
                    className="card bg-solid border border-line rounded-[24px] shadow-[var(--shadow)] p-[20px] mb-[22px] ml-[48px] max-[640px]:ml-0"
                  >
                    <div className="steps flex gap-[12px] items-stretch flex-wrap">
                      {steps.map((s, idx) => (
                        <React.Fragment key={s.id + idx}>
                          {idx > 0 && <div className="arrow self-center text-faint text-[20px]">→</div>}
                          <div
                            className="step flex-1 min-w-[210px] relative p-[16px_16px_18px] rounded-[18px] bg-soft border border-line overflow-hidden"
                            data-i={idx}
                          >
                            <div className="n w-[28px] h-[28px] rounded-full bg-ink text-bg grid place-items-center text-[13px] font-semibold">
                              {idx + 1}
                            </div>
                            <div className="t font-semibold text-[17px] mt-[10px]">{s.t}</div>
                            <div className="d text-[14px] text-muted mt-[3px] tabular-nums">{s.d || "\u00A0"}</div>
                            <div className="bar h-[5px] rounded-[5px] bg-line mt-[14px] overflow-hidden">
                              <b
                                className="block h-full w-0 rounded-[5px]"
                                style={{ background: "linear-gradient(90deg, var(--accent), var(--peach))" }}
                              />
                            </div>
                            <div className="ok absolute right-[14px] top-[14px] w-[28px] h-[28px] rounded-full bg-ok grid place-items-center scale-0 transition-transform duration-450 ease-[cubic-bezier(.2,.9,.3,1.5)]">
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#fff"
                                strokeWidth="3.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M5 12l5 5L20 7" />
                              </svg>
                            </div>
                            <div className="tag absolute right-[14px] top-[16px] text-[12px] font-semibold text-muted">
                              {stepTag(planFor(s, { kind: kindNow, name: nameNow }))}
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>

                    <div className="cardfoot flex items-center gap-[10px] mt-[16px] text-[14px] text-muted">
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      >
                        <rect x="5" y="10" width="14" height="10" rx="3" />
                        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      </svg>
                      <span>
                        {hasServer
                          ? "Some steps use KlipKit’s own server · deleted after 1 hour"
                          : "Runs on your device · nothing is uploaded"}
                      </span>
                      <button
                        type="button"
                        disabled={!canRun}
                        title={canRun ? undefined : "These steps are coming soon"}
                        className="run ml-auto disabled:opacity-40 disabled:cursor-not-allowed h-[46px] px-[22px] rounded-full bg-ink text-bg font-semibold text-[16px] inline-flex items-center gap-[10px] relative overflow-hidden transition-[transform,background] active:scale-[0.96]"
                        onClick={(e) => {
                          const card = e.currentTarget.closest(".card") as HTMLElement;
                          if (card) executePlan(steps, card);
                        }}
                      >
                        Run <span className="opacity-60 font-medium">↵</span>
                      </button>
                    </div>
                  </div>
                );
              }

              // File Results Card
              if (m.type === "continue" && m.continueIn) {
                return (
                  <div key={m.id} className="flex flex-wrap gap-[10px] mb-[22px] ml-[48px] max-[640px]:ml-0">
                    {m.continueIn.map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => continueIn(c.slug, c.file)}
                        className="pill inline-flex items-center gap-[8px] h-[42px] px-[18px] rounded-full bg-ink text-bg text-[15px] font-semibold"
                      >
                        Continue in {c.name} →
                      </button>
                    ))}
                  </div>
                );
              }

              if (m.type === "results" && m.results) {
                return (
                  <div
                    key={m.id}
                    className="card bg-solid border border-line rounded-[24px] shadow-[var(--shadow)] p-[20px] mb-[22px] ml-[48px] max-[640px]:ml-0"
                  >
                    {m.results.map((res, i) => (
                      <div
                        key={res.name + i}
                        className="rrow flex items-center gap-[14px] p-[12px_14px] rounded-[18px] bg-soft border border-line mt-[10px] first:mt-0"
                      >
                        {res.url ? (
                          <div
                            className="ftile w-[40px] h-[46px] rounded-[10px] grid place-items-center bg-cover bg-center flex-none"
                            style={{ backgroundImage: `url(${res.url})` }}
                          />
                        ) : (
                          <div
                            className="ftile w-[40px] h-[46px] rounded-[10px] grid place-items-center text-white text-[11px] font-bold tracking-[0.4px] flex-none"
                            style={{ background: KINDS[kindOf(res.name)].c }}
                          >
                            {KINDS[kindOf(res.name)].l}
                          </div>
                        )}
                        <div>
                          <div className="fname font-semibold text-[17px] text-ink">{res.name}</div>
                          <div className="fmeta text-[14px] text-muted">
                            {fmtSize(res.size)}
                            {res.m ? ` · ${res.m}` : ""}
                          </div>
                        </div>
                        {res.gain > 0 && (
                          <span className="gain text-[13px] font-semibold text-ok bg-okSoft px-[10px] py-[4px] rounded-full">
                            −{res.gain}%
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label="Download"
                          onClick={() => handleDownload(res)}
                          className="dl ml-auto w-[42px] h-[42px] rounded-full border border-line2 grid place-items-center bg-solid transition-transform hover:-translate-y-[2px]"
                        >
                          <svg
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 4v12M6 11l6 6 6-6M5 20h14" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* Composer Dock */}
          <div id="dock" className="flex-none py-[6px] pb-[26px] relative">
            {/* Pro Listening Waveform pill */}
            <div
              id="listen"
              className={`absolute left-1/2 -top-[38px] -translate-x-1/2 flex items-center gap-[12px] px-[18px] py-[10px] rounded-full bg-ink text-bg text-[14px] font-medium transition-[opacity,transform] duration-400 ease-[cubic-bezier(.2,.9,.3,1.3)] pointer-events-none ${
                isListening ? "opacity-100 -translate-y-[8px]" : "opacity-0 translate-y-0"
              }`}
            >
              <div className="rd w-[9px] h-[9px] rounded-full bg-[#FF5A5F]" />
              Listening · Pro
              <div id="wave" className="flex gap-[3px] items-center h-[24px]">
                {Array.from({ length: 22 }).map((_, i) => (
                  <i key={i} className="w-[3px] rounded-[3px] bg-bg h-[4px] block transition-[height] duration-75" />
                ))}
              </div>
            </div>

            {/* Plan Preview Chips */}
            <div id="preview" className="flex gap-[8px] items-center min-h-[38px] mb-[10px] ml-[6px] flex-wrap">
              {previewSteps.length > 0 && (
                <>
                  <span className="pvl text-[13px] text-faint mr-[2px]">Plan</span>
                  {previewSteps.map((s, idx) => (
                    <React.Fragment key={s.id + idx}>
                      {idx > 0 && <span className="text-faint">→</span>}
                      <span
                        className={`pv inline-flex items-center gap-[8px] h-[34px] px-[14px] rounded-full text-[14px] font-medium bg-solid border border-line ${
                          s.ok ? "" : "opacity-50 line-through"
                        }`}
                      >
                        <i
                          className="w-[8px] h-[8px] rounded-full inline-block"
                          style={{ background: `var(--u${s.i % 4})` }}
                        />
                        {s.t}
                        {s.d && <span className="text-muted font-normal"> · {s.d}</span>}
                      </span>
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>

            {/* Composer Field */}
            <div className="composer flex items-center gap-[8px] p-[10px_10px_10px_24px] rounded-[34px] bg-solid border border-line shadow-[var(--shadow2)] focus-within:border-[rgba(109,93,245,0.45)] focus-within:ring-6 focus-within:ring-accentSoft transition-[border-color,box-shadow]">
              <div className="field relative flex-1 min-h-[30px]">
                <div
                  ref={mirrorRef}
                  id="mirror"
                  aria-hidden="true"
                  className="font-sans text-[19px] leading-[30px] p-[8px_0] whitespace-pre-wrap break-words absolute inset-0 text-transparent pointer-events-none select-none"
                  dangerouslySetInnerHTML={{
                    __html: markHTML(inputText, mirrorSpans, true) + "&#8203;",
                  }}
                />
                <textarea
                  ref={cmpRef}
                  id="cmp"
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (inputText.trim()) handleSend(inputText);
                    }
                  }}
                  placeholder="Ask, paste, or describe — e.g. “compress to under 2 MB” or “generate 5 UUIDs”"
                  aria-label="Tell KlipKit what to do"
                  className="font-sans text-[19px] leading-[30px] p-[8px_0] relative w-full border-0 outline-none resize-none bg-transparent text-ink h-[46px] overflow-hidden block placeholder:text-faint"
                />
              </div>

              <button
                id="mic"
                type="button"
                aria-label="Voice command (Pro)"
                onClick={onOpenVoice}
                className={`mic relative w-[52px] h-[52px] rounded-full border border-line grid place-items-center flex-none transition-colors active:scale-[0.96] ${
                  isListening ? "rec bg-red border-red text-white" : "bg-soft text-ink"
                }`}
              >
                <span className="pro absolute -top-[8px] -right-[10px] inline-flex items-center px-[8px] py-[3px] rounded-full text-white text-[11px] font-bold tracking-[0.8px] bg-gradient-to-br from-[#8C7DFF] to-[#FF9C82] shadow-sm">
                  PRO
                </span>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>

              <button
                id="send"
                type="button"
                aria-label="Send"
                disabled={!inputText.trim() || isBusy}
                onClick={() => handleSend(inputText)}
                className="send w-[52px] h-[52px] rounded-full bg-ink text-bg grid place-items-center flex-none transition-[transform,opacity] disabled:opacity-35 active:scale-[0.96]"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        </>
      </div>
    </section>
  );
}
