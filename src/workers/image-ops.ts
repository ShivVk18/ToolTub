/**
 * [Own] image engine: built only on browser APIs (createImageBitmap + OffscreenCanvas.convertToBlob).
 * Runs inside image.worker.ts. Shared by Image Compressor, Resizer, Converter, HEIC to JPG and chains.
 */
export interface ImageJob {
  blob: Blob;
  /** Output MIME. "auto" keeps JPG/WebP, and keeps PNG unless a target size forces a lossy format. */
  mime?: "auto" | "image/jpeg" | "image/png" | "image/webp";
  quality?: number; // 0–1, lossy formats only
  maxWidth?: number;
  maxHeight?: number;
  targetKB?: number;
  background?: string; // fill for transparent pixels when the output has no alpha
}

export interface ImageResult {
  blob: Blob;
  width: number;
  height: number;
  /** True when re-encoding would have made the file bigger, so the original was returned. */
  keptOriginal: boolean;
  note?: string;
}

export const fit = (w: number, h: number, maxW = Infinity, maxH = Infinity) => {
  const r = Math.min(1, maxW / w, maxH / h);
  return { width: Math.max(1, Math.round(w * r)), height: Math.max(1, Math.round(h * r)) };
};

async function draw(src: ImageBitmap, width: number, height: number, mime: string, quality: number, bg?: string) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  if (mime === "image/jpeg") {
    ctx.fillStyle = bg ?? "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, width, height);
  const out = await canvas.convertToBlob({ type: mime, quality });
  // Some browsers silently fall back to PNG for unsupported types (e.g. WebP in old Safari).
  if (out.type !== mime)
    throw new Error(`This browser cannot save ${mime.replace("image/", "").toUpperCase()} files. Try JPG or PNG.`);
  return out;
}

/** Whether this browser's canvas can write `mime` (Safari silently writes PNG for WebP). */
async function canEncode(mime: string) {
  const c = new OffscreenCanvas(1, 1);
  c.getContext("2d"); // Chromium can't encode a canvas that has no rendering context
  const out = await c.convertToBlob({ type: mime });
  return out.type === mime;
}

export async function processImage(job: ImageJob): Promise<ImageResult> {
  const src = await createImageBitmap(job.blob, { imageOrientation: "from-image" });
  let { width, height } = fit(src.width, src.height, job.maxWidth, job.maxHeight);
  const resized = width !== src.width || height !== src.height;
  const inType = job.blob.type;
  let mime =
    job.mime && job.mime !== "auto"
      ? job.mime
      : inType === "image/png" || inType === "image/webp"
        ? inType
        : "image/jpeg";
  let note: string | undefined;
  const q = job.quality ?? 0.8;

  if (!job.targetKB) {
    const out = await draw(src, width, height, mime, q, job.background);
    const formatChanged = job.mime && job.mime !== "auto" && job.mime !== inType;
    if (!resized && !formatChanged && out.size >= job.blob.size) {
      return { blob: job.blob, width, height, keptOriginal: true, note: "This image is already well compressed." };
    }
    return { blob: out, width, height, keptOriginal: false };
  }

  // Target size: PNG cannot hit a byte budget, so switch to a lossy format and say so. WebP keeps
  // transparency, but Safari can't encode it ("cannot save WEBP" failed every PNG + target there), so JPG.
  if (mime === "image/png") {
    mime = (await canEncode("image/webp")) ? "image/webp" : "image/jpeg";
    note = `Saved as ${mime === "image/webp" ? "WebP" : "JPG"}, because PNG can't be compressed to a target size.`;
  }
  const target = job.targetKB * 1024;
  let best: Blob | null = null;
  // Encoders differ a lot (Safari's JPEGs are 20–70% larger than Chrome's at the same quality), so the
  // loop measures instead of assuming: if even quality 0.3 is too big, scale by √(target/size), since
  // file size grows roughly with pixel area, and try again.
  for (let round = 0; round < 12 && width >= 16 && height >= 16; round++) {
    const floor = await draw(src, width, height, mime, 0.3, job.background);
    if (floor.size > target) {
      const r = Math.min(0.9, Math.sqrt(target / floor.size) * 0.95);
      width = Math.max(1, Math.round(width * r));
      height = Math.max(1, Math.round(height * r));
      continue;
    }
    // It fits at 0.3: binary-search the highest quality that still fits.
    best = floor;
    let lo = 0.3,
      hi = 0.95;
    for (let i = 0; i < 6; i++) {
      const mid = (lo + hi) / 2;
      const out = await draw(src, width, height, mime, mid, job.background);
      if (out.size <= target) {
        best = out;
        lo = mid;
      } else hi = mid;
    }
    return { blob: best, width, height, keptOriginal: false, note };
  }
  const smallest = await draw(src, width, height, mime, 0.3, job.background);
  return {
    blob: smallest,
    width,
    height,
    keptOriginal: false,
    note: `Couldn't reach ${job.targetKB} KB; this is the smallest readable version.`,
  };
}

/** [Lib] HEIC decode with libheif (LGPL-3.0), loaded as a separate file from /vendor so it stays swappable. */
export async function decodeHeic(blob: Blob): Promise<ImageBitmap> {
  const url = "/vendor/libheif/libheif-bundle.mjs";
  const factory = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)).default;
  const mod = await factory();
  const lib = mod.ready ? await mod.ready : mod;
  const decoder = new lib.HeifDecoder();
  const images = decoder.decode(new Uint8Array(await blob.arrayBuffer()));
  if (!images?.length) throw new Error("This file isn't a readable HEIC photo.");
  const img = images[0];
  const width = img.get_width();
  const height = img.get_height();
  const data = new ImageData(width, height);
  await new Promise<void>((resolve, reject) =>
    img.display(data, (out: ImageData | null) => (out ? resolve() : reject(new Error("HEIC decoding failed.")))),
  );
  return createImageBitmap(data);
}

export async function heicTo(job: { blob: Blob; mime: "image/jpeg" | "image/png"; quality?: number }) {
  const bmp = await decodeHeic(job.blob);
  const out = await draw(bmp, bmp.width, bmp.height, job.mime, job.quality ?? 0.9);
  return { blob: out, width: bmp.width, height: bmp.height };
}
