'use client';

import React, { useEffect, useRef } from 'react';
import { addLoop } from '@/lib/animation';
import { type OrbController } from './Orb';

interface SatellitesProps {
  isHero: boolean;
  isDragging?: boolean;
  controllerRef?: React.MutableRefObject<OrbController | null>;
}

const SATS: [string, string][] = [
  ['PDF', '#E5484D'],
  ['{ } JSON', '#6D5DF5'],
  ['MP3', '#D98E04'],
  ['JWT', '#F2734F'],
  ['PNG', '#1F9D63'],
  ['SQL', '#2B5FD9'],
  ['MP4', '#2F80ED'],
  ['#HEX', '#8E5BD9'],
  ['CSV', '#1F9D63'],
];

export function Satellites({ isHero, isDragging = false, controllerRef }: SatellitesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const satRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let satV = 0; // Starts at 0 matching KlipKit_UI.html line 1051
    let satDrag = 0;
    let satSizes: [number, number][] | null = null;
    let isOff = false;

    const cleanup = addLoop((t, dt) => {
      const hero = isHero;
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      const innerHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      // Satellites fade in smoothly; never snap from top (0,0)
      satV += ((hero && scrollY < innerHeight * 0.8 ? 1 : 0) - satV) * Math.min(1, dt * (hero ? 2.2 : 6));
      if (satV < 0.01) {
        if (!isOff) {
          satRefs.current.forEach((el) => {
            if (el) el.style.opacity = '0';
          });
          isOff = true;
        }
        return;
      }

      // Check drag tightening
      const drag = isDragging || (typeof document !== 'undefined' && document.body.classList.contains('dragging')) ? 1 : 0;
      satDrag += (drag - satDrag) * Math.min(1, dt * 4);

      // Locate center of orbit: preferentially from live Orb physics (KlipKit_UI.html line 1057)
      const stage = document.getElementById('stage');
      if (!stage) return;

      const orbState = controllerRef?.current?.getState?.();
      let ox = 0;
      let oy = 0;
      let radius = 95;
      let orbEnergy = 0;
      let orbHover = 0;

      if (orbState && orbState.init && orbState.x > 0 && orbState.y > 0) {
        ox = orbState.x;
        oy = orbState.y;
        radius = (360 * orbState.s) * 0.5;
        orbEnergy = orbState.e || 0;
        orbHover = orbState.hover || 0;
      } else {
        const orbSlot = document.getElementById('orbSlot');
        if (!orbSlot) return;
        const sr = stage.getBoundingClientRect();
        const or = orbSlot.getBoundingClientRect();
        if (or.width === 0 || or.height === 0) return;
        ox = or.left + or.width / 2 - sr.left;
        oy = or.top + or.height / 2 - sr.top;
        radius = or.width * 0.5;
      }

      if (ox === 0 || oy === 0) return;

      isOff = false;

      // Measure dimensions once
      if (!satSizes) {
        satSizes = satRefs.current.map((el) => [el?.offsetWidth || 70, el?.offsetHeight || 38]);
      }

      const sr = stage.getBoundingClientRect();
      const baseRx = radius * (2.05 - satDrag * 0.55) + 34;
      const maxRx = Math.max(120, sr.width * 0.44 - 40);
      const rx = Math.min(baseRx, maxRx);
      const ry = rx * 0.27;
      const tilt = -0.17;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const base = t * (0.22 + orbEnergy * 0.9 + orbHover * 0.12 + satDrag * 1.4);

      satRefs.current.forEach((el, i) => {
        if (!el) return;
        const a = base + (i / SATS.length) * Math.PI * 2;
        const ex = Math.cos(a) * rx;
        const ey = Math.sin(a) * ry;
        const x = ox + ex * ct - ey * st;
        const y = oy + ex * st + ey * ct;
        const z = Math.sin(a);
        const dep = (z + 1) / 2;

        const [w, h] = satSizes![i];
        el.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) scale(${(0.74 + 0.3 * dep).toFixed(3)})`;
        el.style.opacity = ((0.65 + 0.35 * dep) * satV).toFixed(3);
        el.style.zIndex = z > 0 ? '6' : '4';
        el.style.filter = dep < 0.35 ? 'blur(1px)' : 'none';
      });
    });

    return cleanup;
  }, [isHero, isDragging, controllerRef]);

  return (
    <div id="sats" ref={containerRef} aria-hidden="true">
      {SATS.map(([label, color], i) => (
        <div
          key={label}
          ref={(el) => {
            satRefs.current[i] = el;
          }}
          className="sat"
        >
          <i style={{ background: color }} />
          {label}
        </div>
      ))}
    </div>
  );
}
