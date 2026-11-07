import { describe, it, expect } from "vitest";
import { encodeGif, lzw, medianCut, mapPixels, parseTime, fmtTime } from "@/lib/engines/gif";

/** Minimal GIF LZW decoder (spec reference implementation) to prove our encoder round-trips. */
function unlzw(data: Uint8Array, minCode: number, count: number): number[] {
  const clear = 1 << minCode;
  const eoi = clear + 1;
  let size = minCode + 1;
  let dict: number[][] = [];
  const reset = () => {
    dict = [];
    for (let i = 0; i < clear; i++) dict[i] = [i];
    dict[clear] = [];
    dict[eoi] = [];
    size = minCode + 1;
  };
  reset();
  const out: number[] = [];
  let bit = 0;
  let prev: number[] | null = null;
  const read = () => {
    let v = 0;
    for (let i = 0; i < size; i++, bit++) v |= ((data[bit >> 3] >> (bit & 7)) & 1) << i;
    return v;
  };
  while (out.length < count) {
    const code = read();
    if (code === clear) {
      reset();
      prev = null;
      continue;
    }
    if (code === eoi) break;
    let entry: number[];
    if (dict[code]) entry = dict[code];
    else if (prev) entry = [...prev, prev[0]];
    else throw new Error("bad code");
    out.push(...entry);
    if (prev && dict.length < 4096) {
      dict.push([...prev, entry[0]]);
      if (dict.length === 1 << size && size < 12) size++;
    }
    prev = entry;
  }
  return out;
}
const subBlocks = (b: Uint8Array) => {
  const out: number[] = [];
  let i = 1; // skip min code size
  while (b[i]) {
    out.push(...b.subarray(i + 1, i + 1 + b[i]));
    i += 1 + b[i];
  }
  return new Uint8Array(out);
};

describe("GIF encoder", () => {
  it("LZW round-trips, including past the 4096-code dictionary reset", () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 256;
    for (const n of [1, 2, 100, 20000]) {
      const idx = Uint8Array.from({ length: n }, () => rnd());
      const enc = lzw(idx, 8);
      expect(enc[0]).toBe(8);
      expect(unlzw(subBlocks(enc), 8, n)).toEqual([...idx]);
    }
    const runs = new Uint8Array(5000).fill(3);
    expect(unlzw(subBlocks(lzw(runs, 2)), 2, 5000)).toEqual([...runs]);
  });
  it("median cut keeps distinct colours and maps pixels to the nearest", () => {
    const px = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255, 255, 0, 0, 255, 0, 0, 255, 255]);
    const pal = medianCut(px, 4, 1);
    expect(pal).toHaveLength(2);
    const idx = mapPixels(px, pal);
    expect(idx[0]).toBe(idx[2]);
    expect(idx[0]).not.toBe(idx[1]);
  });
  it("writes a valid looping GIF89a with one image per frame", () => {
    const w = 4,
      h = 3;
    const frame = (r: number) => ({
      rgba: new Uint8ClampedArray(w * h * 4).map((_, i) => (i % 4 === 0 ? r : i % 4 === 3 ? 255 : 0)),
      delay: 10,
    });
    const g = encodeGif([frame(255), frame(0)], w, h);
    const s = String.fromCharCode(...g);
    expect(s.slice(0, 6)).toBe("GIF89a");
    expect(g[6] | (g[7] << 8)).toBe(4);
    expect(g[8] | (g[9] << 8)).toBe(3);
    expect(s).toContain("NETSCAPE2.0");
    expect(s.split("\x21\xf9\x04").length - 1).toBe(2); // two graphic control blocks
    expect(g[g.length - 1]).toBe(0x3b);
  });
  it("rejects empty and mismatched frames", () => {
    expect(() => encodeGif([], 1, 1)).toThrow(/No frames/);
    expect(() => encodeGif([{ rgba: new Uint8ClampedArray(4), delay: 5 }], 2, 2)).toThrow(/same size/);
  });
});

describe("times", () => {
  it("parses m:ss, h:mm:ss, decimals and plain seconds", () => {
    expect(parseTime("0:10")).toBe(10);
    expect(parseTime("1:02.5")).toBe(62.5);
    expect(parseTime("1:00:00")).toBe(3600);
    expect(parseTime("75")).toBe(75);
  });
  it("rejects junk and 0:75", () => {
    expect(() => parseTime("abc")).toThrow();
    expect(() => parseTime("0:75")).toThrow(/59/);
    expect(() => parseTime("")).toThrow();
    expect(() => parseTime("-5")).toThrow();
  });
  it("formats", () => {
    expect(fmtTime(62.5)).toBe("1:02.5");
    expect(fmtTime(5)).toBe("0:05");
  });
});
