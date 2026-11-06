"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/design/Nav";
import { DesignFooter } from "@/components/design/DesignFooter";
import { useUIStore } from "@/lib/uiStore";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { openPalette, openVoiceSheet } = useUIStore();
  return <Nav onOpenSearch={openPalette} onOpenPro={openVoiceSheet} isHome={isHome} />;
}

export function Footer() {
  return <DesignFooter />;
}
