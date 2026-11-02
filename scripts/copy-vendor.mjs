// Copies browser-only engines into /public/vendor so they are served from klipkit.com
// (no third-party CDNs) and stay separate, swappable files (needed for LGPL libheif).
import { cpSync, mkdirSync } from "node:fs";
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
];

for (const [from, to] of copies) {
  mkdirSync(dirname(pub(to)), { recursive: true });
  cpSync(nm(from), pub(to));
}
console.log(`vendor: copied ${copies.length} files to public/vendor`);
