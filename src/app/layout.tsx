import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Footer, Header } from "@/components/layout/Header";
import { themeScript } from "@/components/layout/ThemeToggle";
import { CommandPalette } from "@/components/search/CommandPalette";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteGraph } from "@/lib/schema";
import { ENTITY_DEFINITION, SITE_URL, THEME_COLOR } from "@/lib/site";
import { searchIndex } from "@/registry/search-index";

// Font: Geist Sans (OFL-1.1), bundled and served from our own domain. display: "optional" means the
// font is used only if it arrives within the first ~100 ms; otherwise the system font stays, so a late
// font swap can't push back Largest Contentful Paint (measured: LCP 3.0 s → see docs/QA-REPORT.md).
// Code uses the system monospace stack (saves a second 71 KB font on every page).
const geistSans = localFont({ src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2", variable: "--font-geist-sans", display: "optional", weight: "100 900" });
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "KlipKit – Free, Private Online Tools", template: "%s | KlipKit" },
  description: ENTITY_DEFINITION,
  manifest: "/manifest.webmanifest",
};

/** Registers the service worker, then hands it every same-origin URL this page already loaded (first-visit offline). */
const swScript = `if("serviceWorker"in navigator)addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").then(()=>navigator.serviceWorker.ready).then(r=>{var u=[location.href].concat(performance.getEntriesByType("resource").map(e=>e.name).filter(n=>n.indexOf(location.origin)===0));r.active&&r.active.postMessage({type:"cache-urls",urls:u})}).catch(()=>{})})`;

export const viewport: Viewport = { themeColor: THEME_COLOR, width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} antialiased`} suppressHydrationWarning>
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
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
      </body>
    </html>
  );
}
