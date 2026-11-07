import { describe, it, expect } from "vitest";
import { parsePageRanges, rangesToPages, jpegOrientation, stem } from "@/lib/engines/pages";

describe("page ranges", () => {
  it("parses lists, open ends, keywords", () => {
    expect(parsePageRanges("1-3, 5, 8-", 10)).toEqual([
      [1, 3],
      [5, 5],
      [8, 10],
    ]);
    expect(parsePageRanges("", 4)).toEqual([[1, 4]]);
    expect(parsePageRanges("all", 4)).toEqual([[1, 4]]);
    expect(parsePageRanges("-2", 4)).toEqual([[1, 2]]);
    expect(parsePageRanges("last", 7)).toEqual([[7, 7]]);
    expect(parsePageRanges("3-last", 7)).toEqual([[3, 7]]);
    expect(parsePageRanges("2 – 4; 6", 9)).toEqual([
      [2, 4],
      [6, 6],
    ]);
    expect(parsePageRanges("1 to 3", 9)).toEqual([[1, 3]]);
    expect(rangesToPages(parsePageRanges("odd", 5))).toEqual([1, 3, 5]);
    expect(rangesToPages(parsePageRanges("even", 5))).toEqual([2, 4]);
  });
  it("clamps past the end, keeps duplicates, reverses only when asked", () => {
    expect(parsePageRanges("3-99", 5)).toEqual([[3, 5]]);
    expect(rangesToPages(parsePageRanges("1, 1", 3))).toEqual([1, 1]);
    expect(parsePageRanges("5-2", 6)).toEqual([[2, 5]]);
    expect(rangesToPages(parsePageRanges("5-2", 6, true))).toEqual([5, 4, 3, 2]);
  });
  it("edge cases: out of range, zero, junk, no pages", () => {
    expect(() => parsePageRanges("9", 5)).toThrow(/only 5 pages/);
    expect(() => parsePageRanges("0-2", 5)).toThrow(/start at 1/);
    expect(() => parsePageRanges("abc", 5)).toThrow(/isn't a page/);
    expect(() => parsePageRanges("1-2-3", 5)).toThrow();
    expect(() => parsePageRanges("even", 1)).toThrow(/no even/);
    expect(() => parsePageRanges("1", 0)).toThrow(/no pages/);
    expect(() => parsePageRanges("2", 1)).toThrow(/only 1 page,/);
  });
});

/** Minimal JPEG: SOI + APP1 Exif with one IFD entry (Orientation) + SOS. */
function jpegWith(orientation: number, littleEndian: boolean) {
  const u16 = (v: number) => (littleEndian ? [v & 255, v >> 8] : [v >> 8, v & 255]);
  const u32 = (v: number) =>
    littleEndian
      ? [v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24]
      : [v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255];
  const tiff = [
    ...(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42),
    ...u32(8),
    ...u16(1), // one entry
    ...u16(0x0112),
    ...u16(3),
    ...u32(1),
    ...u16(orientation),
    0,
    0,
    ...u32(0),
  ];
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 255, ...app1, 0xff, 0xda, 0, 2]);
}

describe("JPEG EXIF orientation", () => {
  it("reads orientation in both byte orders", () => {
    expect(jpegOrientation(jpegWith(6, false))).toBe(6);
    expect(jpegOrientation(jpegWith(8, true))).toBe(8);
    expect(jpegOrientation(jpegWith(1, true))).toBe(1);
  });
  it("defaults to 1 for non-JPEG, no EXIF, bad values, truncated data", () => {
    expect(jpegOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(1);
    expect(jpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(1);
    expect(jpegOrientation(jpegWith(9, true))).toBe(1);
    expect(jpegOrientation(jpegWith(6, true).slice(0, 20))).toBe(1);
  });
  it("file stems", () => {
    expect(stem("Q3 report (final).pdf")).toBe("Q3 report (final)");
    expect(stem(".pdf")).toBe("file");
    expect(stem("a.b.c.jpg")).toBe("a.b.c");
  });
});
