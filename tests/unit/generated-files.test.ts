import { describe, expect, it } from "vitest";
import { sitemapGroups } from "@/lib/seo/sitemap";
import { llmsFullTxt, llmsTxt } from "@/lib/seo/llms";
import { isIndexable, routedTools, tools } from "@/registry/tools";
import { toolGraph } from "@/lib/seo/schema";
import { getHub } from "@/registry/categories";

describe("sitemaps", () => {
  const urls = Object.values(sitemapGroups())
    .flat()
    .map((u) => u.loc);
  it("list every live tool and its variants", () => {
    for (const t of tools.filter(isIndexable)) {
      expect(urls).toContain(`https://klipkit.com/${t.slug}`);
      for (const v of t.seo!.longTailVariants ?? []) expect(urls).toContain(`https://klipkit.com/${v.slug}`);
    }
  });
  it("never list beta or planned tools", () => {
    for (const t of tools.filter((x) => !isIndexable(x))) expect(urls).not.toContain(`https://klipkit.com/${t.slug}`);
  });
  it("have no duplicates and valid lastmod dates", () => {
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of Object.values(sitemapGroups()).flat()) expect(u.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("llms.txt", () => {
  it("lists every routed tool URL", async () => {
    const txt = await llmsTxt().text();
    expect(txt.startsWith("# KlipKit")).toBe(true);
    for (const t of routedTools()) expect(txt).toContain(`(https://klipkit.com/${t.slug})`);
  });
  it("llms-full.txt carries every FAQ of tools with content", async () => {
    const txt = await llmsFullTxt().text();
    for (const t of routedTools().filter((x) => x.seo)) for (const f of t.seo!.faqs) expect(txt).toContain(f.q);
  });
});

describe("JSON-LD", () => {
  it("tool graph has WebApplication, BreadcrumbList, HowTo and FAQPage matching the content", () => {
    const t = tools.find((x) => x.slug === "json-formatter")!;
    const g = toolGraph(t, getHub(t.hub)!) as {
      "@graph": { "@type": string; mainEntity?: unknown[]; step?: unknown[] }[];
    };
    const types = g["@graph"].map((n) => n["@type"]);
    expect(types).toEqual(["WebApplication", "BreadcrumbList", "HowTo", "FAQPage"]);
    expect(g["@graph"][3].mainEntity).toHaveLength(t.seo!.faqs.length);
    expect(g["@graph"][2].step).toHaveLength(t.seo!.howToSteps.length);
  });
});
