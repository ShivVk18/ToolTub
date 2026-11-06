"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/layout/Nav";
import { DesignFooter } from "@/components/layout/DesignFooter";
import { useUIStore } from "@/lib/store/ui";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { openPalette } = useUIStore();
  // As in the reference, Pro and Go Pro scroll to pricing; the voice sheet opens from the Pro plan and the mic.
  return <Nav onOpenSearch={openPalette} isHome={isHome} />;
}

export function Footer() {
  return <DesignFooter />;
}
