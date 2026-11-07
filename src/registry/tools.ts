import type { HubId, ToolDefinition } from "./types";
import { seoBySlug } from "./seo";
import { catalog } from "./catalog";

export { PANEL_SLUGS, homeTools } from "./catalog";

const META: Record<string, string> = {
  "merge-pdf":
    "Merge several PDFs into one file in the order you choose. Runs in your browser, so documents are never uploaded. Free, no sign-up, no watermark.",
  "split-pdf":
    "Split a PDF by page ranges, extract the pages you need, or save every page as its own PDF. Runs in your browser; nothing is uploaded. Free, no sign-up.",
  "word-to-pdf":
    "Convert a Word .docx document to PDF with LibreOffice on KlipKit's own server. Files are deleted within one hour. Free, no sign-up, no watermark added.",
  "pdf-to-jpg":
    "Turn PDF pages into JPG or PNG images at screen or print quality. Rendered in your browser, so the PDF never leaves your device. Free and no sign-up.",
  "jpg-to-pdf":
    "Combine JPG, PNG, WebP and other images into one PDF, one page per image, on A4, Letter or image-sized pages. Runs in your browser. Free, no sign-up.",
  "organize-pdf":
    "Reorder, rotate and delete PDF pages with live page previews, then save a new PDF. Everything runs in your browser; nothing is uploaded. Free, no sign-up.",
  "sign-pdf":
    "Sign a PDF by drawing or typing your signature and placing it on any page. Runs in your browser, so the document stays on your device. Free, no sign-up.",
  "protect-pdf":
    "Add a password to a PDF with AES-256 encryption and choose whether printing or copying is allowed. Runs in your browser; nothing is uploaded. Free.",
  "pdf-watermark":
    "Add a text watermark to a PDF: diagonal, centred or as a footer, with your colour and opacity. Runs in your browser; nothing is uploaded. Free, no sign-up.",
  "pdf-to-word":
    "Convert a text-based PDF into an editable Word (DOCX) file. Processed on KlipKit's own server and deleted within one hour. Free, no sign-up, no watermark.",
  "image-resizer":
    "Resize JPG, PNG and WebP images to an exact maximum width and height, in bulk. Runs in your browser, so photos are never uploaded. Free, no sign-up needed.",
  "image-converter":
    "Convert images between JPG, PNG and WebP in bulk, right in your browser. Fast and private: nothing is uploaded, no sign-up, no watermark. Free forever.",
};

/** Full tool definitions: the catalog plus SEO content. Server-side (pages, sitemaps, llms.txt). */
export const tools: ToolDefinition[] = catalog.map((t) => ({
  ...t,
  seo: seoBySlug[t.slug],
  metaDescription: META[t.slug],
}));

const bySlug = new Map(tools.map((t) => [t.slug, t]));

export const getTool = (slug: string) => bySlug.get(slug);

/** Tools that have a page (live or beta). */
export const routedTools = () => tools.filter((t) => t.status !== "planned");

/** Indexable = live AND full SEO content. Thin pages never get indexed. */
export const isIndexable = (t: ToolDefinition) => t.status === "live" && !!t.seo;

export const toolsInHub = (hub: HubId) => tools.filter((t) => t.hub === hub);

/** A hub is indexable only once it lists at least one indexable tool (no thin "coming soon" hubs). */
export const isHubIndexable = (hub: HubId) => toolsInHub(hub).some(isIndexable);

/** Related tools that have a page, then same-hub siblings. */
export const relatedFor = (t: ToolDefinition, limit = 6) => {
  const picked = t.relatedTools.map(getTool).filter((x): x is ToolDefinition => !!x && x.status !== "planned");
  const siblings = routedTools().filter((x) => x.hub === t.hub && x.slug !== t.slug && !picked.includes(x));
  return [...picked, ...siblings].slice(0, limit);
};

/** Find a long-tail variant page by slug, e.g. /compress-image-to-50kb. */
export const getVariant = (slug: string) => {
  for (const t of tools) {
    const v = t.seo?.longTailVariants?.find((x) => x.slug === slug);
    if (v) return { tool: t, variant: v };
  }
  return undefined;
};

export const mimeMatches = (actual: string, pattern: string) =>
  pattern === actual || (pattern.endsWith("/*") && actual.startsWith(pattern.slice(0, -1)));

/** Tool-chain compatibility: can an output of `a` feed `b`? */
export const canChain = (a: ToolDefinition, b: ToolDefinition) =>
  a.outputs.some((o) => b.inputs.some((i) => mimeMatches(o, i) || mimeMatches(i, o)));
