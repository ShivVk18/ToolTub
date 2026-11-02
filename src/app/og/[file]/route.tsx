import { ImageResponse } from "next/og";
import { hubs } from "@/registry/categories";
import { chains, isChainLive } from "@/registry/chains";
import { routedTools } from "@/registry/tools";

/** One brand template for every OG image, prerendered at build time (/og/compress-pdf.png …). */
function entries() {
  const map = new Map<string, { title: string; sub: string }>();
  for (const t of routedTools()) {
    map.set(t.slug, { title: t.seo?.h1 ?? t.name, sub: t.tagline });
    for (const v of t.seo?.longTailVariants ?? []) map.set(v.slug, { title: v.h1, sub: t.tagline });
  }
  for (const h of hubs) map.set(h.id, { title: h.h1, sub: h.description });
  for (const c of chains.filter(isChainLive)) map.set(`chain-${c.slug}`, { title: c.name, sub: c.description });
  return map;
}

export function generateStaticParams() {
  return [...entries().keys()].map((k) => ({ file: `${k}.png` }));
}

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const e = entries().get((await params).file.replace(/\.png$/, ""));
  if (!e) return new Response("Not found", { status: 404 });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0B0B0F", color: "#EDEDF0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 600 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: "#EDEDF0", color: "#0B0B0F", display: "flex", alignItems: "center", justifyContent: "center" }}>K</div>
          KlipKit
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>{e.title}</div>
          <div style={{ fontSize: 32, color: "#9A9AA6", maxWidth: 1000 }}>{e.sub}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#34D399" }}>Runs on your device · No sign-up · Free</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
