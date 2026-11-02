/**
 * [Own + Lib] PDF compression in the browser. pdf-lib (MIT) reads and writes the PDF; our own code
 * resamples embedded JPEG images on an OffscreenCanvas. No Ghostscript (AGPL), no server.
 * Limits: only DCT (JPEG) images are resampled; Flate/JBIG2/JPX images and fonts are left as-is,
 * so text-only PDFs shrink mainly from object-stream packing.
 */
import { PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFArray } from "pdf-lib";
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
const TARGET_STEPS = [LEVELS.recommended, LEVELS.strong, { maxSide: 900, quality: 0.45 }, { maxSide: 700, quality: 0.38 }, { maxSide: 560, quality: 0.32 }];

const isJpeg = (filter: unknown) =>
  filter === PDFName.of("DCTDecode") ||
  (filter instanceof PDFArray && filter.size() === 1 && filter.get(0) === PDFName.of("DCTDecode"));

async function compressOnce(bytes: ArrayBuffer, step: { maxSide: number; quality: number }, progress: Progress) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const objects = doc.context.enumerateIndirectObjects();
  const images = objects.filter(
    ([, o]) => o instanceof PDFRawStream && o.dict.get(PDFName.of("Subtype")) === PDFName.of("Image") && isJpeg(o.dict.get(PDFName.of("Filter"))),
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
      const out = new Uint8Array(await (await canvas.convertToBlob({ type: "image/jpeg", quality: step.quality })).arrayBuffer());
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
    if (String(e).includes("encrypted")) throw new Error("This PDF is password-protected. Unlock it first, then compress it.");
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
