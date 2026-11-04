import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import { Footer, Header } from "@/components/layout/Header";
import { themeScript } from "@/components/layout/ThemeToggle";
import { AuroraBackground } from "@/components/design/AuroraBackground";
import { GlobalModals } from "@/components/design/GlobalModals";
import { CommandPalette } from "@/components/search/CommandPalette";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteGraph } from "@/lib/schema";
import { ENTITY_DEFINITION, SITE_URL, THEME_COLOR } from "@/lib/site";
import { searchIndex } from "@/registry/search-index";

const inter = localFont({
  src: [
    { path: "../fonts/Inter-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Inter-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Inter-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

const kkSerif = localFont({
  src: [
    { path: "../fonts/KKSerif-Regular.woff2", weight: "400 700", style: "normal" },
    { path: "../fonts/KKSerif-Italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "KlipKit — Drop anything. Just say what you need.", template: "%s | KlipKit" },
  description: ENTITY_DEFINITION,
  manifest: "/manifest.webmanifest",
};

/** Registers the service worker, then hands it every same-origin URL this page already loaded (first-visit offline). */
const swScript = `if("serviceWorker"in navigator)addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").then(()=>navigator.serviceWorker.ready).then(r=>{var u=[location.href].concat(performance.getEntriesByType("resource").map(e=>e.name).filter(n=>n.indexOf(location.origin)===0));r.active&&r.active.postMessage({type:"cache-urls",urls:u})}).catch(()=>{})})`;

export const viewport: Viewport = { themeColor: THEME_COLOR, width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${inter.variable} ${kkSerif.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh flex flex-col font-sans bg-bg text-ink relative">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:text-bg focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <JsonLd data={siteGraph()} />
        <AuroraBackground />
        <Header />
        <div id="main" className="flex-1 relative z-[2]">
          {children}
        </div>
        <Footer />
        <CommandPalette index={searchIndex} />
        <GlobalModals />
        <Script id="sw-register" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: swScript }} />
      </body>
    </html>
  );
}
