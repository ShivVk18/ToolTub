"use client";
/** Small canvas helpers shared by the image tools. Everything stays on the device. */

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,.jpg,.jpeg,.png,.webp,.avif,.gif";
export const IMAGE_LABEL = "an image (JPG, PNG, WebP, AVIF or GIF)";

/** Decodes an image file, applying EXIF rotation. Readable error for broken files. */
export async function loadBitmap(file: Blob, name = "This file"): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`${name === "This file" ? name : `"${name}"`} isn't an image we can read.`);
  }
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  return { c, ctx };
}

export const toBlob = (c: HTMLCanvasElement, type: string, quality = 0.92) =>
  new Promise<Blob>((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't save the image (it may be too large)."))), type, quality),
  );

/** Output type for an input: keeps PNG/WebP (transparency), otherwise JPG. Safari can't write WebP: PNG then. */
export function outType(input: string): "image/png" | "image/jpeg" | "image/webp" {
  if (input === "image/png" || input === "image/gif") return "image/png";
  if (input === "image/webp") return canWrite("image/webp") ? "image/webp" : "image/png";
  return "image/jpeg";
}
const writable = new Map<string, boolean>();
export function canWrite(type: string) {
  if (!writable.has(type)) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    writable.set(type, c.toDataURL(type).startsWith(`data:${type}`));
  }
  return writable.get(type)!;
}
export const extFor = (type: string) => (type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg");

/** Canvas size limit across browsers (Safari: 16.7 MP). Throws a readable error above it. */
export function checkSize(w: number, h: number) {
  if (w * h > 16_777_216)
    throw new Error(
      `${Math.round(w)}×${Math.round(h)} is too large to draw in a browser; keep it under 16 megapixels.`,
    );
}

/** Object URL for previews, revoked by the caller. */
export const urlOf = (b: Blob) => URL.createObjectURL(b);
