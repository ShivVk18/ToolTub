/** Page ranges and image metadata helpers for the PDF tools. Pure, no DOM. */

/**
 * "1-3, 5, 8-" → [[1,3],[5,5],[8,n]]. Also "all", "odd", "even", "last", "-3" (= 1-3), "5-2" (reversed range kept
 * as 5,4,3,2 when `allowReverse`, otherwise normalised). Throws with a readable message for anything else.
 */
export function parsePageRanges(input: string, n: number, allowReverse = false): [number, number][] {
  if (n < 1) throw new Error("This PDF has no pages");
  const s = input.trim().toLowerCase();
  if (!s || s === "all") return [[1, n]];
  if (s === "odd" || s === "even") {
    const out: [number, number][] = [];
    for (let p = s === "odd" ? 1 : 2; p <= n; p += 2) out.push([p, p]);
    if (!out.length) throw new Error("This PDF has no even pages");
    return out;
  }
  const out: [number, number][] = [];
  for (const raw of s.split(/\s*[,;]\s*/).filter(Boolean)) {
    const part = raw.replace(/last/g, String(n)).replace(/\s+/g, "");
    const m = /^(\d*)(?:(-|–|to)(\d*))?$/.exec(part);
    if (!m || (!m[1] && !m[3])) throw new Error(`"${raw}" isn't a page or range. Use e.g. 1-3, 5, 8-`);
    const a = m[1] ? +m[1] : 1;
    const b = m[2] ? (m[3] ? +m[3] : n) : a;
    if (a < 1 || b < 1) throw new Error("Pages start at 1");
    if (Math.min(a, b) > n)
      throw new Error(`This PDF has only ${n} page${n === 1 ? "" : "s"}, so "${raw}" doesn't exist`);
    const lo = Math.min(a, b);
    const hi = Math.min(n, Math.max(a, b));
    out.push(allowReverse && a > b ? [Math.min(a, n), lo] : [lo, hi]);
  }
  return out;
}

/** Flattens ranges into 1-based page numbers, in order, keeping duplicates (a page can be extracted twice). */
export function rangesToPages(ranges: [number, number][]): number[] {
  const out: number[] = [];
  for (const [a, b] of ranges) {
    const step = a <= b ? 1 : -1;
    for (let p = a; step > 0 ? p <= b : p >= b; p += step) out.push(p);
  }
  return out;
}

/**
 * EXIF orientation (1–8) of a JPEG, or 1 if absent. Phones store photos sideways and set this tag; embedding the
 * raw JPEG in a PDF ignores it, so the page would come out rotated.
 */
export function jpegOrientation(bytes: Uint8Array): number {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) return 1;
    const marker = bytes[i + 1];
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (
      marker === 0xe1 &&
      bytes[i + 4] === 0x45 &&
      bytes[i + 5] === 0x78 &&
      bytes[i + 6] === 0x69 &&
      bytes[i + 7] === 0x66
    ) {
      const t = i + 10; // TIFF header
      const le = bytes[t] === 0x49;
      const u16 = (o: number) => (le ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1]);
      const u32 = (o: number) =>
        le
          ? (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0
          : ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
      const ifd = t + u32(t + 4);
      const count = u16(ifd);
      for (let k = 0; k < count; k++) {
        const e = ifd + 2 + k * 12;
        if (e + 12 > bytes.length) return 1;
        if (u16(e) === 0x0112) {
          const v = u16(e + 8);
          return v >= 1 && v <= 8 ? v : 1;
        }
      }
      return 1;
    }
    if (marker === 0xda) return 1; // start of scan: no EXIF before the image data
    i += 2 + len;
  }
  return 1;
}

/** Safe file-name stem: "Q3 report (final).pdf" → "Q3 report (final)". */
export const stem = (name: string) => name.replace(/\.[^.]+$/, "") || "file";
