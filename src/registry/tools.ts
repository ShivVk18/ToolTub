import type { HubId, ToolDefinition } from "./types";
import { seoBySlug } from "./seo";
import { catalog } from "./catalog";

export { CARD_SLUGS, homeTools } from "./catalog";

const META: Record<string, string> = {
  "diff-checker":
    "Compare two texts side by side with changed words highlighted, or as a unified patch. Ignore whitespace or case. Runs in your browser; nothing is uploaded.",
  "html-playground":
    "Write HTML, CSS and JavaScript and see the result live in a sandboxed preview with a console. Saved in your browser; download as one HTML file. Free, no signup.",
  "text-to-speech":
    "Read any text aloud with your device's voices, with speed and pitch controls and the current word highlighted. Runs in your browser; nothing is uploaded. Free.",
  "resume-builder":
    "Build a clean résumé from a simple form, pick a classic or modern template, and download a real text PDF. Your draft stays in your browser. Free, no sign-up.",
  transcription:
    "Turn speech in audio or video into text with Whisper running on your device, in English, Hindi and 15 more languages. Nothing is uploaded. Free and no sign-up.",
  "subtitle-generator":
    "Generate SRT and VTT subtitles from a video with Whisper on your device, or open an existing subtitle file to edit text and timings. Nothing is uploaded. Free.",
  "video-compressor":
    "Compress MP4, WebM or MOV videos to a smaller size or a target in MB, with hardware encoding in your browser. Nothing is uploaded. Free and no sign-up.",
  "video-converter":
    "Convert videos between MP4, WebM and MOV right in your browser using hardware encoding where available. Nothing is uploaded. Free, no sign-up, no watermark.",
  "video-trimmer":
    "Cut a video or audio file to the part you want by start and end time, with a live preview. Runs in your browser; nothing is uploaded. Free, no sign-up.",
  "video-to-gif":
    "Turn a short video clip into a looping GIF with your choice of length, frame rate and width. Runs in your browser; nothing is uploaded. Free and no sign-up.",
  "extract-audio":
    "Pull the soundtrack out of a video as M4A, WAV, WebM or OGG audio. Runs in your browser, so the video never leaves your device. Free and no sign-up needed.",
  "audio-converter":
    "Convert and trim audio between M4A, WAV, WebM and OGG from MP3, WAV, M4A, OGG or FLAC. Runs in your browser; nothing is uploaded. Free and no sign-up.",
  "screen-recorder":
    "Record your screen, a window or a browser tab with sound and optional microphone, then download it. No install, no upload, no watermark. Free, no sign-up.",
  "crop-image":
    "Crop, rotate and flip images with aspect presets like 1:1, 4:5 and 16:9, or exact pixel sizes. Runs in your browser; nothing is uploaded. Free, no sign-up.",
  "exif-remover":
    "Remove EXIF metadata such as GPS location and camera details from photos without re-encoding them. Runs in your browser; nothing is uploaded. Free.",
  "bulk-rename":
    "Rename many files at once with patterns like {name}, {n} and {date}, and optionally shrink large photos. Runs in your browser; nothing is uploaded. Free.",
  "social-image-resizer":
    "Resize one image for Instagram, Stories, YouTube, X, LinkedIn and Pinterest in one go: crop or fit with a blurred background. Runs in your browser. Free.",
  "thumbnail-preview":
    "Preview a YouTube thumbnail in the home feed, sidebar and search, light or dark, and check its size and ratio. Runs in your browser; nothing is uploaded.",
  "meme-generator":
    "Make a meme from your own picture with classic top and bottom text that wraps and resizes to fit. Runs in your browser; nothing is uploaded. Free, no sign-up.",
  "image-watermark":
    "Add a text or logo watermark to many photos at once, in a corner, centred or tiled across. Runs in your browser; nothing is uploaded. Free, no sign-up.",
  "color-palette-from-image":
    "Extract the main colours from any photo with their share and hex codes, then copy them as CSS variables. Runs in your browser; nothing is uploaded. Free.",
  "image-color-picker":
    "Click any pixel of an image to get its HEX, RGB and HSL values plus contrast against white and black. Runs in your browser; nothing is uploaded. Free.",
  "collage-maker":
    "Combine 2 to 9 photos into a collage grid for posts, stories or wide banners, with spacing and background colour. Runs in your browser. Free, no sign-up.",
  "passport-photo-maker":
    "Make a passport or visa photo at the right size for India, US, UK, Schengen and more, with a white background and print sheet. Runs on your device.",
  "image-to-text":
    "Copy text from photos, screenshots and scanned PDFs with OCR that runs on your device. English supported; nothing is uploaded. Free and no sign-up needed.",
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
