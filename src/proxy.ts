import { NextResponse, type NextRequest } from "next/server";
import { hubs } from "@/registry/categories";
import { chains, isChainLive } from "@/registry/chains";
import { routedTools } from "@/registry/tools";

/**
 * Hard 404s for unknown keyword URLs. With Cache Components, a page that calls notFound() after the
 * shell starts streaming can answer 200 on first hit (a "soft 404" for Google). Rejecting unknown slugs
 * here, before rendering, guarantees a real 404 status.
 */
const STATIC = ["about", "privacy", "licences", "search"];
const SLUGS = new Set([
  ...STATIC,
  ...hubs.map((h) => h.id),
  ...routedTools().flatMap((t) => [t.slug, ...(t.seo?.longTailVariants?.map((v) => v.slug) ?? [])]),
]);
const CHAINS = new Set(chains.filter(isChainLive).map((c) => c.slug));

export function proxy(req: NextRequest) {
  const parts = req.nextUrl.pathname.split("/").filter(Boolean);
  const ok =
    parts.length === 1 ? SLUGS.has(parts[0]) : parts.length === 2 && parts[0] === "chain" ? CHAINS.has(parts[1]) : true;
  if (ok) return NextResponse.next();
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | KlipKit</title></head><body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem"><h1>Page not found</h1><p>This tool doesn't exist (yet). <a href="/">Search all KlipKit tools</a>.</p></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

// Only keyword URLs and chains: skip assets, API, Next internals and files with extensions.
export const config = { matcher: ["/((?!api|_next|og|sitemaps|vendor|models|.*\\..*).+)"] };
