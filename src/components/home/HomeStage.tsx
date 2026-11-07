"use client";

import { setTheme } from "@/lib/theme";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Orb, type OrbController } from "./Orb";
import { Hero } from "./Hero";
import { DropVeil } from "./DropVeil";
import { Workspace } from "./Workspace";
import { FeelSection } from "./FeelSection";
import { ExploreSection } from "./ExploreSection";
import { PricingSection } from "./PricingSection";
import { Satellites } from "./Satellites";
import { MarqueeBand } from "./MarqueeBand";
import { SpotlightWordmark } from "./SpotlightWordmark";
import { SAMPLES, fromFile, meta as metaFile, type FileInfo, KINDS } from "@/lib/fileKind";
import { type ToolItem, CATS, tint, TOOL_ICON_PATHS, TOOLS, toolBySlug } from "@/lib/designTools";
import { tween, wait, ease, ripple, goto, addLoop, initMagneticButtons } from "@/lib/motion/animation";
import { useUIStore } from "@/lib/store/ui";
import { useKlip } from "@/lib/store/klip";
import { pasteItem, type PasteItem, looksLikeContent } from "@/lib/engines/detect";
import { PT_TILE, PT_COLOR } from "@/lib/actions";
import { esc } from "@/lib/engines/text";
import { PANELS } from "@/lib/toolCards";

export function HomeStage() {
  const [mode, setMode] = useState<"hero" | "work">("hero");
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [currentPaste, setCurrentPaste] = useState<PasteItem | null>(null);
  const [contextTool, setContextTool] = useState<ToolItem | null>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);
  const router = useRouter();

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceDemoText, setVoiceDemoText] = useState<string | null>(null);

  /** Text from the hero ask bar, sent by the workspace once it's open. */
  const [pendingAsk, setPendingAsk] = useState<{ text: string; n: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const orbControllerRef = useRef<OrbController | null>(null);

  const { openPalette, openVoiceSheet, activeTool, setActiveTool, openPanel, closePanel, panelTool } = useUIStore();

  // As in the reference's openPanel (state.mode = 'work'): a live panel is a workspace view, so the orb
  // docks and the satellites leave. Closing the panel keeps the workspace.
  useEffect(() => {
    if (panelTool) setMode("work");
  }, [panelTool]);

  // Watch activeTool from store
  useEffect(() => {
    if (activeTool) {
      if (PANELS[activeTool.slug]) {
        openPanel(activeTool, "");
      } else {
        setContextTool(activeTool);
        setCurrentFile(null);
        setCurrentPaste(null);
        setMode("work");
        document.body.classList.add("is-work");
        orbControllerRef.current?.triggerGulp(0.8);
      }
      setActiveTool(null);
    }
  }, [activeTool, setActiveTool, openPanel]);

  // Toast helper
  const showToast = (text: string) => {
    const el = document.getElementById("toast");
    if (el) {
      el.textContent = text;
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 2600);
    }
  };

  // Flying file chip animation into Orb
  const animateFlyChip = async (f: FileInfo, startPt?: { x: number; y: number }) => {
    const stage = document.getElementById("stage") || document.body;
    const sr = stage.getBoundingClientRect();
    const orbSlot = mode === "work" ? document.getElementById("orbDock") : document.getElementById("orbSlot");
    const orbRect = orbSlot?.getBoundingClientRect() || {
      left: sr.left + sr.width / 2,
      top: sr.top + 300,
      width: 250,
      height: 250,
    };
    const targetX = orbRect.left + orbRect.width / 2 - sr.left;
    const targetY = orbRect.top + orbRect.height / 2 - sr.top;

    const startX = startPt ? startPt.x - sr.left : targetX;
    const startY = startPt ? startPt.y - sr.top : targetY + 200;

    const fc = document.createElement("div");
    fc.className =
      "flychip absolute z-10 flex items-center gap-[12px] p-[12px_16px] rounded-[16px] bg-solid shadow-[var(--shadow2)] text-[16px] font-semibold pointer-events-none whitespace-nowrap text-ink";

    const K = KINDS[f.kind];
    const tileHTML = f.url
      ? `<div class="ftile w-[40px] h-[46px] rounded-[10px] grid place-items-center bg-cover bg-center flex-none" style="background-image:url(${f.url})"></div>`
      : `<div class="ftile w-[40px] h-[46px] rounded-[10px] grid place-items-center text-white text-[11px] font-bold tracking-[0.4px] flex-none" style="background:${K.c}">${K.l}</div>`;

    fc.innerHTML = `${tileHTML}<div>${f.name}<div class="fmeta font-normal text-[14px] text-muted">${metaFile(
      f,
    )}</div></div>`;
    stage.appendChild(fc);

    const w = fc.offsetWidth || 180;
    const h = fc.offsetHeight || 60;

    if (mode === "hero") {
      await tween(
        620,
        (p) => {
          const x = startX + (targetX - startX) * p;
          const y = startY + (targetY - startY) * p - Math.sin(p * Math.PI) * 60;
          fc.style.transform = `translate(${x - w / 2}px, ${y - h / 2}px) scale(${1 - 0.75 * p}) rotate(${
            (1 - p) * -6
          }deg)`;
          fc.style.opacity = String(p > 0.8 ? (1 - p) * 5 : 1);
        },
        ease.io,
      );
    } else {
      fc.style.transform = `translate(${startX - w / 2}px, ${startY - h / 2}px)`;
      await tween(
        380,
        (p) => {
          fc.style.opacity = String(1 - p);
          fc.style.transform = `translate(${startX - w / 2}px, ${startY - h / 2 - p * 30}px) scale(${1 - 0.3 * p})`;
        },
        ease.io,
      );
    }

    fc.remove();
    orbControllerRef.current?.triggerGulp(1);
    ripple(targetX, targetY, orbRect.width * 1.05);

    useKlip.getState().addRecentFile(f.name);

    await wait(260);
  };

  // Flying paste chip animation into Orb
  const animateFlyPaste = async (p: PasteItem) => {
    const stage = document.getElementById("stage") || document.body;
    const sr = stage.getBoundingClientRect();
    const orbSlot = mode === "work" ? document.getElementById("orbDock") : document.getElementById("orbSlot");
    const orbRect = orbSlot?.getBoundingClientRect() || {
      left: sr.left + sr.width / 2,
      top: sr.top + 300,
      width: 250,
      height: 250,
    };
    const targetX = orbRect.left + orbRect.width / 2 - sr.left;
    const targetY = orbRect.top + orbRect.height / 2 - sr.top;
    const startX = targetX;
    const startY = targetY + 260;

    const fc = document.createElement("div");
    fc.className =
      "flychip absolute z-10 flex items-center gap-[12px] p-[10px_16px] rounded-[16px] bg-solid shadow-[var(--shadow2)] text-[14px] font-mono font-medium pointer-events-none whitespace-nowrap text-ink";

    fc.innerHTML = `<div class="ftile w-[36px] h-[36px] rounded-[8px] grid place-items-center text-white text-[11px] font-bold flex-none" style="background:${PT_COLOR[p.pt]}">${PT_TILE[p.pt]}</div><div style="max-width:320px;overflow:hidden;text-overflow:ellipsis">${esc(p.text.trim().slice(0, 46))}</div>`;
    stage.appendChild(fc);

    const w = fc.offsetWidth || 200;
    const h = fc.offsetHeight || 50;

    if (mode === "hero") {
      await tween(
        560,
        (prog) => {
          const x = startX + (targetX - startX) * prog;
          const y = startY + (targetY - startY) * prog - Math.sin(prog * Math.PI) * 50;
          fc.style.transform = `translate(${x - w / 2}px, ${y - h / 2}px) scale(${1 - 0.75 * prog})`;
          fc.style.opacity = String(prog > 0.8 ? (1 - prog) * 5 : 1);
        },
        ease.io,
      );
    }

    fc.remove();
    orbControllerRef.current?.triggerGulp(0.9);
    ripple(targetX, targetY, orbRect.width * 1.05);
    await wait(240);
  };

  const handleIngest = async (files: FileInfo[], pt?: { x: number; y: number } | null) => {
    if (!files.length) return;
    const f = files[0];
    if (files.length > 1 && files.every((x) => x.kind === "pdf")) {
      f.multi = files;
    }

    await animateFlyChip(f, pt || undefined);

    closePanel();
    setCurrentFile(f);
    setCurrentPaste(null);
    setContextTool(null);
    setMode("work");
    document.body.classList.add("is-work");
  };

  const handlePasteIn = async (text: string) => {
    const item = pasteItem(text);
    await animateFlyPaste(item);

    closePanel();
    setCurrentPaste(item);
    setCurrentFile(null);
    setContextTool(null);
    setMode("work");
    document.body.classList.add("is-work");
  };

  const handlePickSample = async (sampleKey: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const s = SAMPLES[sampleKey];
    if (!s) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const f = await s.f();
    handleIngest([f], { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  // Drag anywhere on page
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes("Files");

    const handleDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current++;
      setIsDragging(true);
      document.body.classList.add("dragging");
      orbControllerRef.current?.setLabel("Release");
    };

    const handleDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDragging(false);
        document.body.classList.remove("dragging");
        orbControllerRef.current?.setLabel("Drop here");
      }
    };

    const handleDrop = async (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      document.body.classList.remove("dragging");
      orbControllerRef.current?.setLabel("Drop here");

      const dtFiles = Array.from(e.dataTransfer?.files || []);
      if (dtFiles.length > 0) {
        const fileInfos = await Promise.all(dtFiles.map(fromFile));
        handleIngest(fileInfos, { x: e.clientX, y: e.clientY });
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [mode]);

  // Global paste handler: files -> ingest, text -> pasteIn
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const tg = e.target as HTMLElement | null;
      if (tg?.closest?.("#panel") || tg?.closest?.("#pal")) return;

      const files = Array.from(e.clipboardData?.files || []);
      if (files.length > 0) {
        e.preventDefault();
        const fileInfos = await Promise.all(files.map(fromFile));
        handleIngest(fileInfos, null);
        return;
      }

      const text = e.clipboardData?.getData("text") || "";
      if (!text.trim()) return;

      const isEditable = tg?.matches?.("#cmp, #heroAsk");
      if (isEditable && !looksLikeContent(text)) return;

      e.preventDefault();
      if (tg?.id === "heroAsk" || tg?.id === "cmp") {
        (tg as HTMLInputElement | HTMLTextAreaElement).value = "";
        tg.dispatchEvent(new Event("input", { bubbles: true }));
      }
      handlePasteIn(text);
    };

    window.addEventListener("paste", handleGlobalPaste);
    // Replay pastes that happened before this listener existed (kept by the inline script in app/page.tsx).
    const w = window as unknown as { __kkPaste?: { files: File[]; text: string }[]; __kkPasteReady?: boolean };
    w.__kkPasteReady = true;
    const early = w.__kkPaste?.splice(0) ?? [];
    const last = early[early.length - 1];
    if (last?.files.length) Promise.all(last.files.map(fromFile)).then((infos) => handleIngest(infos, null));
    else if (last?.text.trim()) handlePasteIn(last.text);
    return () => {
      window.removeEventListener("paste", handleGlobalPaste);
      w.__kkPasteReady = false;
    };
  }, []);

  const handleSelectTool = async (t: ToolItem) => {
    // Tools with their own page open it; unbuilt tools say so instead of faking a workspace.
    if (!PANELS[t.slug]) {
      if (t.routed) router.push(`/${t.slug}`);
      else showToast(`${t.n} is coming soon.`);
      return;
    }
    if (window.scrollY > 10) {
      await goto(0);
    }
    openPanel(t, "");
  };

  // Hash deep links: klipkit.com/#json-formatter opens the live tool
  useEffect(() => {
    const routeHash = () => {
      const h = window.location.hash.slice(1);
      if (!h) return;
      const t =
        toolBySlug(h) ??
        TOOLS.find(
          (x) =>
            x.n
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") === h,
        );
      if (t) {
        if (PANELS[t.slug]) {
          openPanel(t, "");
        } else {
          handleSelectTool(t);
        }
      }
    };

    window.addEventListener("hashchange", routeHash);
    const tm = setTimeout(routeHash, 140);
    return () => {
      window.removeEventListener("hashchange", routeHash);
      clearTimeout(tm);
    };
  }, [openPanel]);

  // Initialize magnetic buttons effect
  useEffect(() => {
    if (typeof initMagneticButtons === "function") {
      const cleanup = initMagneticButtons();
      return cleanup;
    }
  }, []);

  const handleNew = () => {
    closePanel();
    setMode("hero");
    setCurrentFile(null);
    setCurrentPaste(null);
    setContextTool(null);
    document.body.classList.remove("is-work");
  };

  const runVoiceDemo = async (customText?: string, durationMs: number = 2600) => {
    if (!currentFile && !currentPaste) {
      showToast("Drop a file or paste first, then speak.");
      return;
    }

    const defaultPhrases: Record<string, string> = {
      pdf: "now protect it with a password",
      image: "resize it for instagram and convert to webp",
      audio: "transcribe it",
      video: "make a gif",
      data: "convert to csv",
    };
    const phrase = customText || voiceDemoText || (currentFile ? defaultPhrases[currentFile.kind] : "format this JSON");

    setIsListening(true);
    document.body.classList.add("listening");
    orbControllerRef.current?.setTargetEnergy(0.4);

    const words = phrase.split(" ");
    const waveEl = document.getElementById("wave");

    const waveCleanup = addLoop((t) => {
      if (waveEl) {
        waveEl.querySelectorAll("i").forEach((b, k) => {
          (b as HTMLElement).style.height = `${
            5 + Math.abs(Math.sin(t * 7.3 + k * 0.7) * Math.sin(t * 3.1 + k * 0.31)) * 19
          }px`;
        });
      }
      const amp = 0.5 + 0.5 * Math.abs(Math.sin(t * 6.1) * Math.sin(t * 2.3));
      orbControllerRef.current?.setAmplitude(amp);
    });

    await wait(450);
    for (let i = 0; i < words.length; i++) {
      setVoiceTranscript(words.slice(0, i + 1).join(" "));
      await wait(Math.max(120, (durationMs - 450) / words.length));
    }

    await wait(400);
    waveCleanup();
    setIsListening(false);
    document.body.classList.remove("listening");
    orbControllerRef.current?.setAmplitude(0);
    orbControllerRef.current?.setTargetEnergy(0);

    await wait(350);
    const cmp = document.getElementById("cmp") as HTMLTextAreaElement | null;
    if (cmp) {
      cmp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    }
  };

  // Actions other components (voice sheet, palette) can trigger, via the UI store.
  // Registered once with stable wrappers; the ref always points at this render's handlers.
  const latest = useRef({ voice: () => runVoiceDemo() });
  latest.current = { voice: () => runVoiceDemo() };
  useEffect(() => {
    useUIStore.getState().setHomeActions({
      voice: () => latest.current.voice(),
      clearInput: () => {
        setCurrentFile(null);
        setCurrentPaste(null);
      },
    });
    return () => useUIStore.getState().setHomeActions(null);
  }, []);

  // Test hook with the same API as the reference prototype's window.__kk (used by scripts/visual-compare.ts).
  // App code must not call it; use the UI store instead.
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as unknown as Record<string, unknown>).__kk = {
      pasteIn: (t: string) => handlePasteIn(t),
      openPanel: (slugOrName: string, i?: string) => {
        const t = toolBySlug(slugOrName) ?? TOOLS.find((x) => x.n === slugOrName);
        if (t && PANELS[t.slug]) openPanel(t, i || "");
        else if (t) handleSelectTool(t);
      },
      startWork: () => {
        closePanel();
        setMode("work");
        document.body.classList.add("is-work");
      },
      ingestSample: async (k: string, x?: number, y?: number) => {
        const s = SAMPLES[k];
        if (s) {
          const f = await s.f();
          handleIngest([f], x != null && y != null ? { x, y } : null);
        }
      },
      drag: (on: boolean) => {
        setIsDragging(on);
        document.body.classList.toggle("dragging", on);
        orbControllerRef.current?.setLabel(on ? "Release" : "Drop here");
      },
      voice: (t?: string, ms?: number) => runVoiceDemo(t, ms),
      setVoiceText: (t: string) => setVoiceDemoText(t),
      goto,
      openPal: () => openPalette(),
      closePal: () => useUIStore.getState().closePalette(),
      setTheme: (t: "light" | "dark") => setTheme(t),
      state: { mode, file: currentFile, paste: currentPaste },
    };
  }, [mode, currentFile, currentPaste, voiceDemoText, openPanel, closePanel]);

  return (
    <>
      <div id="stage">
        {/* Hero Section */}
        <Hero
          onPickSample={handlePickSample}
          onOrbSlotClick={() => fileInputRef.current?.click()}
          onPasteText={handlePasteIn}
          onSubmitAsk={(text) => {
            closePanel();
            setMode("work");
            document.body.classList.add("is-work");
            orbControllerRef.current?.triggerGulp(0.8);
            // Through React state: writing the textarea's value and dispatching events didn't update the
            // composer's state, so the ask bar sent nothing (React's value tracker swallowed the input event).
            setTimeout(() => setPendingAsk({ text, n: Date.now() }), 300);
          }}
          hintText={isDragging ? "Release to let KlipKit read it ✨" : undefined}
        />

        {/* Workspace Section */}
        <Workspace
          pendingAsk={pendingAsk}
          file={currentFile}
          pasteData={currentPaste}
          contextToolName={contextTool?.n}
          contextToolIcon={
            contextTool && (
              <span
                className="w-[24px] h-[24px] rounded-[7px] grid place-items-center flex-none"
                style={{ background: tint(CATS[contextTool.c].c) }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={CATS[contextTool.c].c}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={TOOL_ICON_PATHS[contextTool.i] || TOOL_ICON_PATHS.code} />
                </svg>
              </span>
            )
          }
          onNew={handleNew}
          onOpenVoice={() => openVoiceSheet()}
          isListening={isListening}
          voiceTranscript={voiceTranscript}
        />

        {/* Orbiting Satellites around Orb */}
        <Satellites isHero={mode === "hero"} isDragging={isDragging} controllerRef={orbControllerRef} />

        {/* Living Orb that moves between hero slot and workspace dock */}
        <Orb
          mode={mode}
          isDragging={isDragging}
          onOrbClick={() => {
            if (mode === "hero") fileInputRef.current?.click();
          }}
          controllerRef={orbControllerRef}
        />
      </div>

      {/* Editorial Marquee Band */}
      <MarqueeBand />

      {/* Sections below stage */}
      <FeelSection />

      <ExploreSection onSelectTool={handleSelectTool} />

      <PricingSection onOpenPro={() => openVoiceSheet()} />

      {/* Giant Spotlight Wordmark */}
      <SpotlightWordmark />

      {/* Drop Veil */}
      <DropVeil isDragging={isDragging} />

      {/* Hidden File Picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            const fileInfos = await Promise.all(files.map(fromFile));
            handleIngest(fileInfos, null);
          }
          e.target.value = "";
        }}
      />
    </>
  );
}
