"use client";
/**
 * pdf.js (Apache-2.0), self-hosted from /vendor/pdfjs and loaded only by tools that render pages
 * (PDF to JPG, Organize, Sign). Parsing runs in pdf.js's own worker; drawing happens on a canvas here.
 */
import type * as PdfjsNS from "pdfjs-dist";

type Pdfjs = typeof PdfjsNS;
let lib: Promise<Pdfjs> | null = null;
const BASE = "/vendor/pdfjs/";

export function loadPdfjs(): Promise<Pdfjs> {
  return (lib ??= (async () => {
    const url = BASE + "pdf.min.mjs";
    const m: Pdfjs = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url);
    m.GlobalWorkerOptions.workerSrc = BASE + "pdf.worker.min.mjs";
    return m;
  })());
}

export type PdfDoc = PdfjsNS.PDFDocumentProxy;

/** Opens a PDF for rendering. Password-protected files get a readable error. */
export async function openPdf(bytes: ArrayBuffer, password?: string): Promise<PdfDoc> {
  const m = await loadPdfjs();
  try {
    return await m.getDocument({
      data: new Uint8Array(bytes.slice(0)),
      password,
      cMapUrl: BASE + "cmaps/",
      cMapPacked: true,
      standardFontDataUrl: BASE + "standard_fonts/",
      wasmUrl: BASE + "wasm/",
      iccUrl: BASE + "iccs/",
    }).promise;
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === "PasswordException") throw new Error("This PDF is password-protected. Unlock it first.");
    throw new Error("This file isn't a readable PDF.");
  }
}

/**
 * Renders page `n` (1-based) to a canvas. `scale` 1 = 72 dpi. White background, so JPGs of
 * transparent pages aren't black. The canvas is capped at 50 megapixels to avoid running out of memory.
 */
export async function renderPage(doc: PdfDoc, n: number, scale: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(n);
  let vp = page.getViewport({ scale });
  const mp = (vp.width * vp.height) / 1e6;
  if (mp > 50) vp = page.getViewport({ scale: scale * Math.sqrt(50 / mp) });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
  page.cleanup();
  return canvas;
}

export const canvasToBlob = (c: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't encode the image"))), type, quality),
  );

/** Small page previews as object URLs (caller revokes). */
export async function thumbnails(
  doc: PdfDoc,
  width = 160,
  onEach?: (i: number, url: string) => void,
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const scale = width / page.getViewport({ scale: 1 }).width;
    const c = await renderPage(doc, i, scale);
    const url = URL.createObjectURL(await canvasToBlob(c, "image/jpeg", 0.7));
    urls.push(url);
    onEach?.(i, url);
  }
  return urls;
}
