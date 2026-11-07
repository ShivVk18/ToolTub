/**
 * [Own] Animated GIF encoder: median-cut palette (≤ 256 colours) per frame, nearest-colour mapping with a cache,
 * LZW compression, looping. Pure (works on RGBA arrays), so it runs in a worker and is unit-tested.
 */

/** Median cut on a sample of pixels → up to `max` colours as [r,g,b]. */
export function medianCut(rgba: Uint8ClampedArray | Uint8Array, max = 256, step = 4): number[][] {
  const px: number[][] = [];
  for (let i = 0; i < rgba.length; i += 4 * step) px.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
  if (!px.length) return [[0, 0, 0]];
  const boxes: number[][][] = [px];
  while (boxes.length < max) {
    // split the box with the widest channel range
    let bi = -1,
      bc = 0,
      br = -1;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255,
          hi = 0;
        for (const p of b) {
          if (p[c] < lo) lo = p[c];
          if (p[c] > hi) hi = p[c];
        }
        if (hi - lo > br) [br, bi, bc] = [hi - lo, i, c];
      }
    });
    if (bi < 0 || br === 0) break;
    const b = boxes[bi].sort((x, y) => x[bc] - y[bc]);
    const mid = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  return boxes.map((b) => {
    const s = [0, 0, 0];
    for (const p of b) for (let c = 0; c < 3; c++) s[c] += p[c];
    return s.map((v) => Math.round(v / b.length));
  });
}

/** Palette index for every pixel (nearest colour, cached by 15-bit colour key). */
export function mapPixels(rgba: Uint8ClampedArray | Uint8Array, pal: number[][]): Uint8Array {
  const out = new Uint8Array(rgba.length / 4);
  const cache = new Int16Array(32768).fill(-1);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    const r = rgba[i],
      g = rgba[i + 1],
      b = rgba[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let idx = cache[key];
    if (idx < 0) {
      let bd = Infinity;
      for (let k = 0; k < pal.length; k++) {
        const d = (pal[k][0] - r) ** 2 + (pal[k][1] - g) ** 2 + (pal[k][2] - b) ** 2;
        if (d < bd) [bd, idx] = [d, k];
      }
      cache[key] = idx;
    }
    out[j] = idx;
  }
  return out;
}

/** GIF LZW: variable-length codes, packed LSB-first, as data sub-blocks of ≤ 255 bytes. */
export function lzw(indices: Uint8Array, minCodeSize: number): Uint8Array {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  const bytes: number[] = [];
  let cur = 0,
    bits = 0;
  let size = minCodeSize + 1;
  const emit = (code: number) => {
    cur |= code << bits;
    bits += size;
    while (bits >= 8) {
      bytes.push(cur & 255);
      cur >>>= 8;
      bits -= 8;
    }
  };
  let dict = new Map<number, number>();
  let next = eoi + 1;
  emit(clear);
  let prefix = indices.length ? indices[0] : 0;
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const hit = dict.get(key);
    if (hit !== undefined) {
      prefix = hit;
      continue;
    }
    emit(prefix);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > 1 << size && size < 12) size++;
    } else {
      emit(clear);
      dict = new Map();
      next = eoi + 1;
      size = minCodeSize + 1;
    }
    prefix = k;
  }
  if (indices.length) emit(prefix);
  emit(eoi);
  if (bits > 0) bytes.push(cur & 255);
  // sub-blocks
  const out: number[] = [minCodeSize];
  for (let i = 0; i < bytes.length; i += 255) {
    const n = Math.min(255, bytes.length - i);
    out.push(n, ...bytes.slice(i, i + n));
  }
  out.push(0);
  return new Uint8Array(out);
}

export interface GifFrame {
  rgba: Uint8ClampedArray | Uint8Array;
  /** Delay before the next frame, in hundredths of a second. */
  delay: number;
}

/** Encodes frames (all `w`×`h`) as a looping GIF89a. Each frame gets its own palette for best colour. */
export function encodeGif(frames: GifFrame[], w: number, h: number): Uint8Array {
  if (!frames.length) throw new Error("No frames to encode.");
  if (w < 1 || h < 1 || w > 65535 || h > 65535) throw new Error("Invalid GIF size.");
  const parts: Uint8Array[] = [];
  const u16 = (v: number) => [v & 255, (v >> 8) & 255];
  // header + logical screen (no global palette)
  parts.push(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ...u16(w), ...u16(h), 0x00, 0, 0]));
  // loop forever (NETSCAPE2.0)
  parts.push(
    new Uint8Array([0x21, 0xff, 0x0b, ..."NETSCAPE2.0".split("").map((c) => c.charCodeAt(0)), 0x03, 0x01, 0, 0, 0]),
  );
  for (const f of frames) {
    if (f.rgba.length !== w * h * 4) throw new Error("Every frame must have the same size.");
    const pal = medianCut(f.rgba, 256);
    const bitsPer = Math.max(1, Math.ceil(Math.log2(Math.max(2, pal.length))));
    const tableSize = 1 << bitsPer;
    // graphic control: delay, no transparency, disposal "do not dispose"
    parts.push(new Uint8Array([0x21, 0xf9, 0x04, 0x04, ...u16(Math.max(2, Math.round(f.delay))), 0, 0]));
    // image descriptor with local colour table
    parts.push(new Uint8Array([0x2c, 0, 0, 0, 0, ...u16(w), ...u16(h), 0x80 | (bitsPer - 1)]));
    const table = new Uint8Array(tableSize * 3);
    pal.forEach((c, i) => table.set(c, i * 3));
    parts.push(table);
    parts.push(lzw(mapPixels(f.rgba, pal), Math.max(2, bitsPer)));
  }
  parts.push(new Uint8Array([0x3b]));
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Time ranges like "0:10", "1:02.5", "75" (seconds) → seconds. Throws on anything else. */
export function parseTime(s: string): number {
  const t = s.trim();
  if (!t) throw new Error("Enter a time like 0:10 or 1:02.5");
  const parts = t.split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p)))
    throw new Error(`"${s}" isn't a time. Use e.g. 0:10 or 1:02.5`);
  const n = parts.map(Number);
  if (n.slice(1).some((v) => v >= 60)) throw new Error(`"${s}": minutes and seconds go up to 59`);
  return n.reduce((acc, v) => acc * 60 + v, 0);
}
export const fmtTime = (sec: number) => {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r < 10 ? "0" : ""}${r.toFixed(r % 1 ? 1 : 0)}`;
};
