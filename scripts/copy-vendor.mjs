// Copies browser-only engines into /public/vendor so they are served from klipkit.com
// (no third-party CDNs) and stay separate, swappable files (needed for LGPL libheif).
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = join(dirname(new URL(import.meta.url).pathname), "..");
const nm = (p) => join(root, "node_modules", p);
const pub = (p) => join(root, "public", "vendor", p);

const copies = [
  ["libheif-js/libheif-wasm/libheif-bundle.mjs", "libheif/libheif-bundle.mjs"],
  ["libheif-js/libheif-wasm/LICENSE", "libheif/LICENSE"],
  ["onnxruntime-web/dist/ort.webgpu.bundle.min.mjs", "ort/ort.webgpu.bundle.min.mjs"],
  // ORT 1.31's WebGPU bundle loads the "asyncify" WASM build (also used for its CPU fallback).
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs", "ort/ort-wasm-simd-threaded.asyncify.mjs"],
  ["onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm", "ort/ort-wasm-simd-threaded.asyncify.wasm"],
  // pdf.js (Apache-2.0): renderer, its worker, and the data it fetches for some PDFs (CJK character maps,
  // the 14 standard fonts, JPX/JBIG2 decoders, colour profiles).
  ["pdfjs-dist/build/pdf.min.mjs", "pdfjs/pdf.min.mjs"],
  ["pdfjs-dist/build/pdf.worker.min.mjs", "pdfjs/pdf.worker.min.mjs"],
  ["pdfjs-dist/cmaps", "pdfjs/cmaps"],
  ["pdfjs-dist/standard_fonts", "pdfjs/standard_fonts"],
  ["pdfjs-dist/wasm", "pdfjs/wasm"],
  ["pdfjs-dist/iccs", "pdfjs/iccs"],
  ["pdfjs-dist/LICENSE", "pdfjs/LICENSE"],
  // qpdf (Apache-2.0) as WebAssembly, for Protect PDF.
  ["@neslinesli93/qpdf-wasm/dist/qpdf.wasm", "qpdf/qpdf.wasm"],
  // Tesseract.js (Apache-2.0) for Image to Text: API, its worker, the LSTM WebAssembly cores (SIMD and plain),
  // and the English model (tessdata best_int, Apache-2.0). Other languages aren't bundled.
  ["tesseract.js/dist/tesseract.esm.min.js", "tesseract/tesseract.esm.min.js"],
  ["tesseract.js/dist/worker.min.js", "tesseract/worker.min.js"],
  ...["", "simd-", "relaxedsimd-"].flatMap((v) =>
    ["js", "wasm", "wasm.js"].map((ext) => [
      `tesseract.js-core/tesseract-core-${v}lstm.${ext}`,
      `tesseract/core/tesseract-core-${v}lstm.${ext}`,
    ]),
  ),
  ["tesseract.js-core/LICENSE", "tesseract/LICENSE"],
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "tesseract/lang/eng.traineddata.gz"],
];

for (const [from, to] of copies) {
  mkdirSync(dirname(pub(to)), { recursive: true });
  cpSync(nm(from), pub(to), { recursive: true });
}
// qpdf's loader is a UMD script that defines `var Module`; module workers can only import ES modules, and the
// production CSP forbids eval. Its CommonJS branch is skipped when `exports` is undefined, so adding an ES export
// is enough to make it importable.
mkdirSync(pub("qpdf"), { recursive: true });
writeFileSync(
  pub("qpdf/qpdf.mjs"),
  readFileSync(nm("@neslinesli93/qpdf-wasm/dist/qpdf.js"), "utf8") + "\nexport default Module;\n",
);

console.log(`vendor: copied ${copies.length} files to public/vendor`);
