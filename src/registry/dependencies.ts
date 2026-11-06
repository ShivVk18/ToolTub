import type { Dependency } from "./types";

/**
 * Every third-party library or model KlipKit bundles. All are self-hosted from klipkit.com;
 * none makes a network call. Sizes are approximate gzip transfer sizes; re-measure on each upgrade.
 * Licence rule (brief §0.4): MIT, Apache-2.0, BSD, ISC, MPL-2.0, LGPL (separately loaded). No AGPL/GPL.
 */
export const deps = {
  pdfLib: { name: "pdf-lib", licence: "MIT", sizeKb: 180, url: "https://github.com/Hopding/pdf-lib" },
  pdfjs: { name: "pdf.js (pdfjs-dist)", licence: "Apache-2.0", sizeKb: 420, url: "https://github.com/mozilla/pdf.js" },
  qpdfWasm: {
    name: "qpdf (compiled to WebAssembly)",
    licence: "Apache-2.0",
    sizeKb: 1200,
    url: "https://github.com/qpdf/qpdf",
  },
  // LGPL: served as its own file from /vendor/libheif so users can swap it (LGPL relinking requirement).
  libheif: {
    name: "libheif (libheif-js)",
    licence: "LGPL-3.0",
    sizeKb: 1600,
    url: "https://github.com/strukturag/libheif",
  },
  qrcode: { name: "qrcode", licence: "MIT", sizeKb: 25, url: "https://github.com/soldair/node-qrcode" },
  fflate: { name: "fflate (ZIP)", licence: "MIT", sizeKb: 10, url: "https://github.com/101arrowz/fflate" },
  onnx: { name: "onnxruntime-web", licence: "MIT", sizeKb: 6000, url: "https://github.com/microsoft/onnxruntime" },
  isnet: {
    name: "ISNet general-use model (int8, ONNX)",
    licence: "Apache-2.0",
    sizeKb: 44000,
    url: "https://github.com/xuebinqin/DIS",
  },
  u2netp: {
    name: "U²-Net-p model (ONNX, low-end fallback)",
    licence: "Apache-2.0",
    sizeKb: 4700,
    url: "https://github.com/xuebinqin/U-2-Net",
  },
  tesseract: {
    name: "Tesseract.js + tessdata_fast",
    licence: "Apache-2.0",
    sizeKb: 5000,
    url: "https://github.com/naptha/tesseract.js",
  },
  transformers: {
    name: "Transformers.js",
    licence: "Apache-2.0",
    sizeKb: 900,
    url: "https://github.com/huggingface/transformers.js",
  },
  whisperTiny: {
    name: "Whisper tiny/base (ONNX, quantized)",
    licence: "MIT",
    sizeKb: 41000,
    url: "https://github.com/openai/whisper",
  },
  mediabunny: {
    name: "Mediabunny (MP4/WebM demux + mux for WebCodecs)",
    licence: "MPL-2.0",
    sizeKb: 70,
    url: "https://github.com/Vanilagy/mediabunny",
  },
  yaml: { name: "yaml", licence: "ISC", sizeKb: 35, url: "https://github.com/eemeli/yaml" },
  codemirror: { name: "CodeMirror 6", licence: "MIT", sizeKb: 150, url: "https://codemirror.net" },
  marked: { name: "marked", licence: "MIT", sizeKb: 12, url: "https://github.com/markedjs/marked" },
  terser: { name: "Terser", licence: "BSD-2-Clause", sizeKb: 260, url: "https://github.com/terser/terser" },
  prettier: { name: "Prettier (standalone)", licence: "MIT", sizeKb: 400, url: "https://github.com/prettier/prettier" },
  sqlFormatter: {
    name: "sql-formatter",
    licence: "MIT",
    sizeKb: 90,
    url: "https://github.com/sql-formatter-org/sql-formatter",
  },
  libreoffice: {
    name: "LibreOffice (headless, server)",
    licence: "MPL-2.0",
    sizeKb: 0,
    url: "https://www.libreoffice.org",
  },
} satisfies Record<string, Dependency>;

/** Platform-wide dependencies (not tied to one tool). Also rendered on /licences. */
export const platformDeps: Dependency[] = [
  { name: "Next.js", licence: "MIT", sizeKb: 0, url: "https://github.com/vercel/next.js" },
  { name: "React", licence: "MIT", sizeKb: 0, url: "https://github.com/facebook/react" },
  { name: "Tailwind CSS", licence: "MIT", sizeKb: 0, url: "https://github.com/tailwindlabs/tailwindcss" },
  { name: "shadcn/ui (copied components)", licence: "MIT", sizeKb: 0, url: "https://github.com/shadcn-ui/ui" },
  { name: "Lucide icons", licence: "ISC", sizeKb: 0, url: "https://github.com/lucide-icons/lucide" },
  { name: "Zustand", licence: "MIT", sizeKb: 1, url: "https://github.com/pmndrs/zustand" },
  { name: "Fuse.js", licence: "Apache-2.0", sizeKb: 7, url: "https://github.com/krisk/Fuse" },
  { name: "BullMQ (server)", licence: "MIT", sizeKb: 0, url: "https://github.com/taskforcesh/bullmq" },
  {
    name: "Valkey (server, Redis-compatible)",
    licence: "BSD-3-Clause",
    sizeKb: 0,
    url: "https://github.com/valkey-io/valkey",
  },
  { name: "Caddy (server)", licence: "Apache-2.0", sizeKb: 0, url: "https://github.com/caddyserver/caddy" },
];
