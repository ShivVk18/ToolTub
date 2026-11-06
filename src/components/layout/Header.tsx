"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/layout/Nav";
import { DesignFooter } from "@/components/layout/DesignFooter";
import { useUIStore } from "@/lib/store/ui";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { openPalette, openVoiceSheet } = useUIStore();
  return <Nav onOpenSearch={openPalette} onOpenPro={openVoiceSheet} isHome={isHome} />;
}

export function Footer() {
  return <DesignFooter />;
}
