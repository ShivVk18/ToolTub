/**
 * [Own + Lib] PDF compression in the browser. pdf-lib (MIT) reads and writes the PDF; our own code
 * resamples embedded JPEG images on an OffscreenCanvas. No Ghostscript (AGPL), no server.
 * Limits: only DCT (JPEG) images are resampled; Flate/JBIG2/JPX images and fonts are left as-is,
 * so text-only PDFs shrink mainly from object-stream packing.
 */
import {
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFArray,
  StandardFonts,
  rgb,
  degrees,
  PageSizes,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
} from "pdf-lib";
import { parsePageRanges, rangesToPages, jpegOrientation } from "@/lib/engines/pages";
import type { Progress } from "@/lib/worker-rpc";

export interface PdfCompressJob {
  bytes: ArrayBuffer;
  level: "recommended" | "strong";
  targetKB?: number;
}

const LEVELS = {
  recommended: { maxSide: 1754, quality: 0.72 }, // ≈150 dpi on A4
  strong: { maxSide: 1123, quality: 0.55 }, // ≈96 dpi on A4
};
const TARGET_STEPS = [
  LEVELS.recommended,
  LEVELS.strong,
  { maxSide: 900, quality: 0.45 },
  { maxSide: 700, quality: 0.38 },
  { maxSide: 560, quality: 0.32 },
];

const isJpeg = (filter: unknown) =>
  filter === PDFName.of("DCTDecode") ||
  (filter instanceof PDFArray && filter.size() === 1 && filter.get(0) === PDFName.of("DCTDecode"));

async function compressOnce(bytes: ArrayBuffer, step: { maxSide: number; quality: number }, progress: Progress) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const objects = doc.context.enumerateIndirectObjects();
  const images = objects.filter(
    ([, o]) =>
      o instanceof PDFRawStream &&
      o.dict.get(PDFName.of("Subtype")) === PDFName.of("Image") &&
      isJpeg(o.dict.get(PDFName.of("Filter"))),
  ) as [Parameters<typeof doc.context.assign>[0], PDFRawStream][];

  let done = 0;
  for (const [ref, stream] of images) {
    progress({ ratio: done++ / Math.max(images.length, 1), label: `Compressing image ${done} of ${images.length}` });
    // CMYK JPEGs don't decode reliably on canvas: leave them untouched.
    if (stream.dict.get(PDFName.of("ColorSpace")) === PDFName.of("DeviceCMYK")) continue;
    try {
      const bmp = await createImageBitmap(new Blob([stream.contents as BlobPart], { type: "image/jpeg" }));
      const r = Math.min(1, step.maxSide / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * r);
      const h = Math.round(bmp.height * r);
      const canvas = new OffscreenCanvas(w, h);
      canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
      const out = new Uint8Array(
        await (await canvas.convertToBlob({ type: "image/jpeg", quality: step.quality })).arrayBuffer(),
      );
      if (out.length >= stream.contents.length) continue; // never make an image bigger
      const dict = stream.dict;
      dict.set(PDFName.of("Width"), PDFNumber.of(w));
      dict.set(PDFName.of("Height"), PDFNumber.of(h));
      dict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
      dict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
      dict.delete(PDFName.of("DecodeParms"));
      dict.delete(PDFName.of("Decode"));
      doc.context.assign(ref, PDFRawStream.of(dict, out));
    } catch {
      // Unreadable image: keep the original stream.
    }
  }
  const saved = await doc.save({ useObjectStreams: true });
  return { bytes: saved, images: images.length };
}

export async function compressPdf(job: PdfCompressJob, progress: Progress) {
  const originalSize = job.bytes.byteLength;
  try {
    await PDFDocument.load(job.bytes, { updateMetadata: false });
  } catch (e) {
    if (String(e).includes("encrypted"))
      throw new Error("This PDF is password-protected. Unlock it first, then compress it.");
    throw new Error("This file isn't a readable PDF.");
  }
  const steps = job.targetKB ? TARGET_STEPS : [LEVELS[job.level]];
  let best: Uint8Array | null = null;
  let images = 0;
  for (const step of steps) {
    const r = await compressOnce(job.bytes, step, progress);
    images = r.images;
    if (!best || r.bytes.length < best.length) best = r.bytes;
    if (!job.targetKB || best.length <= job.targetKB * 1024) break;
  }
  const keptOriginal = best!.length >= originalSize;
  const note =
    images === 0
      ? "This PDF has no photos or scans to compress, so savings are small."
      : job.targetKB && best!.length > job.targetKB * 1024
        ? `Couldn't reach ${job.targetKB} KB. This is the smallest readable version; try splitting the PDF.`
        : undefined;
  const out = keptOriginal ? new Uint8Array(job.bytes) : best!;
  return { blob: new Blob([out as BlobPart], { type: "application/pdf" }), originalSize, keptOriginal, note };
}

export interface PdfSplitJob {
  bytes: ArrayBuffer;
  /** First and last page to keep, 1-based and inclusive. */
  a: number;
  b: number;
}

/** [Lib] Keeps pages a..b (clamped to the document) as a new PDF. pdf-lib copies the pages as-is. */
export async function splitPdf({ bytes, a, b }: PdfSplitJob) {
  let src: PDFDocument;
  try {
    src = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    if (String(e).includes("encrypted"))
      throw new Error("This PDF is password-protected. Unlock it first, then split it.");
    throw new Error("This file isn't a readable PDF.");
  }
  const n = src.getPageCount();
  const from = Math.max(1, Math.min(a, b));
  if (from > n) throw new Error(`This PDF has only ${n} pages, so pages ${a}–${b} don't exist.`);
  const to = Math.min(n, Math.max(a, b));
  const out = await PDFDocument.create();
  const pages = await out.copyPages(
    src,
    Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i),
  );
  pages.forEach((p) => out.addPage(p));
  const saved = await out.save({ useObjectStreams: true });
  return { blob: new Blob([saved as BlobPart], { type: "application/pdf" }), pages: pages.length, from, to };
}

// ───────────────────────── Shared ─────────────────────────

const pdfBlob = (b: Uint8Array) => new Blob([b as BlobPart], { type: "application/pdf" });

/** Loads a PDF with readable errors. `name` makes multi-file errors say which file. */
async function loadPdf(bytes: ArrayBuffer, action: string, name?: string): Promise<PDFDocument> {
  const who = name ? `"${name}"` : "This PDF";
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    if (doc.getPageCount() === 0) throw new Error(`${who} has no pages.`);
    return doc;
  } catch (e) {
    const msg = String(e);
    if (msg.includes("has no pages")) throw e;
    if (msg.includes("encrypted")) throw new Error(`${who} is password-protected. Unlock it first, then ${action} it.`);
    throw new Error(`${name ? who : "This file"} isn't a readable PDF.`);
  }
}

// ───────────────────────── Merge ─────────────────────────
export interface PdfMergeJob {
  files: { name: string; bytes: ArrayBuffer }[];
}
export async function mergePdfs({ files }: PdfMergeJob, progress: Progress) {
  if (files.length < 2) throw new Error("Add at least two PDFs to merge.");
  const out = await PDFDocument.create();
  for (const [i, f] of files.entries()) {
    progress({ ratio: i / files.length, label: `Adding ${f.name}` });
    const src = await loadPdf(f.bytes, "merge", f.name);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  const saved = await out.save({ useObjectStreams: true });
  return { blob: pdfBlob(saved), pages: out.getPageCount() };
}

// ───────────────────────── Split ─────────────────────────
export interface PdfSplitRangesJob {
  bytes: ArrayBuffer;
  /** extract: one PDF with the chosen pages · ranges: one PDF per range · every: one PDF per page */
  mode: "extract" | "ranges" | "every";
  ranges: string;
}
export async function splitRanges({ bytes, mode, ranges }: PdfSplitRangesJob, progress: Progress) {
  const src = await loadPdf(bytes, "split");
  const n = src.getPageCount();
  const parts: [number, number][] =
    mode === "every" ? Array.from({ length: n }, (_, i) => [i + 1, i + 1]) : parsePageRanges(ranges, n, true);
  const make = async (pages: number[]) => {
    const out = await PDFDocument.create();
    (
      await out.copyPages(
        src,
        pages.map((p) => p - 1),
      )
    ).forEach((p) => out.addPage(p));
    return pdfBlob(await out.save({ useObjectStreams: true }));
  };
  if (mode === "extract") {
    const pages = rangesToPages(parts);
    return { files: [{ blob: await make(pages), label: describe(parts, n), pages: pages.length }], total: n };
  }
  const files = [];
  for (const [i, r] of parts.entries()) {
    progress({ ratio: i / parts.length, label: `Making part ${i + 1} of ${parts.length}` });
    const pages = rangesToPages([r]);
    files.push({
      blob: await make(pages),
      label: r[0] === r[1] ? `page-${r[0]}` : `pages-${r[0]}-${r[1]}`,
      pages: pages.length,
    });
  }
  return { files, total: n };
}
const describe = (parts: [number, number][], n: number) =>
  parts.length === 1 && parts[0][0] === 1 && parts[0][1] === n
    ? "all-pages"
    : "pages-" + parts.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join("_");

// ───────────────────────── Images → PDF ─────────────────────────
export interface ImagesToPdfJob {
  images: { name: string; type: string; bytes: ArrayBuffer }[];
  /** fit: page = image size · a4 / letter: image centred on the page */
  size: "fit" | "a4" | "letter";
  margin: number; // points
}
export async function imagesToPdf({ images, size, margin }: ImagesToPdfJob, progress: Progress) {
  if (!images.length) throw new Error("Add at least one image.");
  const doc = await PDFDocument.create();
  for (const [i, im] of images.entries()) {
    progress({ ratio: i / images.length, label: `Adding ${im.name}` });
    const u8 = new Uint8Array(im.bytes);
    const isJpeg = u8[0] === 0xff && u8[1] === 0xd8;
    const isPng = u8[0] === 0x89 && u8[1] === 0x50;
    let img;
    try {
      if (isJpeg && jpegOrientation(u8) === 1) img = await doc.embedJpg(u8);
      else if (isPng) img = await doc.embedPng(u8);
      else {
        // WebP, AVIF, GIF, rotated JPEGs: decode (applying EXIF rotation) and re-encode as high-quality JPEG,
        // or PNG when the image has transparency.
        const bmp = await createImageBitmap(new Blob([u8 as BlobPart], { type: im.type }), {
          imageOrientation: "from-image",
        });
        const c = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = c.getContext("2d")!;
        ctx.drawImage(bmp, 0, 0);
        const alpha = !isJpeg && hasAlpha(ctx.getImageData(0, 0, bmp.width, bmp.height).data);
        const blob = await c.convertToBlob(alpha ? { type: "image/png" } : { type: "image/jpeg", quality: 0.92 });
        const b = new Uint8Array(await blob.arrayBuffer());
        img = alpha ? await doc.embedPng(b) : await doc.embedJpg(b);
      }
    } catch {
      throw new Error(`"${im.name}" isn't an image we can read.`);
    }
    const [pw, ph] =
      size === "fit"
        ? [img.width + margin * 2, img.height + margin * 2]
        : (() => {
            const base = size === "a4" ? PageSizes.A4 : PageSizes.Letter;
            return img.width > img.height ? [base[1], base[0]] : [base[0], base[1]]; // landscape images → landscape pages
          })();
    const page = doc.addPage([pw, ph]);
    const scale = Math.min(
      (pw - margin * 2) / img.width,
      (ph - margin * 2) / img.height,
      size === "fit" ? 1 : Infinity,
    );
    const w = img.width * scale;
    const h = img.height * scale;
    page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  }
  const saved = await doc.save({ useObjectStreams: true });
  return { blob: pdfBlob(saved), pages: doc.getPageCount() };
}
const hasAlpha = (d: Uint8ClampedArray) => {
  for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return true;
  return false;
};

// ───────────────────────── Watermark ─────────────────────────
export interface WatermarkJob {
  bytes: ArrayBuffer;
  /** text: the text below · image: a PNG/JPG logo · numbers: page numbers in `numberFormat` */
  kind?: "text" | "image" | "numbers";
  text: string;
  image?: ArrayBuffer;
  numberFormat?: "n" | "n/N" | "page n of N";
  size: number; // pt (text) or fraction of page width ×100 (image)
  opacity: number; // 0–1
  color: string; // #rrggbb
  position: "diagonal" | "center" | "bottom";
  pages: string;
}
/** Characters Helvetica (WinAnsi) can draw. Anything else would throw inside pdf-lib. */
export const winAnsiOk = (s: string) => /^[\x20-\x7e -ÿ€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]*$/.test(s);

export async function watermarkPdf(job: WatermarkJob) {
  const kind = job.kind ?? "text";
  if (kind === "image") return imageWatermark(job);
  const text = job.text.trim();
  if (kind === "text" && !text) throw new Error("Type the watermark text.");
  if (kind === "text" && !winAnsiOk(text))
    throw new Error(
      "The watermark can use Latin letters, digits and common symbols. Other scripts and emoji aren't supported yet.",
    );
  const doc = await loadPdf(job.bytes, "watermark");
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const n = doc.getPageCount();
  const pages = rangesToPages(parsePageRanges(job.pages, n));
  const hex = /^#?([0-9a-f]{6})$/i.exec(job.color)?.[1] ?? "6d5df5";
  const color = rgb(
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  );
  const label = (p: number) =>
    job.numberFormat === "page n of N" ? `Page ${p} of ${n}` : job.numberFormat === "n" ? `${p}` : `${p} / ${n}`;
  for (const p of new Set(pages)) {
    const page = doc.getPage(p - 1);
    const { width, height } = page.getSize();
    const rot = ((page.getRotation().angle % 360) + 360) % 360;
    // Sizes as seen by the reader: a page rotated 90° shows its height as width.
    const [vw, vh] = rot % 180 ? [height, width] : [width, height];
    const text = kind === "numbers" ? label(p) : job.text.trim();
    const size = Math.min(
      kind === "numbers" ? 11 : job.size,
      (vw * 0.9) / Math.max(1, font.widthOfTextAtSize(text, 1)),
    );
    const tw = font.widthOfTextAtSize(text, size);
    const position = kind === "numbers" ? "bottom" : job.position;
    const angle = position === "diagonal" ? (Math.atan2(vh, vw) * 180) / Math.PI : 0;
    // Position in the reader's view, then map back to the page's own coordinates.
    const rad = (angle * Math.PI) / 180;
    const cx = vw / 2;
    const cy = position === "bottom" ? Math.max(size * 1.5, 24) : vh / 2;
    let x = cx - (Math.cos(rad) * tw) / 2 + (Math.sin(rad) * size) / 3;
    let y = cy - (Math.sin(rad) * tw) / 2 - (Math.cos(rad) * size) / 3;
    let a = angle;
    if (rot === 90) [x, y, a] = [width - y, x, angle + 90];
    else if (rot === 180) [x, y, a] = [width - x, height - y, angle + 180];
    else if (rot === 270) [x, y, a] = [y, height - x, angle + 270];
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: kind === "numbers" ? rgb(0.2, 0.2, 0.22) : color,
      opacity: kind === "numbers" ? 1 : Math.max(0.05, Math.min(1, job.opacity)),
      rotate: degrees(a),
    });
  }
  const saved = await doc.save({ useObjectStreams: true });
  return { blob: pdfBlob(saved), pages: new Set(pages).size };
}

/** A PNG or JPG logo, centred (or at the bottom), scaled to `size`% of the page width, rotated with the page. */
async function imageWatermark(job: WatermarkJob) {
  if (!job.image) throw new Error("Choose a PNG or JPG logo.");
  const doc = await loadPdf(job.bytes, "watermark");
  const u8 = new Uint8Array(job.image);
  let img;
  try {
    img = u8[0] === 0x89 && u8[1] === 0x50 ? await doc.embedPng(u8) : await doc.embedJpg(u8);
  } catch {
    throw new Error("The logo must be a PNG or JPG image.");
  }
  const n = doc.getPageCount();
  const pages = new Set(rangesToPages(parsePageRanges(job.pages, n)));
  for (const p of pages) {
    const page = doc.getPage(p - 1);
    const { width, height } = page.getSize();
    const rot = ((page.getRotation().angle % 360) + 360) % 360;
    const [vw, vh] = rot % 180 ? [height, width] : [width, height];
    const w = (vw * Math.max(5, Math.min(90, job.size))) / 100;
    const h = (w * img.height) / img.width;
    const vx = (vw - w) / 2;
    const vy = job.position === "bottom" ? 24 : (vh - h) / 2;
    let [x, y, a] = [vx, vy, 0];
    if (rot === 90) [x, y, a] = [width - vy, vx, 90];
    else if (rot === 180) [x, y, a] = [width - vx, height - vy, 180];
    else if (rot === 270) [x, y, a] = [vy, height - vx, 270];
    page.drawImage(img, {
      x,
      y,
      width: w,
      height: h,
      rotate: degrees(a),
      opacity: Math.max(0.05, Math.min(1, job.opacity)),
    });
  }
  const saved = await doc.save({ useObjectStreams: true });
  return { blob: pdfBlob(saved), pages: pages.size };
}

// ───────────────────────── Organize ─────────────────────────
export interface OrganizeJob {
  bytes: ArrayBuffer;
  /** New order: original 0-based index and extra rotation in degrees (multiples of 90). */
  pages: { index: number; rotate: number }[];
}
export async function organizePdf({ bytes, pages }: OrganizeJob) {
  if (!pages.length) throw new Error("Keep at least one page.");
  const src = await loadPdf(bytes, "organize");
  const n = src.getPageCount();
  if (pages.some((p) => p.index < 0 || p.index >= n || p.rotate % 90)) throw new Error("Invalid page selection.");
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    pages.map((p) => p.index),
  );
  copied.forEach((pg, i) => {
    const r = (((pg.getRotation().angle + pages[i].rotate) % 360) + 360) % 360;
    pg.setRotation(degrees(r));
    out.addPage(pg);
  });
  const saved = await out.save({ useObjectStreams: true });
  return { blob: pdfBlob(saved), pages: copied.length };
}

// ───────────────────────── Sign ─────────────────────────
export interface FormField {
  name: string;
  type: "text" | "checkbox" | "dropdown" | "radio";
  value: string | boolean;
  options?: string[];
  multiline?: boolean;
}

/** Lists the PDF's fillable form fields (AcroForm). Signature and button fields are skipped. */
export async function listFields({ bytes }: { bytes: ArrayBuffer }): Promise<FormField[]> {
  const doc = await loadPdf(bytes, "fill");
  const out: FormField[] = [];
  for (const f of doc.getForm().getFields()) {
    const name = f.getName();
    if (f instanceof PDFTextField)
      out.push({ name, type: "text", value: f.getText() ?? "", multiline: f.isMultiline() });
    else if (f instanceof PDFCheckBox) out.push({ name, type: "checkbox", value: f.isChecked() });
    else if (f instanceof PDFDropdown)
      out.push({ name, type: "dropdown", value: f.getSelected()[0] ?? "", options: f.getOptions() });
    else if (f instanceof PDFRadioGroup)
      out.push({ name, type: "radio", value: f.getSelected() ?? "", options: f.getOptions() });
  }
  return out;
}

export interface SignJob {
  bytes: ArrayBuffer;
  /** PNG of the signature (transparent background). Optional when only filling fields. */
  png?: ArrayBuffer;
  /** Form values by field name. */
  fields?: Record<string, string | boolean>;
  /** Bake the filled values into the page so they can't be edited. */
  flatten?: boolean;
  page: number; // 1-based
  /** Position and width as fractions of the page as the reader sees it (0–1, origin top-left). */
  x: number;
  y: number;
  w: number;
  date?: string;
}
export async function signPdf(job: SignJob) {
  const doc = await loadPdf(job.bytes, "sign");
  const n = doc.getPageCount();
  if (job.fields && Object.keys(job.fields).length) fillForm(doc, job.fields);
  if (job.flatten) doc.getForm().flatten();
  if (!job.png) return { blob: pdfBlob(await doc.save({ useObjectStreams: true })) };
  if (job.page < 1 || job.page > n) throw new Error(`Choose a page between 1 and ${n}.`);
  const img = await doc.embedPng(new Uint8Array(job.png));
  const page = doc.getPage(job.page - 1);
  const { width, height } = page.getSize();
  const rot = ((page.getRotation().angle % 360) + 360) % 360;
  const [vw, vh] = rot % 180 ? [height, width] : [width, height];
  const w = Math.max(0.05, Math.min(1, job.w)) * vw;
  const h = (w * img.height) / img.width;
  // top-left fractions in the reader's view → bottom-left point in view space
  const vx = Math.max(0, Math.min(1, job.x)) * vw;
  const vy = vh - Math.max(0, Math.min(1, job.y)) * vh - h;
  let [x, y, a] = [vx, vy, 0];
  if (rot === 90) [x, y, a] = [width - vy, vx, 90];
  else if (rot === 180) [x, y, a] = [width - vx, height - vy, 180];
  else if (rot === 270) [x, y, a] = [vy, height - vx, 270];
  page.drawImage(img, { x, y, width: w, height: h, rotate: degrees(a) });
  if (job.date) {
    const font = await doc.embedFont(StandardFonts.Helvetica);
    if (winAnsiOk(job.date) && rot === 0)
      page.drawText(job.date, { x: vx, y: vy - 12, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
  }
  const saved = await doc.save({ useObjectStreams: true });
  return { blob: pdfBlob(saved) };
}

function fillForm(doc: PDFDocument, values: Record<string, string | boolean>) {
  const form = doc.getForm();
  for (const [name, v] of Object.entries(values)) {
    let f;
    try {
      f = form.getField(name);
    } catch {
      continue; // field vanished: ignore
    }
    if (f instanceof PDFTextField) {
      const s = String(v);
      if (!winAnsiOk(s))
        throw new Error(`"${name}": only Latin letters, digits and common symbols can be typed into PDF forms here.`);
      const max = f.getMaxLength();
      f.setText(max !== undefined ? s.slice(0, max) : s);
    } else if (f instanceof PDFCheckBox) v ? f.check() : f.uncheck();
    else if (f instanceof PDFDropdown && typeof v === "string" && v) f.select(v);
    else if (f instanceof PDFRadioGroup && typeof v === "string" && v) f.select(v);
  }
  // Redraw the fields so every reader shows the new values.
  form.updateFieldAppearances(undefined);
}

// ───────────────────────── Protect (qpdf) ─────────────────────────
export interface ProtectJob {
  bytes: ArrayBuffer;
  password: string;
  /** Allow printing and copying text (owner password is random, so the restrictions can't be lifted). */
  allowPrint: boolean;
  allowCopy: boolean;
}
type QpdfInstance = {
  callMain: (a: string[]) => number;
  FS: {
    writeFile: (p: string, d: Uint8Array) => void;
    readFile: (p: string) => Uint8Array;
    unlink: (p: string) => void;
  };
};
let qpdfP: Promise<QpdfInstance> | null = null;
let qpdfErr = "";
const qpdf = () =>
  (qpdfP ??= (async () => {
    const url = "/vendor/qpdf/qpdf.mjs";
    const factory = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)).default;
    return factory({
      locateFile: () => "/vendor/qpdf/qpdf.wasm",
      noInitialRun: true,
      print: () => {},
      printErr: (s: string) => (qpdfErr += s + "\n"),
    });
  })());

export async function protectPdf(job: ProtectJob, progress: Progress) {
  if (job.password.length < 1) throw new Error("Choose a password.");
  if (/[\u0000-\u001f]/.test(job.password)) throw new Error("The password can't contain control characters.");
  await loadPdf(job.bytes, "protect"); // readable + not already encrypted
  progress({ label: "Loading the encryption engine…" });
  const q = await qpdf();
  progress({ label: "Encrypting (AES-256)…" });
  const owner = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  q.FS.writeFile("/in.pdf", new Uint8Array(job.bytes));
  qpdfErr = "";
  const code = q.callMain([
    "--encrypt",
    job.password,
    owner,
    "256",
    `--print=${job.allowPrint ? "full" : "none"}`,
    `--extract=${job.allowCopy ? "y" : "n"}`,
    "--modify=none",
    "--",
    "/in.pdf",
    "/out.pdf",
  ]);
  // qpdf exit codes: 0 ok, 3 ok with warnings, 2 error
  if (code !== 0 && code !== 3)
    throw new Error(`Encryption failed${qpdfErr ? `: ${qpdfErr.trim().split("\n").pop()}` : ""}.`);
  const out = q.FS.readFile("/out.pdf");
  q.FS.unlink("/in.pdf");
  q.FS.unlink("/out.pdf");
  return { blob: pdfBlob(out.slice()) };
}

export interface UnlockJob {
  bytes: ArrayBuffer;
  password: string;
}
/** Removes the password from a PDF you can open (qpdf --decrypt). Wrong password → a clear error. */
export async function unlockPdf(job: UnlockJob, progress: Progress) {
  try {
    await PDFDocument.load(job.bytes, { updateMetadata: false });
    throw new Error("NOT_ENCRYPTED");
  } catch (e) {
    if ((e as Error).message === "NOT_ENCRYPTED")
      throw new Error("This PDF isn't password-protected, so there's nothing to unlock.");
    if (!String(e).includes("encrypted")) throw new Error("This file isn't a readable PDF.");
  }
  progress({ label: "Loading the decryption engine…" });
  const q = await qpdf();
  q.FS.writeFile("/in.pdf", new Uint8Array(job.bytes));
  qpdfErr = "";
  // --requires-password exits 3 when the given password opens the file; 2 when it's wrong (we already know the
  // file is encrypted). Measured with this qpdf build: its error text goes to the console, not printErr.
  if (q.callMain(["--requires-password", `--password=${job.password}`, "/in.pdf"]) !== 3) {
    q.FS.unlink("/in.pdf");
    throw new Error("That password is wrong. Check it and try again.");
  }
  const code = q.callMain(["--decrypt", `--password=${job.password}`, "--", "/in.pdf", "/out.pdf"]);
  q.FS.unlink("/in.pdf");
  if (code !== 0 && code !== 3)
    throw new Error(`Couldn't unlock this PDF${qpdfErr ? `: ${qpdfErr.trim().split("\n").pop()}` : ""}.`);
  const out = q.FS.readFile("/out.pdf");
  q.FS.unlink("/out.pdf");
  return { blob: pdfBlob(out.slice()) };
}

// ───────────────────────── Résumé ─────────────────────────
export interface Resume {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: string;
  summary: string;
  experience: { role: string; company: string; dates: string; bullets: string }[];
  education: { degree: string; school: string; dates: string }[];
  skills: string;
}

/** Builds an A4 résumé with real (selectable, searchable) text. Templates: classic (black rules) or modern (accent). */
export async function resumePdf({
  r,
  template,
  accent,
}: {
  r: Resume;
  template: "classic" | "modern";
  accent: string;
}) {
  const all = JSON.stringify(r);
  if (!winAnsiOk(all.replace(/\\n|\\"|\\\\/g, " ")))
    throw new Error(
      "The résumé can use Latin letters, digits and common symbols. Other scripts and emoji aren't supported in the PDF yet.",
    );
  if (!r.name.trim()) throw new Error("Add your name.");
  const doc = await PDFDocument.create();
  doc.setTitle(`${r.name} – Résumé`);
  doc.setAuthor(r.name);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const hex = /^#?([0-9a-f]{6})$/i.exec(accent)?.[1] ?? "6d5df5";
  const acc = rgb(
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  );
  const ink = rgb(0.1, 0.1, 0.12);
  const grey = rgb(0.35, 0.35, 0.38);
  const [W, H] = PageSizes.A4;
  const M = 50;
  let page = doc.addPage([W, H]);
  let y = H - M;
  const need = (h: number) => {
    if (y - h < M) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
  };
  const wrap = (text: string, f: typeof font, size: number, width: number) => {
    const out: string[] = [];
    for (const para of text.split(/\n/)) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const t = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(t, size) <= width) line = t;
        else {
          if (line) out.push(line);
          line = word;
        }
      }
      out.push(line);
    }
    return out;
  };
  const text = (s: string, x: number, size: number, f = font, color = ink, width = W - M - x) => {
    for (const l of wrap(s, f, size, width)) {
      need(size * 1.35);
      page.drawText(l, { x, y: y - size, size, font: f, color });
      y -= size * 1.35;
    }
  };
  const heading = (s: string) => {
    need(40);
    y -= 10;
    page.drawText(s.toUpperCase(), { x: M, y: y - 11, size: 11, font: bold, color: template === "modern" ? acc : ink });
    y -= 16;
    page.drawLine({
      start: { x: M, y },
      end: { x: W - M, y },
      thickness: template === "modern" ? 1.2 : 0.6,
      color: template === "modern" ? acc : grey,
    });
    y -= 8;
  };

  if (template === "modern") {
    page.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: acc });
    page.drawText(r.name, { x: M, y: H - 58, size: 26, font: bold, color: rgb(1, 1, 1) });
    if (r.headline) page.drawText(r.headline, { x: M, y: H - 80, size: 12, font, color: rgb(1, 1, 1) });
    y = H - 130;
  } else {
    text(r.name, M, 24, bold);
    if (r.headline) text(r.headline, M, 12, font, grey);
  }
  const contact = [r.email, r.phone, r.location, ...r.links.split(/\n|,/).map((s) => s.trim())]
    .filter(Boolean)
    .join("  ·  ");
  if (contact) text(contact, M, 9.5, font, grey);
  if (r.summary.trim()) {
    heading("Summary");
    text(r.summary.trim(), M, 10.5);
  }
  const jobs = r.experience.filter((e) => e.role || e.company);
  if (jobs.length) {
    heading("Experience");
    for (const e of jobs) {
      need(30);
      const left = [e.role, e.company].filter(Boolean).join(" — ");
      page.drawText(left, { x: M, y: y - 11, size: 11, font: bold, color: ink });
      if (e.dates)
        page.drawText(e.dates, {
          x: W - M - font.widthOfTextAtSize(e.dates, 9.5),
          y: y - 11,
          size: 9.5,
          font,
          color: grey,
        });
      y -= 16;
      for (const b of e.bullets
        .split("\n")
        .map((s) => s.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean)) {
        need(14);
        page.drawText("•", { x: M + 4, y: y - 10, size: 10, font, color: template === "modern" ? acc : ink });
        text(b, M + 16, 10);
      }
      y -= 6;
    }
  }
  const edu = r.education.filter((e) => e.degree || e.school);
  if (edu.length) {
    heading("Education");
    for (const e of edu) {
      need(30);
      page.drawText([e.degree, e.school].filter(Boolean).join(" — "), {
        x: M,
        y: y - 11,
        size: 11,
        font: bold,
        color: ink,
      });
      if (e.dates)
        page.drawText(e.dates, {
          x: W - M - font.widthOfTextAtSize(e.dates, 9.5),
          y: y - 11,
          size: 9.5,
          font,
          color: grey,
        });
      y -= 18;
    }
  }
  if (r.skills.trim()) {
    heading("Skills");
    text(
      r.skills
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join("  ·  "),
      M,
      10.5,
    );
  }
  const saved = await doc.save({ useObjectStreams: true });
  return { blob: pdfBlob(saved), pages: doc.getPageCount() };
}
