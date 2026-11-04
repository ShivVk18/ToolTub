'use client';

import React from 'react';
import { Nav } from '@/components/design/Nav';
import { DesignFooter } from '@/components/design/DesignFooter';
import { useUIStore } from '@/lib/uiStore';

export function Header() {
  const { openPalette, openVoiceSheet } = useUIStore();
  return <Nav onOpenSearch={openPalette} onOpenPro={openVoiceSheet} isHome={false} />;
}

export function Footer() {
  return <DesignFooter />;
}
