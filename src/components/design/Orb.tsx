'use client';

import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { addLoop, clamp, ptr } from '@/lib/animation';

export interface OrbController {
  setTargetEnergy: (e: number) => void;
  triggerGulp: (amount?: number) => void;
  setAmplitude: (amp: number) => void;
  setLabel: (text: string) => void;
  getState: () => { x: number; y: number; s: number; e: number; hover: number; init: boolean };
}

interface OrbProps {
  mode: 'hero' | 'work';
  isDragging?: boolean;
  onOrbClick?: () => void;
  controllerRef?: React.MutableRefObject<OrbController | null>;
}

export function Orb({ mode, isDragging = false, onOrbClick, controllerRef }: OrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  const labRef = useRef<HTMLSpanElement>(null);

  const stateRef = useRef({
    x: 0,
    y: 0,
    s: 0.8,
    vx: 0,
    vy: 0,
    vs: 0,
    rot: 0,
    rot2: 0,
    e: 0, // energy (0..1)
    te: 0, // target energy
    amp: 0, // listening amplitude
    hover: 0,
    gulp: 0,
    lab: 1,
    labelText: 'Drop here',
    init: false,
  });

  if (controllerRef) {
    controllerRef.current = {
      setTargetEnergy: (e: number) => {
        stateRef.current.te = e;
      },
      triggerGulp: (amount: number = 1) => {
        stateRef.current.gulp = amount;
      },
      setAmplitude: (amp: number) => {
        stateRef.current.amp = amp;
      },
      setLabel: (text: string) => {
        stateRef.current.labelText = text;
        if (labRef.current) labRef.current.textContent = text;
      },
      getState: () => ({
        x: stateRef.current.x,
        y: stateRef.current.y,
        s: stateRef.current.s,
        e: stateRef.current.e,
        hover: stateRef.current.hover,
        init: stateRef.current.init,
      }),
    };
  }

  // Measure initial target
  useLayoutEffect(() => {
    const BASE = 360;
    const stage = document.getElementById('stage');
    const orbEl = orbRef.current;
    const slot = mode === 'work' ? document.getElementById('orbDock') : document.getElementById('orbSlot');
    if (!stage || !orbEl || !slot) return;

    const sr = stage.getBoundingClientRect();
    const r = slot.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      const targetX = r.left + r.width / 2 - sr.left;
      const targetY = r.top + r.height / 2 - sr.top;
      const targetScale = r.width / BASE;
      stateRef.current.x = targetX;
      stateRef.current.y = targetY + 40;
      stateRef.current.s = targetScale * 0.7;
      stateRef.current.init = true;
      orbEl.style.transform = `translate(${targetX - BASE / 2}px, ${targetY + 40 - BASE / 2}px) scale(${targetScale * 0.7})`;
    }
  }, [mode]);

  useEffect(() => {
    stateRef.current.te = isDragging ? 1 : mode === 'work' ? 0 : 0;
  }, [isDragging, mode]);

  useEffect(() => {
    const BASE = 360;
    const O = stateRef.current;

    const measureAndInit = () => {
      const stage = document.getElementById('stage');
      const slot = mode === 'work' ? document.getElementById('orbDock') : document.getElementById('orbSlot');
      if (!stage || !slot) return;
      const sr = stage.getBoundingClientRect();
      const r = slot.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && !O.init) {
        const targetX = r.left + r.width / 2 - sr.left;
        const targetY = r.top + r.height / 2 - sr.top;
        const targetScale = r.width / BASE;
        O.x = targetX;
        O.y = targetY + 40;
        O.s = targetScale * 0.7;
        O.init = true;
      }
    };

    measureAndInit();
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(measureAndInit);
    }
    window.addEventListener('resize', measureAndInit);

    const cleanup = addLoop((t, dt) => {
      const stage = document.getElementById('stage');
      const orbEl = orbRef.current;
      if (!stage || !orbEl) return;

      const sr = stage.getBoundingClientRect();
      const slot = mode === 'work' ? document.getElementById('orbDock') : document.getElementById('orbSlot');
      if (!slot) return;

      const r = slot.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;

      const targetX = r.left + r.width / 2 - sr.left;
      const targetY = r.top + r.height / 2 - sr.top;
      const targetScale = r.width / BASE;

      if (!O.init) {
        O.x = targetX;
        O.y = targetY + 40;
        O.s = targetScale * 0.7;
        O.init = true;
      }

      let tx = targetX;
      let ty = targetY;

      // Pointer magnet effect in hero mode
      if (mode === 'hero') {
        const dx = ptr.x - (targetX + sr.left);
        const dy = ptr.y - (targetY + sr.top);
        const dist = Math.hypot(dx, dy);
        const near = clamp(1 - dist / 520, 0, 1);
        tx += dx * 0.07 * near;
        ty += dy * 0.07 * near;
        O.hover += ((dist < targetScale * BASE * 0.6 ? 1 : 0) - O.hover) * Math.min(1, dt * 6);

        orbEl.style.setProperty('--hx', `${34 + clamp(dx / 8, -18, 18)}%`);
        orbEl.style.setProperty('--hy', `${28 + clamp(dy / 8, -14, 14)}%`);
      } else {
        O.hover *= 0.9;
      }

      // Spring physics (stiffness 150, damping ratio 0.78)
      const k = 150;
      const c = 2 * Math.sqrt(k) * 0.78;
      O.vx += ((tx - O.x) * k - O.vx * c) * dt;
      O.vy += ((ty - O.y) * k - O.vy * c) * dt;
      O.x += O.vx * dt;
      O.y += O.vy * dt;

      // Scale spring
      const ks = 120;
      const cs = 2 * Math.sqrt(ks) * 0.7;
      O.vs += ((targetScale - O.s) * ks - O.vs * cs) * dt;
      O.s += O.vs * dt;

      // Energy easing
      O.e += (O.te - O.e) * Math.min(1, dt * 3);
      O.gulp *= Math.pow(0.02, dt);

      O.rot += dt * (22 + O.e * 190 + O.hover * 30);
      O.rot2 -= dt * (30 + O.e * 120);

      const breathe = 1 + 0.018 * Math.sin(t * 1.7) + O.e * 0.09 + O.hover * 0.04 + O.amp * 0.16 + O.gulp * 0.14;
      orbEl.style.transform = `translate(${O.x - BASE / 2}px, ${O.y - BASE / 2}px) scale(${Math.max(0.05, O.s * breathe)})`;
      orbEl.style.setProperty('--r', O.rot.toFixed(1));
      orbEl.style.setProperty('--r2', O.rot2.toFixed(1));

      // Label opacity target
      const labelTarget = mode === 'hero' || isDragging ? 1 : 0;
      O.lab += (labelTarget - O.lab) * Math.min(1, dt * 8);
      orbEl.style.setProperty('--lab', O.lab.toFixed(3));
    });

    return () => {
      window.removeEventListener('resize', measureAndInit);
      cleanup();
    };
  }, [mode, isDragging]);

  return (
    <div
      ref={orbRef}
      id="orb"
      onClick={onOrbClick}
      aria-hidden="true"
    >
      <div className="o-glow" />
      <div className="o-ball">
        <div className="o-core" />
        <div className="o-swirl" />
        <div className="o-rim" />
        <div className="o-gloss" />
      </div>
      <div className="o-label">
        <div>
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          <span ref={labRef} id="olab">
            {stateRef.current.labelText}
          </span>
        </div>
      </div>
    </div>
  );
}
