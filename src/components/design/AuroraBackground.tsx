'use client';

import React, { useEffect, useRef } from 'react';
import { addLoop, clamp, ptr } from '@/lib/animation';

export function AuroraBackground() {
  const bARef = useRef<HTMLDivElement>(null);
  const bBRef = useRef<HTMLDivElement>(null);
  const bCRef = useRef<HTMLDivElement>(null);
  const auraRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate film-grain canvas texture
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 180;
      const x = c.getContext('2d');
      if (x) {
        const d = x.createImageData(180, 180);
        for (let i = 0; i < d.data.length; i += 4) {
          const v = Math.random() * 255;
          d.data[i] = v;
          d.data[i + 1] = v;
          d.data[i + 2] = v;
          d.data[i + 3] = 255;
        }
        x.putImageData(d, 0, 0);
        if (grainRef.current) {
          grainRef.current.style.backgroundImage = `url(${c.toDataURL()})`;
        }
      }
    } catch {
      // Fallback if canvas blocked
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Shared rAF loop update for blobs, aura, and nav background fade
    const cleanup = addLoop((t) => {
      const w = window.innerWidth || 1200;
      const h = window.innerHeight || 800;
      const px = ptr.sx / w - 0.5;
      const py = ptr.sy / h - 0.5;

      if (bARef.current) {
        bARef.current.style.transform = `translate(${Math.sin(t * 0.3) * 4 + px * -3}vw, ${Math.cos(t * 0.27) * 3 + py * -3}vw)`;
      }
      if (bBRef.current) {
        bBRef.current.style.transform = `translate(${Math.cos(t * 0.25) * 5 + px * 4}vw, ${Math.sin(t * 0.31) * 4 + py * 3}vw)`;
      }
      if (bCRef.current) {
        bCRef.current.style.transform = `translate(${Math.sin(t * 0.36 + 1) * 4 + px * 2}vw, ${Math.cos(t * 0.22) * 3 + py * 2}vw)`;
      }

      // Cursor aura update
      if (auraRef.current) {
        auraRef.current.style.transform = `translate(${ptr.sx - 340}px, ${ptr.sy - 340}px)`;
      }

      // Update nav background opacity based on scroll
      const nav = document.getElementById('nav');
      if (nav) {
        nav.style.setProperty('--navbg', String(clamp(window.scrollY / 120, 0, 1)));
      }
    });

    return cleanup;
  }, []);

  return (
    <div
      id="bg"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      <div
        ref={bARef}
        id="bA"
        className="blob absolute rounded-full will-change-transform opacity-[var(--blobOp)]"
        style={{
          width: '62vw',
          height: '62vw',
          left: '-14vw',
          top: '-26vw',
          background: 'radial-gradient(circle closest-side, var(--blobA), transparent 85%)',
        }}
      />
      <div
        ref={bBRef}
        id="bB"
        className="blob absolute rounded-full will-change-transform opacity-[var(--blobOp)]"
        style={{
          width: '56vw',
          height: '56vw',
          left: '58vw',
          top: '30vh',
          background: 'radial-gradient(circle closest-side, var(--blobB), transparent 85%)',
        }}
      />
      <div
        ref={bCRef}
        id="bC"
        className="blob absolute rounded-full will-change-transform opacity-[var(--blobOp)]"
        style={{
          width: '42vw',
          height: '42vw',
          left: '36vw',
          top: '-22vw',
          background: 'radial-gradient(circle closest-side, var(--blobC), transparent 85%)',
        }}
      />
      <div id="aura" ref={auraRef} />
      <div
        ref={grainRef}
        id="grain"
        className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.035] mix-blend-multiply dark:mix-blend-screen bg-[length:180px_180px]"
      />
    </div>
  );
}
