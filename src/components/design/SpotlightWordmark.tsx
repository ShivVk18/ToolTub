'use client';

import React, { useEffect, useRef } from 'react';
import { addLoop, getPointer } from '@/lib/animation';

export function SpotlightWordmark() {
  const giantRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanup = addLoop((t) => {
      if (!giantRef.current) return;
      const r = giantRef.current.getBoundingClientRect();
      const innerHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
      if (r.bottom < 0 || r.top > innerHeight) return;

      const ptr = getPointer();
      giantRef.current.style.setProperty('--gx', `${ptr.sx - r.left}px`);
      giantRef.current.style.setProperty('--gy', `${ptr.sy - r.top}px`);
      giantRef.current.style.setProperty('--gr', `${(t * 30) % 360}`);
    });

    return cleanup;
  }, []);

  return (
    <div ref={giantRef} id="giant" className="giant select-none" aria-hidden="true">
      <div className="g1">KlipKit</div>
      <div className="g2">KlipKit</div>
    </div>
  );
}

