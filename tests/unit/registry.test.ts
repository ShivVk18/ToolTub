import { describe, expect, it } from "vitest";
import { canChain, getTool, isIndexable, routedTools, tools } from "@/registry/tools";
import { chains } from "@/registry/chains";
import { hubs } from "@/registry/categories";
import { people } from "@/registry/people";
import { deps, platformDeps } from "@/registry/dependencies";
import { catalog, PANEL_SLUGS } from "@/registry/catalog";
import { HOME } from "@/registry/home";
import { TOOLS, toolBySlug } from "@/lib/designTools";
import { PANELS } from "@/lib/livePanels";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const live = tools.filter(isIndexable);

describe("registry integrity", () => {
  it("has 79 tools with unique slugs", () => {
    expect(tools.length).toBe(79);
    expect(new Set(tools.map((t) => t.slug)).size).toBe(tools.length);
  });
  it("uses lowercase-hyphen slugs only", () => {
    for (const t of tools) expect(t.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  it("points every tool at an existing hub", () => {
    for (const t of tools)
      expect(
        hubs.some((h) => h.id === t.hub),
        t.slug,
      ).toBe(true);
  });
  it("has no related-tool links to unknown slugs", () => {
    for (const t of tools) for (const r of t.relatedTools) expect(getTool(r), `${t.slug} → ${r}`).toBeDefined();
  });
  it("never lets a variant, hub or reserved path collide with a tool slug", () => {
    const all = [
      ...tools.map((t) => t.slug),
      ...hubs.map((h) => h.id),
      ...tools.flatMap((t) => t.seo?.longTailVariants?.map((v) => v.slug) ?? []),
      "about",
      "privacy",
      "licences",
      "search",
      "chain",
      "api",
      "og",
    ];
    expect(new Set(all).size).toBe(all.length);
  });
  it("only uses allowed licences (no AGPL/GPL)", () => {
    const allowed = [
      "MIT",
      "Apache-2.0",
      "BSD-2-Clause",
      "BSD-3-Clause",
      "ISC",
      "MPL-2.0",
      "LGPL-2.1",
      "LGPL-3.0",
      "OFL-1.1",
    ];
    for (const d of [...Object.values(deps), ...platformDeps, ...tools.flatMap((t) => t.dependencies)])
      expect(allowed, d.name).toContain(d.licence);
  });
  it("marks every server tool with a retention time", () => {
    for (const t of tools.filter((x) => x.processing.where === "own-server")) {
      expect(t.processing.where === "own-server" && t.processing.retentionMinutes).toBeLessThanOrEqual(60);
    }
  });
  it("has a reviewer for every SEO object", () => {
    for (const t of tools.filter((x) => x.seo)) expect(people[t.seo!.reviewedBy], t.slug).toBeDefined();
  });
});

describe("Tool Chains", () => {
  it("only chain steps whose types are compatible", () => {
    for (const c of chains) {
      const steps = c.steps.map((s) => getTool(s.tool)!);
      expect(steps.every(Boolean), c.slug).toBe(true);
      for (let i = 1; i < steps.length; i++) expect(canChain(steps[i - 1], steps[i]), `${c.slug} step ${i}`).toBe(true);
    }
  });
});

describe("SEO/AEO content rules (every tool with content)", () => {
  const withSeo = tools.filter((t) => t.seo);
  it("covers the 7 example tools", () => {
    expect(withSeo.map((t) => t.slug).sort()).toEqual([
      "background-remover",
      "compress-pdf",
      "heic-to-jpg",
      "image-compressor",
      "json-formatter",
      "jwt-decoder",
      "qr-code-generator",
    ]);
  });
  it.each(withSeo.map((t) => [t.slug, t] as const))("%s follows the content rules", (_, t) => {
    const s = t.seo!;
    expect(s.title.length, "title ≤ 60").toBeLessThanOrEqual(60);
    expect(s.description.length, `description 140–160 (is ${s.description.length})`).toBeGreaterThanOrEqual(140);
    expect(s.description.length, `description 140–160 (is ${s.description.length})`).toBeLessThanOrEqual(160);
    expect(s.answerQuestion.endsWith("?")).toBe(true);
    expect(words(s.answerSummary), "answer 40–60 words").toBeGreaterThanOrEqual(40);
    expect(words(s.answerSummary), "answer 40–60 words").toBeLessThanOrEqual(60);
    expect(s.faqs.length).toBeGreaterThanOrEqual(5);
    expect(s.faqs.length).toBeLessThanOrEqual(8);
    for (const f of s.faqs) {
      expect(words(f.a), `FAQ "${f.q}" is ${words(f.a)} words`).toBeGreaterThanOrEqual(40);
      expect(words(f.a), `FAQ "${f.q}" is ${words(f.a)} words`).toBeLessThanOrEqual(60);
    }
    expect(words(s.explainer), "explainer 150–300 words").toBeGreaterThanOrEqual(150);
    expect(words(s.explainer), "explainer 150–300 words").toBeLessThanOrEqual(300);
    expect(s.howToSteps.length).toBeGreaterThanOrEqual(3);
    expect(s.locales["x-default"]).toBe(s.locales.en);
    for (const v of s.longTailVariants ?? []) {
      expect(v.title.length, `${v.slug} title`).toBeLessThanOrEqual(60);
      for (const f of v.faqs) expect(words(f.a), `${v.slug} FAQ`).toBeGreaterThanOrEqual(40);
    }
  });
  it("never indexes a tool without content", () => {
    for (const t of live) expect(t.seo).toBeDefined();
  });
  it("every routed page (tools, variants, hubs, chains) has a 140–160 char description and ≤ 60 char title", () => {
    const bad: string[] = [];
    const check = (where: string, d?: string, t?: string) => {
      if (!d || d.length < 140 || d.length > 160) bad.push(`${where}: description ${d?.length ?? 0}`);
      if (t && t.length > 60) bad.push(`${where}: title ${t.length}`);
    };
    for (const t of routedTools()) {
      check(t.slug, t.seo?.description ?? t.metaDescription, t.seo?.title);
      for (const v of t.seo?.longTailVariants ?? []) check(v.slug, v.description, v.title);
    }
    for (const h of hubs) check(h.id, h.description, h.title);
    for (const c of chains) check(`chain/${c.slug}`, c.metaDescription, `${c.name} – Free Tool Chain | KlipKit`);
    expect(bad).toEqual([]);
  });
  it("every routed tool has a UI or is clearly marked beta", () => {
    for (const t of routedTools()) expect(["live", "beta"]).toContain(t.status);
  });
});

describe("single source of truth (ADR 0002)", () => {
  it("home grid has 76 cards, every one a registry tool, in a stable order", () => {
    expect(Object.keys(HOME)).toHaveLength(76);
    for (const slug of Object.keys(HOME)) expect(getTool(slug), slug).toBeDefined();
    expect(TOOLS.map((t) => t.slug)).toEqual(Object.keys(HOME));
  });
  it("live panels and the registry agree exactly", () => {
    expect(new Set(Object.keys(PANELS))).toEqual(new Set(PANEL_SLUGS));
    for (const slug of PANEL_SLUGS) expect(getTool(slug)?.panel, slug).toBe(true);
  });
  it("every action and generator target is a registry slug", () => {
    const src = readFileSync(join(__dirname, "../../src/lib/actions.ts"), "utf8");
    const targets = [...src.matchAll(/open: "([^"]+)"/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThan(20);
    for (const slug of targets) expect(getTool(slug), slug).toBeDefined();
  });
  it("grid cards take name, category and server flag from the registry", () => {
    const protect = TOOLS.find((t) => t.slug === "protect-pdf")!;
    expect(protect.s).toBeUndefined(); // runs on the device (qpdf wasm), so no "Private server" tag
    expect(TOOLS.find((t) => t.slug === "pdf-to-word")!.s).toBe("server");
    // 33 live panels; 32 have a home card (Time Zone Converter is reached from Unit Converter's card and ⌘K).
    expect(TOOLS.filter((t) => t.live)).toHaveLength(32);
  });
  it("every routed tool has a page component", () => {
    const src = readFileSync(join(__dirname, "../../src/tools/index.tsx"), "utf8");
    for (const t of routedTools()) expect(src, t.slug).toContain(`"${t.slug}":`);
  });
  it("the client catalog carries no SEO copy", () => {
    for (const t of catalog) expect("seo" in t, t.slug).toBe(false);
  });
  it("Hallmark F11: developer and PDF/document tools each have their own glyph, no shared icon", () => {
    const shared = TOOLS.filter((t) => t.c === "d" || ["pdf", "doc", "lock"].includes(t.i));
    const marks = shared.map((t) => t.g ?? `icon:${t.i}`);
    const dupes = marks.filter((m, i) => marks.indexOf(m) !== i);
    expect(dupes).toEqual([]);
    for (const t of shared) if (t.g) expect(t.g.length, t.slug).toBeLessThanOrEqual(4);
    expect(toolBySlug("json-formatter")!.g).toBe("{ }");
    expect(toolBySlug("jwt-decoder")!.g).toBe("JWT");
    expect(toolBySlug("hash-generator")!.g).toBe("#");
  });
});
