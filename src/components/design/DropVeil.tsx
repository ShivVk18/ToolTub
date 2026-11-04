'use client';

import React, { useEffect, useRef } from 'react';

interface DropVeilProps {
  isDragging: boolean;
}

export function DropVeil({ isDragging }: DropVeilProps) {
  const veilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (veilRef.current) {
        veilRef.current.style.setProperty('--vx', `${e.clientX}px`);
        veilRef.current.style.setProperty('--vy', `${e.clientY}px`);
      }
    };

    window.addEventListener('dragover', handleDragOver, { passive: true });
    return () => {
      window.removeEventListener('dragover', handleDragOver);
    };
  }, []);

  return (
    <div
      ref={veilRef}
      id="veil"
      className={`fixed inset-0 z-30 pointer-events-none transition-opacity duration-350 ${
        isDragging ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background:
          'radial-gradient(circle at var(--vx, 50%) var(--vy, 50%), transparent 0, rgba(14, 12, 30, 0.10) 40%, rgba(14, 12, 30, 0.22))',
      }}
      aria-hidden="true"
    >
      <div className="vb absolute inset-[18px] rounded-[30px] border-2 border-dashed border-[rgba(109,93,245,0.55)]" />
    </div>
  );
}

