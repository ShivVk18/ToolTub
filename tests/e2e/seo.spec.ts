import { test, expect, type APIRequestContext } from "@playwright/test";

/** Raw-HTML checks (no JavaScript): what crawlers and AI engines actually see. */
const SITE = "https://klipkit.com";
const toPath = (u: string) => u.replace(SITE, "") || "/";

async function sitemapUrls(request: APIRequestContext) {
  const index = await (await request.get("/sitemap.xml")).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => toPath(m[1]));
  const urls: string[] = [];
  for (const m of maps) {
    const res = await request.get(m);
    expect(res.status(), m).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");
    urls.push(...[...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => toPath(x[1])));
  }
  return urls;
}

const attr = (html: string, re: RegExp) =>
  html
    .match(re)?.[1]
    ?.replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'");
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const visibleText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

test("every sitemap URL passes the on-page SEO checklist", async ({ request }) => {
  test.setTimeout(180_000);
  const urls = await sitemapUrls(request);
  const beta = ["/compress-pdf", "/pdf-to-word", "/background-remover", "/image-resizer", "/image-converter"];
  expect(urls.length).toBeGreaterThan(10);
  for (const b of beta) expect(urls, `beta page ${b} must not be in the sitemap`).not.toContain(b);

  const titles = new Map<string, string>();
  const problems: string[] = [];
  for (const path of [...urls, ...beta]) {
    const res = await request.get(path);
    if (res.status() !== 200) {
      problems.push(`${path}: HTTP ${res.status()}`);
      continue;
    }
    const html = await res.text();
    const title = attr(html, /<title>([^<]*)<\/title>/) ?? "";
    const desc = attr(html, /<meta name="description" content="([^"]*)"/) ?? "";
    const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/);
    const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
    if (!title || title.length > 60) problems.push(`${path}: title length ${title.length} "${title}"`);
    if (titles.has(title)) problems.push(`${path}: duplicate title with ${titles.get(title)}`);
    titles.set(title, path);
    if (desc.length < 140 || desc.length > 160) problems.push(`${path}: description length ${desc.length}`);
    if (canonical !== `${SITE}${path === "/" ? "" : path}` && canonical !== `${SITE}${path}`)
      problems.push(`${path}: canonical ${canonical}`);
    if (h1s !== 1) problems.push(`${path}: ${h1s} H1s`);
    for (const p of ["og:title", "og:description", "og:image", "og:url"])
      if (!html.includes(`property="${p}"`)) problems.push(`${path}: missing ${p}`);
    if (!html.includes('name="twitter:card" content="summary_large_image"'))
      problems.push(`${path}: missing twitter:card`);
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    if (!ld.length) problems.push(`${path}: no JSON-LD in server HTML`);
    for (const block of ld) {
      try {
        JSON.parse(block);
      } catch {
        problems.push(`${path}: JSON-LD does not parse`);
      }
    }
    const ogImage = attr(html, /<meta property="og:image" content="([^"]*)"/);
    if (ogImage) {
      const img = await request.get(toPath(ogImage));
      const b = await img.body();
      const w = b.readUInt32BE(16),
        h = b.readUInt32BE(20);
      if (img.status() !== 200 || w !== 1200 || h !== 630) problems.push(`${path}: OG image ${img.status()} ${w}×${h}`);
    }
  }
  expect(problems).toEqual([]);
});

test("tool pages: WebApplication + BreadcrumbList + HowTo + FAQPage, visible FAQ and 40–60-word answer", async ({
  request,
}) => {
  const problems: string[] = [];
  for (const slug of [
    "image-compressor",
    "heic-to-jpg",
    "json-formatter",
    "jwt-decoder",
    "qr-code-generator",
    "compress-pdf",
    "background-remover",
  ]) {
    const html = await (await request.get(`/${slug}`)).text();
    const graph = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]))
      .flatMap((b) => b["@graph"] ?? [b]);
    const types = graph.map((n: { "@type": string }) => n["@type"]);
    for (const t of ["WebApplication", "BreadcrumbList", "HowTo", "FAQPage"])
      if (!types.includes(t)) problems.push(`${slug}: missing ${t}`);
    const text = visibleText(html);
    const faq = graph.find((n: { "@type": string }) => n["@type"] === "FAQPage");
    for (const q of faq?.mainEntity ?? []) {
      if (!text.includes(q.name)) problems.push(`${slug}: FAQ question not visible: ${q.name}`);
      if (!text.includes(q.acceptedAnswer.text.slice(0, 60)))
        problems.push(`${slug}: FAQ answer not visible: ${q.name}`);
    }
    const answer = html.match(/<h2>[^<]*\?<\/h2><p class="text-lg">([^<]+)<\/p>/)?.[1];
    if (!answer) problems.push(`${slug}: no answer-first paragraph under a question H2`);
    else if (words(answer) < 40 || words(answer) > 60) problems.push(`${slug}: answer is ${words(answer)} words`);
    if (!text.includes("Last updated") || !text.includes("Reviewed by"))
      problems.push(`${slug}: no freshness/reviewer line`);
  }
  expect(problems).toEqual([]);
});

test("robots.txt allows the intended crawlers and points to the sitemap", async ({ request }) => {
  const txt = await (await request.get("/robots.txt")).text();
  for (const bot of [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-SearchBot",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
    "Bingbot",
  ]) {
    expect(txt).toMatch(new RegExp(`User-Agent: ${bot}\\nAllow: /`));
  }
  expect(txt).toContain("Sitemap: https://klipkit.com/sitemap.xml");
  expect(txt).toContain("Disallow: /api/");
});

test("llms.txt and llms-full.txt are Markdown and every listed URL works", async ({ request }) => {
  for (const f of ["/llms.txt", "/llms-full.txt"]) {
    const res = await request.get(f);
    expect(res.headers()["content-type"]).toContain("text/markdown");
    const txt = await res.text();
    expect(txt.startsWith("# KlipKit\n")).toBe(true);
    const links = [...new Set([...txt.matchAll(/https:\/\/klipkit\.com(\/[^\s)]*)/g)].map((m) => m[1]))];
    for (const l of links) expect((await request.get(l)).status(), `${f} → ${l}`).toBe(200);
  }
});

test("hreflang is self-referencing with x-default", async ({ request }) => {
  const html = await (await request.get("/json-formatter")).text();
  expect(html).toContain('hrefLang="en" href="https://klipkit.com/json-formatter"');
  expect(html).toContain('hrefLang="x-default" href="https://klipkit.com/json-formatter"');
});

test("beta tools are noindex, live tools are indexable", async ({ request }) => {
  expect(await (await request.get("/compress-pdf")).text()).toContain('content="noindex, follow"');
  expect(await (await request.get("/json-formatter")).text()).toContain('content="index, follow');
});
