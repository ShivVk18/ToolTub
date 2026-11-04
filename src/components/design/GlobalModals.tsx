'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { VoiceSheet } from './VoiceSheet';
import { useUIStore } from '@/lib/uiStore';
import { goto } from '@/lib/animation';

export function GlobalModals() {
  const router = useRouter();
  const { isVoiceSheetOpen, closeVoiceSheet } = useUIStore();

  return (
    <>
      <VoiceSheet
        isOpen={isVoiceSheetOpen}
        onClose={closeVoiceSheet}
        onTryVoiceDemo={() => {
          closeVoiceSheet();
          if (typeof window !== 'undefined' && (window as any).__kk?.voice) {
            (window as any).__kk.voice();
          }
        }}
        onSeePlans={() => {
          closeVoiceSheet();
          if (window.location.pathname === '/') {
            goto('pricing');
          } else {
            router.push('/#pricing');
          }
        }}
      />

      {/* Global Toast Pill */}
      <div
        id="toast"
        className="fixed left-1/2 bottom-[28px] z-80 -translate-x-1/2 translate-y-[30px] opacity-0 px-[22px] py-[14px] rounded-full bg-ink text-bg text-[15px] shadow-[var(--shadow2)] transition-[opacity,transform] duration-400 ease-[cubic-bezier(.2,.9,.3,1.3)] pointer-events-none"
      />
    </>
  );
}
