import { hubs } from "@/registry/categories";
import { chains, isChainLive } from "@/registry/chains";
import { isHubIndexable, isIndexable, tools } from "@/registry/tools";
import { SITE_UPDATED, abs } from "./site";

export interface SitemapUrl {
  loc: string;
  lastmod: string;
}

/** Only indexable pages (live + full content). Beta, planned and search pages never appear. */
export function sitemapGroups(): Record<string, SitemapUrl[]> {
  const groups: Record<string, SitemapUrl[]> = {
    pages: [
      { loc: abs("/"), lastmod: SITE_UPDATED },
      ...hubs.filter((h) => isHubIndexable(h.id)).map((h) => ({ loc: abs(`/${h.id}`), lastmod: SITE_UPDATED })),
      ...chains.filter(isChainLive).map((c) => ({ loc: abs(`/chain/${c.slug}`), lastmod: SITE_UPDATED })),
      ...["/about", "/privacy", "/licences"].map((p) => ({ loc: abs(p), lastmod: SITE_UPDATED })),
    ],
  };
  for (const t of tools.filter(isIndexable)) {
    const key = t.hub.replace(/-tools$/, "");
    groups[key] ??= [];
    groups[key].push({ loc: abs(`/${t.slug}`), lastmod: t.seo!.lastReviewed });
    for (const v of t.seo!.longTailVariants ?? [])
      groups[key].push({ loc: abs(`/${v.slug}`), lastmod: t.seo!.lastReviewed });
  }
  return groups;
}

export const xml = (body: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
