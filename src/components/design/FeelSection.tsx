'use client';

import React, { useEffect, useRef, useState } from 'react';
import { addLoop } from '@/lib/animation';
import { parse, markHTML } from '@/lib/intent';
import { detect, genParse, PT_TILE, PT_COLOR, PSUG, cap } from '@/lib/detect';
import { KINDS } from '@/lib/fileKind';

const DEMOS: [string, 'pdf' | 'video' | 'image' | null, string][] = [
  ['compress to under 2 mb and split pages 1-5', 'pdf', 'Q3-report.pdf'],
  ['make a gif and extract the audio', 'video', 'launch-teaser.mp4'],
  ['remove the background and convert to webp', 'image', 'product-shot.png'],
  ['generate 10 uuids', null, ''],
];

const PASTE_SAMPLES = [
  '{"user":{"id":42,"roles":["admin"]},"active":true}',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiJ9.c2ln',
  '*/15 9-18 * * 1-5',
  '#6D5DF5',
  '1730592000',
  'SELECT * FROM orders WHERE total > 500',
];

export function FeelSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const fdropRef = useRef<HTMLDivElement>(null);
  const ftapRef = useRef<HTMLDivElement>(null);
  const fringRef = useRef<HTMLDivElement>(null);
  const fchkRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<(HTMLElement | null)[]>([]);

  // Bento state refs
  const bdFileRef = useRef<HTMLDivElement>(null);
  const bdTextRef = useRef<HTMLDivElement>(null);
  const bdPlanRef = useRef<HTMLDivElement>(null);
  const bpBoxRef = useRef<HTMLDivElement>(null);
  const bpCodeRef = useRef<HTMLDivElement>(null);
  const bpDetRef = useRef<HTMLDivElement>(null);
  const bpChipsRef = useRef<HTMLDivElement>(null);
  const lockDotRef = useRef<HTMLDivElement>(null);
  const keyK1Ref = useRef<HTMLDivElement>(null);
  const keyK2Ref = useRef<HTMLDivElement>(null);
  const kHintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastDemoKey = '';
    let lastPasteIdx = -1;

    const cleanup = addLoop((t) => {
      if (!sectionRef.current) return;
      const r = sectionRef.current.getBoundingClientRect();
      const innerHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      if (r.bottom < 0 || r.top > innerHeight) return;

      // 1. Bento Big: Live typing intent demo
      const cyc = 5.2;
      const demoIdx = Math.floor(t / cyc) % DEMOS.length;
      const lt = t % cyc;
      const [demoStr, demoKind, demoFile] = DEMOS[demoIdx];
      const charCount = lt < 2.6 ? Math.floor((lt / 2.6) * demoStr.length) : demoStr.length;
      const textVal = demoStr.slice(0, charCount);
      const isBlink = lt < 4.4 && Math.floor(t * 2.4) % 2 === 0;

      const demoKey = `${demoIdx}|${charCount}|${isBlink ? 1 : 0}`;
      if (demoKey !== lastDemoKey) {
        lastDemoKey = demoKey;

        let spans: [number, number, { i: number }][] = [];
        let steps: { t: string; d?: string; i?: number }[] = [];

        if (demoKind) {
          const res = parse(textVal, demoKind);
          spans = res.spans;
          steps = res.steps;
        } else {
          const g = genParse(textVal);
          if (g) {
            spans = g.spans;
            steps = [{ t: g.g.t, d: g.n ? String(g.n) : '', i: 0 }];
          }
        }

        if (bdTextRef.current) {
          const hl = markHTML(textVal, spans, false).replace(
            /<mark style="border-color:var\(--u(\d)\)">/g,
            '<mark class="bm" style="--hl:var(--h$1);--ul:var(--u$1)">'
          );
          bdTextRef.current.innerHTML = `${hl}<span class="bcar" style="opacity:${isBlink ? 1 : 0}"></span>`;
        }

        if (bdFileRef.current) {
          bdFileRef.current.innerHTML = demoFile && demoKind
            ? `<span class="ftile" style="background:${KINDS[demoKind].c};width:26px;height:30px;font-size:9px;border-radius:7px;display:grid;place-items:center;color:#fff;font-weight:bold">${KINDS[demoKind].l}</span>${demoFile}`
            : `<span class="ftile" style="background:var(--accent);width:26px;height:30px;font-size:11px;border-radius:7px;display:grid;place-items:center;color:#fff">✦</span>No file needed`;
        }

        if (bdPlanRef.current) {
          bdPlanRef.current.innerHTML = steps
            .map(
              (s, j) =>
                `${j ? '<span style="color:var(--faint)">→</span>' : ''}<span class="pv inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-full text-[13px] font-medium bg-solid border border-line"><i style="width:7px;height:7px;border-radius:50%;display:inline-block;background:var(--u${(s.i ?? j) % 4})"></i>${s.t}${s.d ? ` <span style="color:var(--muted);font-weight:400">· ${s.d}</span>` : ''}</span>`
            )
            .join('');
        }
      }

      // 2. Bento Paste: Live snippet cycle
      const pCyc = 2.8;
      const pIdx = Math.floor(t / pCyc) % PASTE_SAMPLES.length;
      const pLt = t % pCyc;

      if (bpBoxRef.current) {
        bpBoxRef.current.style.opacity = String(
          pLt < 0.35 ? pLt / 0.35 : pLt > 2.45 ? (pCyc - pLt) / 0.35 : 1
        );
        bpBoxRef.current.style.transform = `translateY(${pLt < 0.35 ? (1 - pLt / 0.35) * 8 : 0}px)`;
      }

      if (pIdx !== lastPasteIdx) {
        lastPasteIdx = pIdx;
        const raw = PASTE_SAMPLES[pIdx];
        const d = detect(raw);

        if (bpCodeRef.current) bpCodeRef.current.textContent = raw;
        if (bpDetRef.current) {
          bpDetRef.current.innerHTML = `<span class="ftile" style="background:${PT_COLOR[d.pt]};width:28px;height:28px;border-radius:8px;font-size:${PT_TILE[d.pt].length > 3 ? 8 : 11}px;display:grid;place-items:center;color:#fff;font-weight:bold">${PT_TILE[d.pt]}</span>Detected: <b>${cap(d.l)}</b>`;
        }
        if (bpChipsRef.current) {
          bpChipsRef.current.innerHTML = (PSUG[d.pt] || [])
            .slice(0, 3)
            .map(
              (x) =>
                `<span class="pv inline-flex items-center px-[12px] py-[6px] rounded-full text-[13px] font-medium bg-solid border border-line">${x[0]}</span>`
            )
            .join('');
        }
      }

      // 3. Bento Keys: 3D keycaps pressing
      const keyCyc = t % 2.2;
      const k1Down = keyCyc > 0.35 && keyCyc < 0.67;
      const k2Down = keyCyc > 0.47 && keyCyc < 0.79;
      if (keyK1Ref.current) keyK1Ref.current.classList.toggle('dn', k1Down);
      if (keyK2Ref.current) keyK2Ref.current.classList.toggle('dn', k2Down);
      if (kHintRef.current) {
        kHintRef.current.style.opacity = String(keyCyc > 0.7 && keyCyc < 1.9 ? 1 : 0.35);
      }

      // 4. Bento Privacy: Orbiting lock dot
      const lockAngle = t * 1.4;
      if (lockDotRef.current) {
        lockDotRef.current.style.transform = `translate(${Math.cos(lockAngle) * 44}px, ${Math.sin(lockAngle) * 44}px)`;
      }

      // 5. One drop animation
      const c = t % 1.8;
      const p = Math.min(1, c / 0.55);
      const y =
        c < 0.55
          ? -90 + 126 * p * p
          : 36 - Math.abs(Math.sin((c - 0.55) * 9)) * Math.exp(-(c - 0.55) * 5) * 14;
      if (fdropRef.current) {
        fdropRef.current.style.transform = `translateY(${y}px)`;
        fdropRef.current.style.opacity = String(c > 1.55 ? 1 - (c - 1.55) / 0.25 : 1);
      }

      // 6. One tap animation
      const c2 = t % 1.4;
      const pr = c2 < 0.2 ? Math.sin((c2 / 0.2) * Math.PI) : 0;
      if (ftapRef.current) {
        ftapRef.current.style.transform = `scale(${1 - 0.07 * pr})`;
        const dn = c2 > 0.15 && c2 < 0.9;
        ftapRef.current.style.background = dn ? 'var(--ok)' : 'var(--ink)';
        ftapRef.current.style.color = dn ? '#fff' : 'var(--bg)';
        ftapRef.current.textContent = dn ? '✓ Done' : 'Compress';
      }
      if (fringRef.current) {
        fringRef.current.style.opacity = String(c2 < 0.7 ? 0.8 * (1 - c2 / 0.7) : 0);
        fringRef.current.style.transform = `scale(${0.4 + c2 * 2.4})`;
      }

      // 7. Done check + sparks
      const c3 = t % 2.2;
      if (fchkRef.current) {
        fchkRef.current.style.transform = `scale(${
          Math.min(1, c3 / 0.35) * (1 + 0.15 * Math.sin(Math.min(1, c3 / 0.5) * Math.PI))
        })`;
      }
      sparksRef.current.forEach((s, i) => {
        if (!s) return;
        const a = (i / 10) * Math.PI * 2;
        const pp = 1 - Math.pow(1 - Math.min(1, c3 / 0.9), 3);
        s.style.opacity = String(c3 < 1.2 ? 1 - pp * 0.9 : 0);
        s.style.transform = `translate(${Math.cos(a) * (20 + pp * 110)}px, ${
          Math.sin(a) * (20 + pp * 80) - 5
        }px) rotate(${pp * 180}deg)`;
      });
    });

    return cleanup;
  }, []);

  const sparkColors = ['#A99BFF', '#FFB38A', '#7CD3A8', '#FFD45C', '#E5484D'];

  return (
    <section
      ref={sectionRef}
      id="feel"
      className="sec relative z-[2] px-[clamp(20px,6vw,140px)] py-[clamp(80px,12vh,140px)]"
    >
      <span className="eyb">
        <i>01</i>Why KlipKit
      </span>

      <h2 className="sh font-serif font-medium text-[clamp(40px,4.4vw,84px)] tracking-[-0.025em] leading-[1.04] text-center text-ink">
        Easy to use. <em className="text-muted not-italic italic">Actually enjoyable.</em>
      </h2>
      <p className="sp text-center text-ink2 text-[19px] mt-[14px]">
        Most tool sites feel like work. KlipKit feels like magic, without the learning curve.
      </p>

      {/* 12-Column Bento Grid matching KlipKit_UI.html */}
      <div className="bento" id="bento">
        {/* b-big: Live Typing Intent Demo (7 cols, 2 rows) */}
        <div className="bt b-big">
          <div className="tagl">✦ Say it like you'd say it</div>
          <h3>
            Type it the way you'd say it.
            <br />
            <em style={{ color: 'var(--muted)' }}>KlipKit builds the plan.</em>
          </h3>
          <p>
            Every phrase is understood as you type — highlighted, turned into steps, and run on your device.
          </p>

          <div className="bdemo">
            <div className="bfile" ref={bdFileRef} />
            <div className="bcomp font-sans" ref={bdTextRef} />
            <div className="bplan" ref={bdPlanRef} />
          </div>

          <div className="bstat">
            <div>
              <b>76</b>
              <span>tools in one place</span>
            </div>
            <div>
              <b>0.8 ms</b>
              <span>typical dev-tool run</span>
            </div>
            <div>
              <b>0</b>
              <span>accounts needed</span>
            </div>
          </div>
        </div>

        {/* b-paste: Paste Snippet Detector (5 cols) */}
        <div className="bt b-paste">
          <div className="tagl">&#123; &#125; Paste anything</div>
          <h3>It knows what you pasted.</h3>
          <p>
            JSON, a JWT, cron, colours, timestamps, SQL — detected instantly, with the right next step.
          </p>

          <div id="bpBox" ref={bpBoxRef}>
            <div id="bpCode" ref={bpCodeRef} />
            <div id="bpDet" ref={bpDetRef} />
            <div id="bpChips" ref={bpChipsRef} />
          </div>
        </div>

        {/* b-priv: Privacy By Design (3 cols) */}
        <div className="bt b-priv">
          <div className="tagl">🔒 Private by design</div>
          <div className="zero">0</div>
          <p style={{ marginTop: '2px' }}>
            bytes uploaded for most tools. Your files and tokens stay on your device.
          </p>
          <div className="lockw" aria-hidden="true">
            <div className="ring" />
            <div id="lockDot" ref={lockDotRef} />
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="5" y="10" width="14" height="10" rx="3" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
        </div>

        {/* b-keys: 2-Keys Keyboard Shortcut (2 cols) */}
        <div className="bt b-keys">
          <div className="tagl">⌘ Keyboard</div>
          <h3 style={{ fontSize: '30px' }}>Two keys.</h3>
          <div className="keys" aria-hidden="true">
            <div className="kc" ref={keyK1Ref}>⌘</div>
            <div className="kc" ref={keyK2Ref}>K</div>
          </div>
          <div id="kHint" ref={kHintRef}>Any tool, instantly</div>
        </div>

        {/* Feature Card 1: One drop (4 cols) */}
        <div className="fc bt text-center">
          <div className="ill relative h-[210px] rounded-[22px] bg-soft border border-line overflow-hidden" aria-hidden="true">
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '128px',
                width: '120px',
                height: '52px',
                marginLeft: '-60px',
                border: '3px solid #CFC6FF',
                borderTop: 'none',
                borderRadius: '0 0 18px 18px',
              }}
            />
            <div
              ref={fdropRef}
              id="fdrop"
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                width: '58px',
                height: '70px',
                marginLeft: '-29px',
                borderRadius: '12px',
                background: '#D9383E',
                color: '#fff',
                font: '700 13px var(--font-sans)',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 10px 20px -8px rgba(229,72,77,0.6)',
              }}
            >
              PDF
            </div>
          </div>
          <h3 className="font-serif font-medium text-[26px] mt-[20px] text-ink">One drop.</h3>
          <p className="text-ink2 text-[16px] mt-[6px]">
            Drop a file or paste anything. KlipKit knows what it is.
          </p>
        </div>

        {/* Feature Card 2: One tap (4 cols) */}
        <div className="fc bt text-center">
          <div className="ill relative h-[210px] rounded-[22px] bg-soft border border-line overflow-hidden" aria-hidden="true">
            <div
              ref={ftapRef}
              id="ftap"
              style={{
                position: 'absolute',
                left: '50%',
                top: '72px',
                width: '190px',
                height: '62px',
                marginLeft: '-95px',
                borderRadius: '999px',
                background: 'var(--ink)',
                color: 'var(--bg)',
                font: '600 19px var(--font-sans)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              Compress
            </div>
            <div
              ref={fringRef}
              id="fring"
              style={{
                position: 'absolute',
                left: '50%',
                top: '73px',
                width: '60px',
                height: '60px',
                marginLeft: '-30px',
                borderRadius: '50%',
                border: '3px solid var(--accent)',
                opacity: 0,
                pointerEvents: 'none',
              }}
            />
          </div>
          <h3 className="font-serif font-medium text-[26px] mt-[20px] text-ink">One tap.</h3>
          <p className="text-ink2 text-[16px] mt-[6px]">
            Tap a suggestion, or just say it.
          </p>
        </div>

        {/* Feature Card 3: Done (4 cols) */}
        <div className="fc bt text-center">
          <div className="ill relative h-[210px] rounded-[22px] bg-soft border border-line overflow-hidden" aria-hidden="true">
            <div
              ref={fchkRef}
              id="fchk"
              style={{
                position: 'absolute',
                left: '50%',
                top: '58px',
                width: '84px',
                height: '84px',
                marginLeft: '-42px',
                borderRadius: '50%',
                background: 'var(--ok)',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 12px 30px -10px rgba(31,157,99,0.6)',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            {Array.from({ length: 10 }).map((_, i) => (
              <i
                key={i}
                ref={(el) => {
                  sparksRef.current[i] = el;
                }}
                className="fsp"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '100px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '3px',
                  background: sparkColors[i % 5],
                  display: 'block',
                }}
              />
            ))}
          </div>
          <h3 className="font-serif font-medium text-[26px] mt-[20px] text-ink">Done.</h3>
          <p className="text-ink2 text-[16px] mt-[6px]">
            Results in seconds, with a little delight.
          </p>
        </div>
      </div>

      {/* Reassurance badge row */}
      <div className="nos flex justify-center gap-[18px] max-[640px]:gap-[10px] text-[15px] font-medium text-ink2 mt-[44px] flex-wrap select-none">
        <span>No sign-ups</span>
        <span aria-hidden="true">·</span>
        <span>No pop-ups</span>
        <span aria-hidden="true">·</span>
        <span>No waiting</span>
        <span aria-hidden="true">·</span>
        <span>No uploads</span>
        <span aria-hidden="true">·</span>
        <span>No clutter</span>
      </div>
    </section>
  );
}
