'use client';

import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { KINDS, SAMPLES } from '@/lib/fileKind';
import { genParse, looksLikeContent } from '@/lib/detect';
import { markHTML } from '@/lib/intent';
import { addLoop } from '@/lib/animation';

interface HeroProps {
  onPickSample: (sampleKey: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onOrbSlotClick: () => void;
  onPasteText?: (text: string) => void;
  onSubmitAsk?: (text: string) => void;
  hintText?: string;
}

const TYPEWRITER_EXAMPLES = [
  'generate 10 UUIDs',
  'compress to under 2 MB',
  'is this JWT expired?',
  'remove the background',
  'sha256 of hello',
  'format this JSON',
  'convert to webp',
  'lorem ipsum, 3 paragraphs',
];

export function Hero({
  onPickSample,
  onOrbSlotClick,
  onPasteText,
  onSubmitAsk,
  hintText,
}: HeroProps) {
  const [askValue, setAskValue] = useState('');
  const [placeholder, setPlaceholder] = useState('Try “generate 10 UUIDs” — or paste anything');
  const [mirrorHtml, setMirrorHtml] = useState('');
  const [recents, setRecents] = useState<string[]>([]);

  const askInputRef = useRef<HTMLInputElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const squigRef = useRef<SVGSVGElement>(null);
  const squigPathRef = useRef<SVGPathElement>(null);

  // Load recents
  useEffect(() => {
    try {
      const stored = localStorage.getItem('kk.recents');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecents(parsed.slice(0, 3));
        }
      }
    } catch {}
  }, []);

  // Hand-drawn squiggle underline placement
  const placeSquiggle = () => {
    if (!h1Ref.current || !squigRef.current || !squigPathRef.current) return;
    const ws = h1Ref.current.querySelectorAll('.l2 .w');
    if (ws.length < 3) return;

    // ws[1] is "just", ws[2] is "say"
    const a = ws[1].getBoundingClientRect();
    const b = ws[2].getBoundingClientRect();
    const h = h1Ref.current.getBoundingClientRect();
    const sq = squigRef.current;
    const w = b.right - a.left + 12;

    sq.style.left = `${a.left - h.left - 6}px`;
    sq.style.top = `${a.bottom - h.top - 4}px`;
    sq.style.width = `${w}px`;
    sq.setAttribute('viewBox', `0 0 ${w} 26`);

    const p = `M4 16 C ${w * 0.18} 6, ${w * 0.34} 22, ${w * 0.5} 13 S ${w * 0.82} 5, ${w - 4} 15`;
    const sqP = squigPathRef.current;
    sqP.setAttribute('d', p);
    const L = sqP.getTotalLength();
    sqP.style.strokeDasharray = String(L);
    sqP.style.setProperty('--L', String(L));
    sq.classList.add('go');
  };

  useLayoutEffect(() => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        placeSquiggle();
      });
    } else {
      placeSquiggle();
    }
    window.addEventListener('resize', placeSquiggle);
    return () => window.removeEventListener('resize', placeSquiggle);
  }, []);

  // Typewriter placeholder animation loop
  useEffect(() => {
    let lastPh = '';
    const cleanup = addLoop((t) => {
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
      const cursor = lt < 3.0 && Math.floor(t * 2.6) % 2 ? '▍' : '';
      const ph = `Try “${s.slice(0, Math.max(0, n))}${cursor}” — or paste anything`;
      if (ph !== lastPh) {
        setPlaceholder(ph);
        lastPh = ph;
      }
    });
    return cleanup;
  }, [askValue]);

  // Live syntax highlight for Hero ask input
  const handleAskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAskValue(val);

    const parsed = genParse(val);
    const spans = parsed?.spans || [];
    setMirrorHtml(markHTML(val, spans, true) + '&#8203;');
  };

  const handleAskSubmit = () => {
    const v = askValue.trim();
    if (!v) return;
    setAskValue('');
    setMirrorHtml('');

    if (looksLikeContent(v)) {
      onPasteText?.(v);
    } else {
      onSubmitAsk?.(v);
    }
  };

  const line1Words = ['Drop', 'it.', 'Paste', 'it.'];
  const line2Words = ['Or', 'just', 'say', 'what', 'you', 'need.'];

  return (
    <section id="hero" aria-label="Drop a file">
      <div className="eyebrow inline-flex items-center gap-[10px] px-[16px] py-[8px] rounded-full border border-line bg-panel backdrop-blur-[10px] text-[15px] text-muted select-none">
        <b className="text-accent font-semibold">✦</b> 76 tools · Runs on your device · Free forever
      </div>

      <h1
        ref={h1Ref}
        id="h1"
        className="font-serif font-medium text-center tracking-[-0.025em] leading-[1.02] text-[clamp(48px,5.9vw,112px)] mt-[22px] relative px-4"
      >
        <span className="l1 block">
          {line1Words.map((w, i) => (
            <React.Fragment key={w + i}>
              <span
                className="w inline-block opacity-0 translate-y-[0.35em] blur-[10px] animate-[wordIn_0.9s_cubic-bezier(.2,.8,.2,1)_forwards]"
                style={{ animationDelay: `${0.15 + i * 0.07}s` }}
              >
                {w}
              </span>{' '}
            </React.Fragment>
          ))}
        </span>
        <span className="l2 block italic text-muted">
          {line2Words.map((w, i) => (
            <React.Fragment key={w + i}>
              <span
                className="w inline-block opacity-0 translate-y-[0.35em] blur-[10px] animate-[wordIn_0.9s_cubic-bezier(.2,.8,.2,1)_forwards]"
                style={{ animationDelay: `${0.15 + 0.32 + i * 0.07}s` }}
              >
                {w}
              </span>{' '}
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
        <span className="sr-only"> — Free online tools that run on your device.</span>
      </h1>

      <div
        id="orbSlot"
        role="button"
        tabIndex={0}
        aria-label="Choose a file"
        onClick={onOrbSlotClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOrbSlotClick();
          }
        }}
        className="w-[clamp(170px,13.2vw,240px)] h-[clamp(170px,13.2vw,240px)] mt-[clamp(28px,3.8vh,48px)] flex-none cursor-pointer rounded-full outline-none focus-visible:ring-4 focus-visible:ring-accent"
      />

      <p id="hint" className="hint mt-[clamp(24px,3.2vh,36px)] text-[18px] text-muted text-center min-h-[26px] transition-colors px-4">
        {hintText || 'Drop a file, paste text or code, or just ask:'}
      </p>

      {/* Hero Ask Bar */}
      <div className="ask" role="search">
        <div className="askf">
          <div
            id="heroMirror"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: mirrorHtml }}
          />
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
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAskSubmit();
              }
            }}
          />
        </div>
        <button
          type="button"
          id="heroGo"
          className={askValue.trim() ? 'on' : ''}
          aria-label="Go"
          onClick={handleAskSubmit}
        >
          ↵
        </button>
      </div>

      {/* Sample chips + Dashed alt chips */}
      <div id="samples" className="samples flex gap-[10px] mt-[18px] flex-wrap justify-center px-4 items-center">
        {Object.entries(SAMPLES)
          .filter(([k]) => ['pdf', 'image', 'audio'].includes(k))
          .map(([k, s]) => (
            <button
              key={k}
              type="button"
              data-sample={k}
              onClick={(e) => onPickSample(k, e)}
              className="chip inline-flex items-center gap-[9px] h-[44px] px-[18px] rounded-full bg-solid border border-line text-[16px] font-medium shadow-[0_6px_18px_-12px_rgba(0,0,0,0.25)] transition-[transform,border-color,box-shadow,background] duration-250 hover:-translate-y-[2px] hover:border-line2 hover:shadow-[0_12px_26px_-14px_rgba(0,0,0,0.3)] active:scale-[0.96]"
            >
              <span
                className="dot w-[9px] h-[9px] rounded-[3px]"
                style={{ background: KINDS[k as keyof typeof KINDS]?.c }}
              />
              {s.label}
            </button>
          ))}

        <div className="sep" aria-hidden="true" />

        {/* Dashed Alt Chips */}
        <button
          type="button"
          data-alt="0"
          className="chip alt inline-flex items-center gap-[9px] h-[44px] px-[18px] rounded-full border border-line text-[15px] font-medium transition-[transform,border-color,background] hover:-translate-y-[2px] hover:border-line2 active:scale-[0.96]"
          onClick={() =>
            onPasteText?.('{"user":{"id":42,"name":"Asha Rao","roles":["admin"],"active":true}}')
          }
        >
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>&#123; &#125;</span> Paste JSON
        </button>

        <button
          type="button"
          data-alt="1"
          className="chip alt inline-flex items-center gap-[9px] h-[44px] px-[18px] rounded-full border border-line text-[15px] font-medium transition-[transform,border-color,background] hover:-translate-y-[2px] hover:border-line2 active:scale-[0.96]"
          onClick={() =>
            onPasteText?.(
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFzaGEgUmFvIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
            )
          }
        >
          <span style={{ color: '#F2734F', fontWeight: 600 }}>JWT</span> Paste a token
        </button>

        <button
          type="button"
          data-alt="2"
          className="chip alt inline-flex items-center gap-[9px] h-[44px] px-[18px] rounded-full border border-line text-[15px] font-medium transition-[transform,border-color,background] hover:-translate-y-[2px] hover:border-line2 active:scale-[0.96]"
          onClick={() => onSubmitAsk?.('generate 10 uuids')}
        >
          <span style={{ color: 'var(--accent)' }}>✦</span> Generate UUIDs
        </button>
      </div>

      <div id="recents" className="recents mt-[14px] text-[14px] text-muted flex gap-[8px] items-center min-h-[30px] flex-wrap justify-center px-4">
        {recents.length > 0 && (
          <>
            <span>Recent:</span>
            {recents.map((r) => (
              <span key={r} className="r px-[12px] py-[5px] rounded-full bg-panel border border-line max-w-[200px] truncate inline-block align-middle" title={r}>
                {r}
              </span>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
