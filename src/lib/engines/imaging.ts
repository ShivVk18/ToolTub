/** Image-tool logic that doesn't need a canvas: metadata, layouts, palettes, renaming. Pure, testable. */

// ───────────────────────── Metadata (lossless) ─────────────────────────
export interface StripResult {
  bytes: Uint8Array;
  removed: string[]; // human labels: "EXIF", "XMP", "IPTC", "Comment", "Text"
}

/**
 * Removes metadata without re-encoding, so the picture is bit-for-bit the same.
 * JPEG: drops APP1 (EXIF/XMP), APP13 (IPTC/Photoshop) and COM; keeps APP0 (JFIF), APP2 (ICC colour profile) and
 * APP14 (Adobe, needed to decode CMYK). PNG: drops tEXt/zTXt/iTXt/eXIf/tIME, keeps colour chunks.
 * WebP: drops EXIF and XMP chunks and clears their VP8X flags. Other types throw.
 */
export function stripMetadata(bytes: Uint8Array): StripResult {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return stripJpeg(bytes);
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return stripPng(bytes);
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return stripWebp(bytes);
  throw new Error("Only JPG, PNG and WebP files can be cleaned without re-encoding.");
}
const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));

function stripJpeg(b: Uint8Array): StripResult {
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  const removed = new Set<string>();
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) throw new Error("This JPEG is damaged.");
    const m = b[i + 1];
    if (m === 0xda) {
      keep.push(b.subarray(i)); // start of scan: the rest is image data
      break;
    }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      keep.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    if (len < 2 || i + 2 + len > b.length) throw new Error("This JPEG is damaged.");
    const seg = b.subarray(i, i + 2 + len);
    const id = ascii(b, i + 4, 4);
    if (m === 0xe1) removed.add(id === "Exif" ? "EXIF" : id === "http" ? "XMP" : "APP1");
    else if (m === 0xed) removed.add("IPTC");
    else if (m === 0xfe) removed.add("Comment");
    else keep.push(seg);
    i += 2 + len;
  }
  return { bytes: concat(keep), removed: [...removed] };
}

function stripPng(b: Uint8Array): StripResult {
  const keep: Uint8Array[] = [b.subarray(0, 8)];
  const removed = new Set<string>();
  const DROP: Record<string, string> = { tEXt: "Text", zTXt: "Text", iTXt: "Text", eXIf: "EXIF", tIME: "Date" };
  let i = 8;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = ascii(b, i + 4, 4);
    const end = i + 12 + len;
    if (end > b.length) throw new Error("This PNG is damaged.");
    if (DROP[type]) removed.add(DROP[type]);
    else keep.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }
  return { bytes: concat(keep), removed: [...removed] };
}

function stripWebp(b: Uint8Array): StripResult {
  const chunks: Uint8Array[] = [];
  const removed = new Set<string>();
  let i = 12;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, 4);
    const len = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24);
    const end = i + 8 + len + (len & 1);
    if (end > b.length + 1) throw new Error("This WebP is damaged.");
    if (type === "EXIF") removed.add("EXIF");
    else if (type === "XMP ") removed.add("XMP");
    else {
      const c = b.slice(i, Math.min(end, b.length));
      if (type === "VP8X") c[8] &= ~(0x08 | 0x04); // clear EXIF and XMP flags
      chunks.push(c);
    }
    i = end;
  }
  const body = concat(chunks);
  const head = new Uint8Array(12);
  head.set(b.subarray(0, 12));
  const size = body.length + 4;
  head[4] = size & 255;
  head[5] = (size >> 8) & 255;
  head[6] = (size >> 16) & 255;
  head[7] = (size >> 24) & 255;
  return { bytes: concat([head, body]), removed: [...removed] };
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

export interface ExifSummary {
  make?: string;
  model?: string;
  date?: string;
  software?: string;
  gps: boolean;
  lat?: number;
  lon?: number;
}

/** Reads a few EXIF fields from a JPEG (camera, date, software, GPS position) to show what would be removed. */
export function exifSummary(b: Uint8Array): ExifSummary | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 < b.length && b[i] === 0xff && b[i + 1] !== 0xda) {
    const len = (b[i + 2] << 8) | b[i + 3];
    if (b[i + 1] === 0xe1 && ascii(b, i + 4, 6) === "Exif\0\0") return parseTiff(b, i + 10);
    i += 2 + len;
  }
  return null;
}

function parseTiff(b: Uint8Array, t: number): ExifSummary {
  const le = b[t] === 0x49;
  const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
  const u32 = (o: number) =>
    (le
      ? b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)
      : (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const out: ExifSummary = { gps: false };
  const str = (e: number) => {
    const n = u32(e + 4);
    const at = n <= 4 ? e + 8 : t + u32(e + 8);
    if (at + n > b.length) return undefined;
    return ascii(b, at, n).replace(/\0+$/, "").trim() || undefined;
  };
  const ifd = (off: number, fn: (tag: number, e: number) => void) => {
    const at = t + off;
    if (at + 2 > b.length) return;
    const count = u16(at);
    for (let k = 0; k < count; k++) {
      const e = at + 2 + k * 12;
      if (e + 12 > b.length) return;
      fn(u16(e), e);
    }
  };
  let gpsOff = 0;
  ifd(u32(t + 4), (tag, e) => {
    if (tag === 0x010f) out.make = str(e);
    else if (tag === 0x0110) out.model = str(e);
    else if (tag === 0x0132) out.date = str(e);
    else if (tag === 0x0131) out.software = str(e);
    else if (tag === 0x8825) gpsOff = u32(e + 8);
  });
  if (gpsOff) {
    out.gps = true;
    const rat = (o: number) => u32(t + o) / (u32(t + o + 4) || 1);
    const dms = (e: number) => {
      const o = u32(e + 8);
      return rat(o) + rat(o + 8) / 60 + rat(o + 16) / 3600;
    };
    let latRef = "N",
      lonRef = "E";
    ifd(gpsOff, (tag, e) => {
      if (tag === 1) latRef = String.fromCharCode(b[e + 8]);
      else if (tag === 3) lonRef = String.fromCharCode(b[e + 8]);
      else if (tag === 2) out.lat = dms(e);
      else if (tag === 4) out.lon = dms(e);
    });
    if (out.lat !== undefined && latRef === "S") out.lat = -out.lat;
    if (out.lon !== undefined && lonRef === "W") out.lon = -out.lon;
  }
  return out;
}

// ───────────────────────── Bulk rename ─────────────────────────
export interface RenameFile {
  name: string;
  lastModified: number;
}
/**
 * Pattern tokens: {name} original name, {ext} extension, {n} counter (padded to `pad`), {date} YYYY-MM-DD of the
 * file's last-modified time. Characters Windows/macOS reject are replaced; duplicates get " (2)", " (3)"…
 * The extension is always kept, even if the pattern leaves it out.
 */
export function renameAll(files: RenameFile[], pattern: string, start = 1, pad = 2, tz = "UTC"): string[] {
  const p = pattern.trim() || "{name}";
  const used = new Map<string, number>();
  return files.map((f, i) => {
    const dot = f.name.lastIndexOf(".");
    const base = dot > 0 ? f.name.slice(0, dot) : f.name;
    const ext = dot > 0 ? f.name.slice(dot + 1) : "";
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(f.lastModified));
    let out = p
      .replace(/\{name\}/gi, base)
      .replace(/\{ext\}/gi, ext)
      .replace(/\{date\}/gi, date)
      .replace(/\{n\}/gi, String(start + i).padStart(pad, "0"))
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/^[\s.]+|[\s.]+$/g, "");
    if (!out) out = `file-${start + i}`;
    if (ext && !out.toLowerCase().endsWith("." + ext.toLowerCase())) out += "." + ext;
    const key = out.toLowerCase();
    const seen = used.get(key) ?? 0;
    used.set(key, seen + 1);
    if (seen) out = ext ? out.replace(new RegExp(`\\.${ext}$`, "i"), ` (${seen + 1}).${ext}`) : `${out} (${seen + 1})`;
    return out;
  });
}

// ───────────────────────── Palette (k-means) ─────────────────────────
export interface Swatch {
  hex: string;
  rgb: [number, number, number];
  share: number; // 0–1
}
const hex2 = (n: number) => n.toString(16).padStart(2, "0");
export const toHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();

/**
 * k dominant colours of RGBA pixels (transparent pixels ignored), sorted by share. Deterministic: k-means++
 * seeding with a fixed PRNG, 12 iterations. Pass downsampled pixels (≤ 40k) for speed.
 */
export function palette(px: Uint8ClampedArray | Uint8Array, k: number): Swatch[] {
  const pts: number[][] = [];
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 127) pts.push([px[i], px[i + 1], px[i + 2]]);
  if (!pts.length) return [];
  let seed = 12345;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const d2 = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const distinct = new Set(pts.map((p) => p.join())).size;
  k = Math.max(1, Math.min(k, distinct));
  const cs: number[][] = [pts[Math.floor(rnd() * pts.length)].slice()];
  while (cs.length < k) {
    const ds = pts.map((p) => Math.min(...cs.map((c) => d2(p, c))));
    const total = ds.reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    let idx = 0;
    while (idx < ds.length - 1 && (r -= ds[idx]) > 0) idx++;
    cs.push(pts[idx].slice());
  }
  const assign = new Int32Array(pts.length);
  for (let it = 0; it < 12; it++) {
    const sum = cs.map(() => [0, 0, 0, 0]);
    pts.forEach((p, i) => {
      let best = 0,
        bd = Infinity;
      cs.forEach((c, j) => {
        const d = d2(p, c);
        if (d < bd) [bd, best] = [d, j];
      });
      assign[i] = best;
      const s = sum[best];
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
      s[3]++;
    });
    cs.forEach((c, j) => {
      if (sum[j][3]) for (let q = 0; q < 3; q++) c[q] = sum[j][q] / sum[j][3];
    });
  }
  const counts = new Array(k).fill(0);
  assign.forEach((a) => counts[a]++);
  return cs
    .map((c, j) => {
      const rgb = c.map(Math.round) as [number, number, number];
      return { hex: toHex(...rgb), rgb, share: counts[j] / pts.length };
    })
    .filter((s) => s.share > 0)
    .sort((a, b) => b.share - a.share);
}

// ───────────────────────── Sizes and layouts ─────────────────────────
export const SOCIAL_SIZES: { id: string; label: string; w: number; h: number }[] = [
  { id: "ig-square", label: "Instagram post (square)", w: 1080, h: 1080 },
  { id: "ig-portrait", label: "Instagram post (portrait)", w: 1080, h: 1350 },
  { id: "ig-story", label: "Instagram / TikTok story", w: 1080, h: 1920 },
  { id: "yt-thumb", label: "YouTube thumbnail", w: 1280, h: 720 },
  { id: "yt-banner", label: "YouTube banner", w: 2560, h: 1440 },
  { id: "x-post", label: "X / Twitter post", w: 1600, h: 900 },
  { id: "x-header", label: "X / Twitter header", w: 1500, h: 500 },
  { id: "li-post", label: "LinkedIn post", w: 1200, h: 627 },
  { id: "fb-post", label: "Facebook post", w: 1200, h: 630 },
  { id: "pin", label: "Pinterest pin", w: 1000, h: 1500 },
];

/** Passport/visa photo specs: printed size (mm) and pixels at 300 dpi; head height range as a share of photo height. */
export const PASSPORT_SPECS: { id: string; label: string; mm: [number, number]; head: [number, number] }[] = [
  { id: "in", label: "India passport (35×45 mm)", mm: [35, 45], head: [0.7, 0.8] },
  { id: "us", label: "US passport / visa (2×2 in)", mm: [50.8, 50.8], head: [0.5, 0.69] },
  { id: "uk", label: "UK passport (35×45 mm)", mm: [35, 45], head: [0.64, 0.76] },
  { id: "schengen", label: "Schengen visa (35×45 mm)", mm: [35, 45], head: [0.71, 0.8] },
  { id: "ca", label: "Canada passport (50×70 mm)", mm: [50, 70], head: [0.44, 0.51] },
  { id: "cn", label: "China visa (33×48 mm)", mm: [33, 48], head: [0.58, 0.69] },
];
export const mmToPx = (mm: number, dpi = 300) => Math.round((mm / 25.4) * dpi);

/** Source rectangle that fills a dw×dh frame from a sw×sh image (centre crop, "cover"). `fy` biases vertically (0 top … 1 bottom). */
export function coverRect(sw: number, sh: number, dw: number, dh: number, fy = 0.5) {
  const s = Math.max(dw / sw, dh / sh);
  const w = dw / s;
  const h = dh / s;
  return { x: (sw - w) / 2, y: (sh - h) * Math.max(0, Math.min(1, fy)), w, h };
}
/** Destination rectangle that fits a sw×sh image inside dw×dh ("contain"), centred. */
export function containRect(sw: number, sh: number, dw: number, dh: number) {
  const s = Math.min(dw / sw, dh / sh);
  return { x: (dw - sw * s) / 2, y: (dh - sh * s) / 2, w: sw * s, h: sh * s };
}

/** Largest centred crop of w×h with the given aspect (w/h). */
export function aspectCrop(w: number, h: number, aspect: number) {
  if (w / h > aspect) {
    const cw = Math.round(h * aspect);
    return { x: Math.round((w - cw) / 2), y: 0, w: cw, h };
  }
  const ch = Math.round(w / aspect);
  return { x: 0, y: Math.round((h - ch) / 2), w, h: ch };
}

/**
 * Collage cells for n images in a W×H canvas with `gap` px between and around cells.
 * Rows are balanced: 1 → 1, 2 → 2, 3 → 1+2, 4 → 2+2, 5 → 2+3, 6 → 3+3, 7 → 2+2+3, 8 → 3+2+3, 9 → 3+3+3.
 */
export function collageCells(n: number, W: number, H: number, gap: number) {
  if (n < 1 || n > 9) throw new Error("Use 1 to 9 images.");
  const ROWS: Record<number, number[]> = {
    1: [1],
    2: [2],
    3: [1, 2],
    4: [2, 2],
    5: [2, 3],
    6: [3, 3],
    7: [2, 2, 3],
    8: [3, 2, 3],
    9: [3, 3, 3],
  };
  const rows = ROWS[n];
  const rh = (H - gap * (rows.length + 1)) / rows.length;
  const cells: { x: number; y: number; w: number; h: number }[] = [];
  rows.forEach((cols, r) => {
    const cw = (W - gap * (cols + 1)) / cols;
    for (let c = 0; c < cols; c++) cells.push({ x: gap + c * (cw + gap), y: gap + r * (rh + gap), w: cw, h: rh });
  });
  return cells;
}

/** Greedy word wrap using a measuring function (canvas measureText in the app, a stub in tests). Long words are split. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const tryLine = line ? `${line} ${word}` : word;
      if (measure(tryLine) <= maxWidth) {
        line = tryLine;
        continue;
      }
      if (line) out.push(line);
      if (measure(word) <= maxWidth) line = word;
      else {
        // split an over-long word
        let part = "";
        for (const ch of word) {
          if (measure(part + ch) > maxWidth && part) {
            out.push(part);
            part = ch;
          } else part += ch;
        }
        line = part;
      }
    }
    out.push(line);
  }
  return out;
}

/** Thumbnail checks for YouTube: 16:9, ≥ 1280×720, ≤ 2 MB (YouTube's limit), JPG/PNG/GIF/WebP. */
export function thumbnailChecks(w: number, h: number, bytes: number, type: string): { ok: boolean; text: string }[] {
  const r = w / h;
  return [
    {
      ok: Math.abs(r - 16 / 9) < 0.02,
      text:
        Math.abs(r - 16 / 9) < 0.02
          ? "16:9 aspect ratio"
          : `Aspect ratio is ${r.toFixed(2)}:1; YouTube shows 16:9 (1.78:1), so it will be letterboxed or cropped`,
    },
    {
      ok: w >= 1280 && h >= 720,
      text:
        w >= 1280 && h >= 720
          ? `${w}×${h} (at least 1280×720)`
          : `${w}×${h} is small; use at least 1280×720 so it stays sharp on TVs`,
    },
    {
      ok: bytes <= 2 * 1024 * 1024,
      text:
        bytes <= 2 * 1024 * 1024
          ? "Under YouTube's 2 MB limit"
          : "Over YouTube's 2 MB limit: export as JPG at lower quality",
    },
    {
      ok: /image\/(jpeg|png|gif|webp)/.test(type),
      text: /image\/(jpeg|png|gif|webp)/.test(type) ? "Supported format" : "YouTube accepts JPG, PNG, GIF or WebP",
    },
  ];
}

// ───────────────────────── Passport photo placement ─────────────────────────
export interface HeadBox {
  top: number; // crown row
  chin: number; // estimated chin row
  cx: number; // head centre column
}

/**
 * Finds the head in a person mask (alpha > 127 = person), as returned by the background remover.
 * Crown = first row with the person; the neck is where the silhouette suddenly widens into the shoulders
 * (row width > 1.6× the head's widest row seen so far, after the head has started); chin ≈ 87% of the way to
 * the neck. Falls back to 45% of the person's height when no shoulders are visible.
 */
export function findHead(
  alpha: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number,
  stride = 4,
  offset = 3,
): HeadBox | null {
  const rows: [number, number][] = []; // [left, right] per row, or [-1,-1]
  for (let y = 0; y < h; y++) {
    let l = -1,
      r = -1;
    for (let x = 0; x < w; x++)
      if (alpha[(y * w + x) * stride + offset] > 127) {
        if (l < 0) l = x;
        r = x;
      }
    rows.push([l, r]);
  }
  const top = rows.findIndex(([l]) => l >= 0);
  if (top < 0) return null;
  let bottom = h - 1;
  while (bottom > top && rows[bottom][0] < 0) bottom--;
  const width = (y: number) => (rows[y][0] < 0 ? 0 : rows[y][1] - rows[y][0] + 1);
  let maxHead = 0;
  let neck = -1;
  const minHeadRows = Math.max(3, Math.round((bottom - top) * 0.08));
  for (let y = top; y <= bottom; y++) {
    const wd = width(y);
    if (y - top >= minHeadRows && maxHead > 0 && wd > maxHead * 1.6) {
      neck = y;
      break;
    }
    if (wd > maxHead) maxHead = wd;
  }
  const chin = neck > 0 ? top + Math.round((neck - top) * 0.87) : top + Math.round((bottom - top) * 0.45);
  const headRows = rows.slice(top, chin + 1).filter(([l]) => l >= 0);
  const cx = headRows.reduce((s, [l, r]) => s + (l + r) / 2, 0) / Math.max(1, headRows.length);
  return { top, chin, cx };
}

/**
 * Where to draw the source (sw×sh, head in source pixels) on an outW×outH photo so the head height is
 * `headShare` of the photo and the crown sits a little below the top edge. `zoom` and `shift` are user tweaks
 * (1 = as computed; shift in share of the photo height, + moves the person down).
 */
export function placeHead(
  head: HeadBox,
  sw: number,
  sh: number,
  outW: number,
  outH: number,
  headShare: number,
  zoom = 1,
  shift = 0,
) {
  const headPx = Math.max(1, head.chin - head.top);
  const s = ((headShare * outH) / headPx) * zoom;
  const crownY = outH * ((1 - headShare * zoom) * 0.42 + shift);
  return { x: outW / 2 - head.cx * s, y: crownY - head.top * s, w: sw * s, h: sh * s };
}
