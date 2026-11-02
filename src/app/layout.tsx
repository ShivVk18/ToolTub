import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Footer, Header } from "@/components/layout/Header";
import { themeScript } from "@/components/layout/ThemeToggle";
import { CommandPalette } from "@/components/search/CommandPalette";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteGraph } from "@/lib/schema";
import { ENTITY_DEFINITION, SITE_URL, THEME_COLOR } from "@/lib/site";
import { searchIndex } from "@/registry/search-index";

// Fonts: Geist (OFL-1.1) from the `geist` npm package, bundled and served from our own domain.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "KlipKit – Free, Private Online Tools", template: "%s | KlipKit" },
  description: ENTITY_DEFINITION,
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: THEME_COLOR, width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
          Skip to content
        </a>
        <JsonLd data={siteGraph()} />
        <Header />
        <div id="main" className="flex-1">{children}</div>
        <Footer />
        <CommandPalette index={searchIndex} />
        <script dangerouslySetInnerHTML={{ __html: `if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js"))` }} />
      </body>
    </html>
  );
}
