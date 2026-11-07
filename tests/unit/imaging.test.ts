import { describe, it, expect } from "vitest";
import {
  stripMetadata,
  exifSummary,
  renameAll,
  palette,
  coverRect,
  containRect,
  aspectCrop,
  collageCells,
  wrapText,
  thumbnailChecks,
  mmToPx,
  PASSPORT_SPECS,
  toHex,
  findHead,
  placeHead,
} from "@/lib/engines/imaging";

const u8 = (...parts: (number[] | string | Uint8Array)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : [...p])));
const seg = (marker: number, body: Uint8Array) =>
  u8([0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 255], body);

/** EXIF (big-endian) with Make "KlipCam" and a GPS IFD at 12°58'N 77°35'E. */
function exifBody() {
  const tiff: number[] = [0x4d, 0x4d, 0, 42, 0, 0, 0, 8];
  // IFD0 at 8: 2 entries
  const ifd0At = 8;
  const makeAt = ifd0At + 2 + 2 * 12 + 4; // after IFD0
  const gpsAt = makeAt + 8;
  const be32 = (v: number) => [v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255];
  tiff.push(0, 2);
  tiff.push(0x01, 0x0f, 0, 2, ...be32(8), ...be32(makeAt)); // Make, ASCII, count 8
  tiff.push(0x88, 0x25, 0, 4, ...be32(1), ...be32(gpsAt)); // GPS IFD pointer
  tiff.push(...be32(0));
  tiff.push(..."KlipCam\0".split("").map((c) => c.charCodeAt(0)));
  // GPS IFD: 4 entries, rationals after it
  const ratAt = gpsAt + 2 + 4 * 12 + 4;
  tiff.push(0, 4);
  tiff.push(0, 1, 0, 2, ...be32(2), ..."N\0\0\0".split("").map((c) => c.charCodeAt(0)));
  tiff.push(0, 2, 0, 5, ...be32(3), ...be32(ratAt));
  tiff.push(0, 3, 0, 2, ...be32(2), ..."E\0\0\0".split("").map((c) => c.charCodeAt(0)));
  tiff.push(0, 4, 0, 5, ...be32(3), ...be32(ratAt + 24));
  tiff.push(...be32(0));
  for (const [a, b, c] of [
    [12, 58, 0],
    [77, 35, 0],
  ])
    tiff.push(...be32(a), ...be32(1), ...be32(b), ...be32(1), ...be32(c), ...be32(1));
  return u8("Exif\0\0", tiff);
}

describe("metadata stripping", () => {
  const scan = u8([0xff, 0xda, 0, 2, 1, 2, 3, 4, 0xff, 0xd9]);
  const jpeg = u8(
    [0xff, 0xd8],
    seg(0xe0, u8("JFIF\0", [1, 1, 0, 0, 1, 0, 1, 0, 0])),
    seg(0xe1, exifBody()),
    seg(0xe2, u8("ICC_PROFILE\0", [1, 1])),
    seg(0xed, u8("Photoshop 3.0\0")),
    seg(0xfe, u8("shot on KlipCam")),
    scan,
  );

  it("JPEG: drops EXIF/IPTC/comments, keeps JFIF + ICC, image data untouched", () => {
    const r = stripMetadata(jpeg);
    expect(r.removed.sort()).toEqual(["Comment", "EXIF", "IPTC"]);
    const s = String.fromCharCode(...r.bytes);
    expect(s).toContain("JFIF");
    expect(s).toContain("ICC_PROFILE");
    expect(s).not.toContain("KlipCam");
    expect(s).not.toContain("Photoshop");
    expect([...r.bytes.slice(-scan.length)]).toEqual([...scan]);
    expect(exifSummary(r.bytes)).toBeNull();
    // idempotent
    expect(stripMetadata(r.bytes).removed).toEqual([]);
  });
  it("reads camera and GPS position before stripping", () => {
    const e = exifSummary(jpeg)!;
    expect(e.make).toBe("KlipCam");
    expect(e.gps).toBe(true);
    expect(e.lat).toBeCloseTo(12.9667, 3);
    expect(e.lon).toBeCloseTo(77.5833, 3);
  });
  it("PNG: drops text/EXIF/time chunks, keeps the rest in order", () => {
    const chunk = (type: string, data: number[] = []) => u8([0, 0, 0, data.length], type, data, [0, 0, 0, 0]);
    const png = u8(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      chunk("IHDR", Array(13).fill(0)),
      chunk("tEXt", [65, 0, 66]),
      chunk("iCCP", [1]),
      chunk("eXIf", [1, 2]),
      chunk("tIME", Array(7).fill(0)),
      chunk("IDAT", [9, 9]),
      chunk("IEND"),
    );
    const r = stripMetadata(png);
    expect(r.removed.sort()).toEqual(["Date", "EXIF", "Text"]);
    const s = String.fromCharCode(...r.bytes);
    expect(s.match(/IHDR|iCCP|IDAT|IEND|tEXt|eXIf|tIME/g)).toEqual(["IHDR", "iCCP", "IDAT", "IEND"]);
  });
  it("WebP: drops EXIF/XMP chunks, clears VP8X flags, fixes the RIFF size", () => {
    const le32 = (v: number) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255];
    const chunk = (type: string, data: number[]) => u8(type, le32(data.length), data, data.length & 1 ? [0] : []);
    const body = u8(
      "WEBP",
      chunk("VP8X", [0x0c, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      chunk("VP8 ", [1, 2, 3, 4]),
      chunk("EXIF", [5, 6, 7]),
      chunk("XMP ", [8, 9]),
    );
    const webp = u8("RIFF", le32(body.length), body);
    const r = stripMetadata(webp);
    expect(r.removed.sort()).toEqual(["EXIF", "XMP"]);
    const s = String.fromCharCode(...r.bytes);
    expect(s).not.toMatch(/EXIF|XMP /);
    expect(r.bytes[20] & 0x0c).toBe(0); // VP8X flags byte
    const size = r.bytes[4] | (r.bytes[5] << 8) | (r.bytes[6] << 16) | (r.bytes[7] << 24);
    expect(size).toBe(r.bytes.length - 8);
  });
  it("rejects other types and damaged files", () => {
    expect(() => stripMetadata(u8("GIF89a"))).toThrow(/JPG, PNG and WebP/);
    expect(() => stripMetadata(u8([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, 1]))).toThrow(/damaged/);
  });
});

describe("bulk rename", () => {
  const t = Date.parse("2026-11-04T12:00:00Z");
  const files = [
    { name: "IMG_0001.JPG", lastModified: t },
    { name: "IMG_0002.JPG", lastModified: t },
    { name: "notes", lastModified: t },
  ];
  it("tokens, padding, start number, extension kept", () => {
    expect(renameAll(files, "trip-{n}", 1, 3)).toEqual(["trip-001.JPG", "trip-002.JPG", "trip-003"]);
    expect(renameAll(files, "{date}_{name}.{ext}")).toEqual([
      "2026-11-04_IMG_0001.JPG",
      "2026-11-04_IMG_0002.JPG",
      "2026-11-04_notes",
    ]);
    expect(renameAll(files, "{n}", 9, 1)).toEqual(["9.JPG", "10.JPG", "11"]);
  });
  it("sanitises illegal characters, dedupes, never empty", () => {
    expect(renameAll(files.slice(0, 2), 'a/b:c*"photo"')).toEqual(["a-b-c--photo-.JPG", "a-b-c--photo- (2).JPG"]);
    expect(renameAll(files.slice(0, 1), "...")).toEqual(["file-1.JPG"]);
    expect(
      renameAll(
        [
          { name: "x.png", lastModified: t },
          { name: "X.PNG", lastModified: t },
        ],
        "{name}",
      ),
    ).toEqual(["x.png", "X (2).PNG"]);
  });
});

describe("palette", () => {
  it("finds the dominant colours with their shares, deterministically", () => {
    const px: number[] = [];
    for (let i = 0; i < 700; i++) px.push(230, 72, 77, 255); // red 70%
    for (let i = 0; i < 300; i++) px.push(109, 93, 245, 255); // violet 30%
    for (let i = 0; i < 200; i++) px.push(0, 0, 0, 0); // transparent: ignored
    const p = palette(new Uint8ClampedArray(px), 2);
    expect(p.map((s) => s.hex)).toEqual(["#E6484D", "#6D5DF5"]);
    expect(p[0].share).toBeCloseTo(0.7, 5);
    expect(palette(new Uint8ClampedArray(px), 2)).toEqual(p);
  });
  it("asking for more colours than exist, and empty input", () => {
    expect(palette(new Uint8ClampedArray([1, 2, 3, 255, 1, 2, 3, 255]), 5)).toHaveLength(1);
    expect(palette(new Uint8ClampedArray([0, 0, 0, 0]), 3)).toEqual([]);
    expect(toHex(255, 0, 15)).toBe("#FF000F");
  });
});

describe("layouts", () => {
  it("cover and contain", () => {
    expect(coverRect(4000, 3000, 1080, 1080)).toEqual({ x: 500, y: 0, w: 3000, h: 3000 });
    expect(coverRect(1000, 2000, 100, 100, 0)).toMatchObject({ y: 0, h: 1000 });
    expect(containRect(4000, 2000, 1000, 1000)).toEqual({ x: 0, y: 250, w: 1000, h: 500 });
    expect(aspectCrop(1200, 800, 1)).toEqual({ x: 200, y: 0, w: 800, h: 800 });
    expect(aspectCrop(800, 1200, 16 / 9)).toEqual({ x: 0, y: 375, w: 800, h: 450 });
  });
  it("collage cells fill the canvas without overlap", () => {
    for (let n = 1; n <= 9; n++) {
      const cells = collageCells(n, 1080, 1080, 12);
      expect(cells).toHaveLength(n);
      for (const c of cells) {
        expect(c.x).toBeGreaterThanOrEqual(12);
        expect(c.x + c.w).toBeLessThanOrEqual(1068 + 1e-9);
        expect(c.y + c.h).toBeLessThanOrEqual(1068 + 1e-9);
      }
    }
    expect(() => collageCells(10, 100, 100, 0)).toThrow();
  });
  it("passport pixel sizes at 300 dpi", () => {
    const india = PASSPORT_SPECS.find((s) => s.id === "in")!;
    expect([mmToPx(india.mm[0]), mmToPx(india.mm[1])]).toEqual([413, 531]);
    expect(mmToPx(50.8)).toBe(600); // US 2 in
  });
  it("wraps text by width, splitting over-long words", () => {
    const m = (s: string) => s.length * 10;
    expect(wrapText("one does not simply", 100, m)).toEqual(["one does", "not simply"]);
    expect(wrapText("supercalifragilistic", 50, m)).toEqual(["super", "calif", "ragil", "istic"]);
    expect(wrapText("a\nb", 100, m)).toEqual(["a", "b"]);
  });
  it("thumbnail checks", () => {
    expect(thumbnailChecks(1280, 720, 500_000, "image/jpeg").every((c) => c.ok)).toBe(true);
    const bad = thumbnailChecks(1000, 1000, 3_000_000, "image/avif");
    expect(bad.filter((c) => !c.ok)).toHaveLength(4);
  });
});

describe("passport head placement", () => {
  /** 200×300 mask: a 60-wide, 80-tall head (rows 40–120), a 20-wide neck (120–140), 160-wide shoulders below. */
  function person() {
    const w = 200,
      h = 300;
    const a = new Uint8ClampedArray(w * h * 4);
    const fill = (y0: number, y1: number, x0: number, x1: number) => {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) a[(y * w + x) * 4 + 3] = 255;
    };
    for (let y = 40; y < 120; y++) {
      const t = (y - 80) / 40; // ellipse
      const half = Math.round(30 * Math.sqrt(Math.max(0, 1 - t * t)));
      fill(y, y + 1, 100 - half, 100 + half);
    }
    fill(120, 140, 90, 110);
    fill(140, 300, 20, 180);
    return { a, w, h };
  }
  it("finds the crown, an estimated chin above the shoulders and the centre", () => {
    const { a, w, h } = person();
    const head = findHead(a, w, h)!;
    expect(head.top).toBe(41);
    expect(head.chin).toBeGreaterThan(110);
    expect(head.chin).toBeLessThan(140);
    expect(head.cx).toBeCloseTo(99.5, 1); // columns 70–129
  });
  it("places the head at the spec's share of the photo, centred", () => {
    const { a, w, h } = person();
    const head = findHead(a, w, h)!;
    const r = placeHead(head, w, h, 413, 531, 0.75);
    const s = r.w / w;
    expect((head.chin - head.top) * s).toBeCloseTo(0.75 * 531, 3);
    expect(r.x + head.cx * s).toBeCloseTo(413 / 2, 3);
    const crown = r.y + head.top * s;
    expect(crown).toBeGreaterThan(0);
    expect(crown).toBeLessThan(531 * 0.2);
  });
  it("empty mask and no shoulders", () => {
    expect(findHead(new Uint8ClampedArray(40), 10, 1)).toBeNull();
    const w = 50,
      h = 100;
    const a = new Uint8ClampedArray(w * h * 4);
    for (let y = 10; y < 90; y++) for (let x = 20; x < 30; x++) a[(y * w + x) * 4 + 3] = 255;
    const head = findHead(a, w, h)!;
    expect(head.chin).toBe(10 + Math.round(79 * 0.45));
  });
});
