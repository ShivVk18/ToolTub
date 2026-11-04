'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AuroraBackground } from './AuroraBackground';
import { Nav } from './Nav';
import { Orb, type OrbController } from './Orb';
import { Hero } from './Hero';
import { DropVeil } from './DropVeil';
import { Workspace } from './Workspace';
import { FeelSection } from './FeelSection';
import { ExploreSection } from './ExploreSection';
import { PricingSection } from './PricingSection';
import { DesignFooter } from './DesignFooter';
import { CommandPalette } from './CommandPalette';
import { VoiceSheet } from './VoiceSheet';
import { SAMPLES, fromFile, meta as metaFile, type FileInfo, KINDS } from '@/lib/fileKind';
import { type ToolItem, CATS, tint, TOOL_ICON_PATHS, toolKind } from '@/lib/designTools';
import { tween, wait, ease, ripple, goto, addLoop, now } from '@/lib/animation';

interface KlipKitAppProps {
  seoSection?: React.ReactNode;
}

export function KlipKitApp({ seoSection }: KlipKitAppProps) {
  const [mode, setMode] = useState<'hero' | 'work'>('hero');
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [contextTool, setContextTool] = useState<ToolItem | null>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  // Modals
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isVoiceSheetOpen, setIsVoiceSheetOpen] = useState(false);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceDemoText, setVoiceDemoText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const orbControllerRef = useRef<OrbController | null>(null);

  // Toast helper
  const showToast = (text: string) => {
    const el = document.getElementById('toast');
    if (el) {
      el.textContent = text;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 2600);
    }
  };

  // Flying file chip animation into Orb
  const animateFlyChip = async (f: FileInfo, startPt?: { x: number; y: number }) => {
    const stage = document.getElementById('stage') || document.body;
    const sr = stage.getBoundingClientRect();
    const orbSlot =
      mode === 'work' ? document.getElementById('orbDock') : document.getElementById('orbSlot');
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

    const fc = document.createElement('div');
    fc.className =
      'flychip absolute z-10 flex items-center gap-[12px] p-[12px_16px] rounded-[16px] bg-solid shadow-[var(--shadow2)] text-[16px] font-semibold pointer-events-none whitespace-nowrap text-ink';

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

    if (mode === 'hero') {
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
          fc.style.transform = `translate(${startX - w / 2}px, ${startY - h / 2 - p * 30}px) scale(${
            1 - 0.3 * p
          })`;
        },
        ease.io,
      );
    }

    fc.remove();
    orbControllerRef.current?.triggerGulp(1);
    ripple(targetX, targetY, orbRect.width * 1.05);

    // Save recent
    try {
      const stored = localStorage.getItem('kk.recents');
      const r: string[] = stored ? JSON.parse(stored) : [];
      const updated = [f.name, ...r.filter((x) => x !== f.name)].slice(0, 5);
      localStorage.setItem('kk.recents', JSON.stringify(updated));
    } catch {}

    await wait(260);
  };

  const handleIngest = async (files: FileInfo[], pt?: { x: number; y: number } | null) => {
    if (!files.length) return;
    const f = files[0];
    if (files.length > 1 && files.every((x) => x.kind === 'pdf')) {
      f.multi = files;
    }

    await animateFlyChip(f, pt || undefined);

    setCurrentFile(f);
    setContextTool(null);
    setMode('work');
    document.body.classList.add('is-work');
  };

  // Sample click
  const handlePickSample = async (sampleKey: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const s = SAMPLES[sampleKey];
    if (!s) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const f = await s.f();
    handleIngest([f], { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  // Drag and drop handlers anywhere on the page
  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types || []).includes('Files');

    const handleDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current++;
      setIsDragging(true);
      document.body.classList.add('dragging');
      orbControllerRef.current?.setLabel('Release');
    };

    const handleDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDragging(false);
        document.body.classList.remove('dragging');
        orbControllerRef.current?.setLabel('Drop here');
      }
    };

    const handleDrop = async (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepthRef.current = 0;
      setIsDragging(false);
      document.body.classList.remove('dragging');
      orbControllerRef.current?.setLabel('Drop here');

      const dtFiles = Array.from(e.dataTransfer?.files || []);
      if (dtFiles.length > 0) {
        const fileInfos = await Promise.all(dtFiles.map(fromFile));
        handleIngest(fileInfos, { x: e.clientX, y: e.clientY });
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [mode]);

  // Open tool from palette or explore
  const handleSelectTool = async (t: ToolItem) => {
    if (window.scrollY > 10) {
      await goto(0);
    }
    setContextTool(t);
    setCurrentFile(null);
    setMode('work');
    document.body.classList.add('is-work');
    orbControllerRef.current?.triggerGulp(0.8);
  };

  // Reset to Hero
  const handleNew = () => {
    setMode('hero');
    setCurrentFile(null);
    setContextTool(null);
    document.body.classList.remove('is-work');
  };

  // Voice Pro Demo execution
  const runVoiceDemo = async (customText?: string, durationMs: number = 2600) => {
    if (!currentFile) {
      showToast('Drop a file first, then speak.');
      return;
    }

    const defaultPhrases: Record<string, string> = {
      pdf: 'now protect it with a password',
      image: 'resize it for instagram and convert to webp',
      audio: 'transcribe it',
      video: 'make a gif',
      data: 'convert to csv',
    };
    const phrase =
      customText ||
      voiceDemoText ||
      defaultPhrases[currentFile.kind] ||
      'compress it';

    setIsListening(true);
    document.body.classList.add('listening');
    orbControllerRef.current?.setTargetEnergy(0.4);

    const words = phrase.split(' ');
    const waveEl = document.getElementById('wave');

    const waveCleanup = addLoop((t) => {
      if (waveEl) {
        waveEl.querySelectorAll('i').forEach((b, k) => {
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
      setVoiceTranscript(words.slice(0, i + 1).join(' '));
      await wait(Math.max(120, (durationMs - 450) / words.length));
    }

    await wait(400);
    waveCleanup();
    setIsListening(false);
    document.body.classList.remove('listening');
    orbControllerRef.current?.setAmplitude(0);
    orbControllerRef.current?.setTargetEnergy(0);

    // Auto submit in workspace via Enter event or state
    await wait(350);
    const cmp = document.getElementById('cmp') as HTMLTextAreaElement | null;
    if (cmp) {
      cmp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
  };

  // Expose window.__kk for automated tests and demo controls
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__kk = {
      ingestSample: async (k: string, x?: number, y?: number) => {
        const s = SAMPLES[k];
        if (s) {
          const f = await s.f();
          handleIngest([f], x != null && y != null ? { x, y } : null);
        }
      },
      drag: (on: boolean) => {
        setIsDragging(on);
        document.body.classList.toggle('dragging', on);
        orbControllerRef.current?.setLabel(on ? 'Release' : 'Drop here');
      },
      voice: (t: string, ms: number) => runVoiceDemo(t, ms),
      setVoiceText: (t: string) => setVoiceDemoText(t),
      goto,
      openPal: () => setIsPaletteOpen(true),
      closePal: () => setIsPaletteOpen(false),
      setTheme: (t: 'light' | 'dark') => {
        document.documentElement.dataset.theme = t;
        if (t === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        try {
          localStorage.setItem('theme', t);
          localStorage.setItem('kk.theme', JSON.stringify(t));
        } catch {}
      },
      state: { mode, file: currentFile },
    };
  }, [mode, currentFile, voiceDemoText]);

  return (
    <>
      <AuroraBackground />

      <Nav
        onOpenSearch={() => setIsPaletteOpen(true)}
        onOpenPro={() => setIsVoiceSheetOpen(true)}
        isHome={true}
      />

      <div id="stage" className="relative z-[2] min-h-[max(100vh,780px)]">
        {/* Hero Section */}
        <Hero
          onPickSample={handlePickSample}
          onOrbSlotClick={() => fileInputRef.current?.click()}
          hintText={isDragging ? 'Release to let KlipKit read it ✨' : undefined}
        />

        {/* Workspace Section */}
        <Workspace
          file={currentFile}
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
          onOpenVoice={() => setIsVoiceSheetOpen(true)}
          isListening={isListening}
          voiceTranscript={voiceTranscript}
        />

        {/* Single living Orb that flies between hero slot and workspace dock */}
        <Orb
          mode={mode}
          isDragging={isDragging}
          onOrbClick={() => {
            if (mode === 'hero') fileInputRef.current?.click();
          }}
          controllerRef={orbControllerRef}
        />
      </div>

      {/* Sections below stage */}
      <FeelSection />

      <ExploreSection onSelectTool={handleSelectTool} />

      <PricingSection onOpenPro={() => setIsVoiceSheetOpen(true)} />

      {/* SEO Section (Server-rendered FAQs, schemas, keyword blocks preserved) */}
      {seoSection}

      <DesignFooter />

      {/* Drop Veil */}
      <DropVeil isDragging={isDragging} />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectTool={handleSelectTool}
      />

      {/* Pro Voice Sheet */}
      <VoiceSheet
        isOpen={isVoiceSheetOpen}
        onClose={() => setIsVoiceSheetOpen(false)}
        onTryVoiceDemo={() => {
          setIsVoiceSheetOpen(false);
          runVoiceDemo();
        }}
        onSeePlans={() => {
          setIsVoiceSheetOpen(false);
          goto('pricing');
        }}
      />

      {/* Toast */}
      <div
        id="toast"
        className="fixed left-1/2 bottom-[28px] z-80 -translate-x-1/2 translate-y-[30px] opacity-0 px-[22px] py-[14px] rounded-full bg-ink text-bg text-[15px] shadow-[var(--shadow2)] transition-[opacity,transform] duration-400 ease-[cubic-bezier(.2,.9,.3,1.3)] pointer-events-none"
      />

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
          e.target.value = '';
        }}
      />
    </>
  );
}

