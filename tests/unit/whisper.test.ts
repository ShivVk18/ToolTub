import { describe, it, expect } from "vitest";
import {
  parseSubtitles,
  shiftSegments,
  melFilters,
  logMel,
  decodeTokens,
  segmentsFromTokens,
  toSrt,
  toVtt,
  stamp,
  splitLong,
  N_FRAMES,
  N_MELS,
  SAMPLE_RATE,
} from "@/lib/engines/whisper";

describe("mel features", () => {
  it("80 Slaney filters over 201 bins, triangular and non-negative", () => {
    const f = melFilters();
    expect(f).toHaveLength(80);
    expect(f[0]).toHaveLength(201);
    for (const row of f) {
      expect(Math.min(...row)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...row)).toBeGreaterThan(0);
    }
    // reference values measured with librosa.filters.mel(sr=16000, n_fft=400, n_mels=80)
    expect(f[1][1]).toBeCloseTo(0.001990822, 8);
    expect(Math.max(...f[0])).toBeCloseTo(0.024862595, 7);
    expect(f[40].indexOf(Math.max(...f[40]))).toBe(43);
    expect(Math.max(...f[40])).toBeCloseTo(0.014735566, 7);
  });
  it("silence gives a flat (x+4)/4 floor; a 440 Hz tone peaks in the right band", () => {
    const silent = logMel(new Float32Array(SAMPLE_RATE));
    expect(silent).toHaveLength(N_MELS * N_FRAMES);
    expect(new Set(Array.from(silent.slice(0, 500)).map((v) => v.toFixed(4))).size).toBe(1);

    const tone = Float32Array.from(
      { length: SAMPLE_RATE },
      (_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE),
    );
    const m = logMel(tone);
    const frame = 50;
    const col = Array.from({ length: N_MELS }, (_, k) => m[k * N_FRAMES + frame]);
    const peak = col.indexOf(Math.max(...col));
    // reference: OpenAI's recipe in numpy/librosa (stft reflect-padded, periodic Hann, last frame dropped, Slaney mel)
    expect(peak).toBe(11);
    expect(col[peak]).toBeCloseTo(1.4382, 3);
    expect(m[0 * N_FRAMES + 50]).toBeCloseTo(-0.5618, 3);
    expect(m[20 * N_FRAMES + 50]).toBeCloseTo(-0.5618, 3);
    expect(m[peak * N_FRAMES + 200]).toBeCloseTo(-0.5618, 3); // after the tone: the floor (max − 8)
  });
});

describe("tokens and segments", () => {
  // tiny vocab: 0 "Hello", 1 "Ġworld", 2 "Ã©" (é as two GPT-2 bytes), 3 "!"; specials from 10, timestamps from 20
  const vocab = ["Hello", "Ġworld", "Ã©", "!"];
  it("decodes byte-level BPE, including multi-byte UTF-8, skipping specials", () => {
    expect(decodeTokens([0, 1, 3], vocab, 10)).toBe("Hello world!");
    expect(decodeTokens([2], vocab, 10)).toBe("é");
    expect(decodeTokens([12, 0, 25], vocab, 10)).toBe("Hello");
  });
  it("splits at timestamp tokens and offsets by the chunk start", () => {
    // <|0.00|> Hello <|1.00|> <|1.00|> world! <|2.40|> eot
    const ids = [20, 0, 70, 70, 1, 3, 140, 10];
    const segs = segmentsFromTokens(ids, vocab, 10, 20, 30, 60);
    expect(segs).toEqual([
      { start: 30, end: 31, text: "Hello" },
      { start: 31, end: 32.4, text: "world!" },
    ]);
  });
  it("text without a closing timestamp ends at the chunk end", () => {
    expect(segmentsFromTokens([20, 0], vocab, 10, 20, 0, 4.5)).toEqual([{ start: 0, end: 4.5, text: "Hello" }]);
  });
});

describe("subtitle formats", () => {
  const segs = [
    { start: 0, end: 1.5, text: "Hello" },
    { start: 3661.25, end: 3662.999, text: "world" },
  ];
  it("SRT and VTT", () => {
    expect(toSrt(segs)).toBe("1\n00:00:00,000 --> 00:00:01,500\nHello\n\n2\n01:01:01,250 --> 01:01:02,999\nworld\n");
    expect(toVtt(segs)).toBe(
      "WEBVTT\n\n00:00:00.000 --> 00:00:01.500\nHello\n\n01:01:01.250 --> 01:01:02.999\nworld\n",
    );
    expect(stamp(59.9996, ",")).toBe("00:01:00,000");
  });
  it("splits long lines and shares the time", () => {
    const out = splitLong([{ start: 0, end: 10, text: "one two three four five six seven eight nine ten" }], 20);
    expect(out.every((s) => s.text.length <= 20)).toBe(true);
    expect(out[0].start).toBe(0);
    expect(out[out.length - 1].end).toBeCloseTo(10, 9);
  });
});

describe("subtitle parsing", () => {
  it("reads SRT and VTT (with cue settings, tags, BOM, CRLF, hour-less times) and round-trips", () => {
    const srt =
      "﻿1\r\n00:00:01,000 --> 00:00:02,500\r\n<i>Hello</i>\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\nTwo\r\nlines\r\n";
    expect(parseSubtitles(srt)).toEqual([
      { start: 1, end: 2.5, text: "Hello" },
      { start: 3, end: 4, text: "Two\nlines" },
    ]);
    const vtt = "WEBVTT\n\nSTYLE\n::cue { color: red }\n\n00:01.000 --> 00:02.000 align:start\nHi\n";
    expect(parseSubtitles(vtt)).toEqual([{ start: 1, end: 2, text: "Hi" }]);
    const segs = [{ start: 0.5, end: 1.25, text: "a" }];
    expect(parseSubtitles(toSrt(segs))).toEqual(segs);
    expect(parseSubtitles(toVtt(segs))).toEqual(segs);
  });
  it("rejects files without cues; shifting never goes below zero", () => {
    expect(() => parseSubtitles("just some text")).toThrow(/No subtitles/);
    expect(shiftSegments([{ start: 1, end: 2, text: "x" }], -1.5)).toEqual([{ start: 0, end: 0.5, text: "x" }]);
  });
});
