/**
 * [Own] The pure parts of Whisper speech recognition: log-mel features exactly as OpenAI's reference computes them,
 * byte-level token decoding, timestamp segments and subtitle formats. The ONNX model runs in whisper.worker.ts.
 */

export const SAMPLE_RATE = 16000;
export const N_FFT = 400;
export const HOP = 160;
export const N_MELS = 80;
export const CHUNK_SECONDS = 30;
export const N_SAMPLES = SAMPLE_RATE * CHUNK_SECONDS; // 480 000
export const N_FRAMES = N_SAMPLES / HOP; // 3000

/** librosa.filters.mel(sr, n_fft, n_mels) with its defaults: Slaney mel scale and Slaney (area) normalisation. */
export function melFilters(sr = SAMPLE_RATE, nFft = N_FFT, nMels = N_MELS): Float32Array[] {
  const fMin = 0;
  const fMax = sr / 2;
  const fSp = 200 / 3;
  const minLogHz = 1000;
  const minLogMel = minLogHz / fSp;
  const logStep = Math.log(6.4) / 27;
  const hzToMel = (f: number) => (f >= minLogHz ? minLogMel + Math.log(f / minLogHz) / logStep : f / fSp);
  const melToHz = (m: number) => (m >= minLogMel ? minLogHz * Math.exp(logStep * (m - minLogMel)) : fSp * m);
  const nBins = nFft / 2 + 1;
  const fftFreqs = Array.from({ length: nBins }, (_, i) => (i * sr) / nFft);
  const mMin = hzToMel(fMin);
  const mMax = hzToMel(fMax);
  const melPts = Array.from({ length: nMels + 2 }, (_, i) => melToHz(mMin + ((mMax - mMin) * i) / (nMels + 1)));
  const filters: Float32Array[] = [];
  for (let m = 0; m < nMels; m++) {
    const row = new Float32Array(nBins);
    const [l, c, r] = [melPts[m], melPts[m + 1], melPts[m + 2]];
    const enorm = 2 / (r - l);
    for (let k = 0; k < nBins; k++) {
      const f = fftFreqs[k];
      const lower = (f - l) / (c - l);
      const upper = (r - f) / (r - c);
      row[k] = Math.max(0, Math.min(lower, upper)) * enorm;
    }
    filters.push(row);
  }
  return filters;
}

let cached: { filters: Float32Array[]; cos: Float32Array; sin: Float32Array; win: Float32Array } | null = null;
function tables() {
  if (cached) return cached;
  const nBins = N_FFT / 2 + 1;
  const cos = new Float32Array(nBins * N_FFT);
  const sin = new Float32Array(nBins * N_FFT);
  for (let k = 0; k < nBins; k++)
    for (let n = 0; n < N_FFT; n++) {
      const a = (2 * Math.PI * k * n) / N_FFT;
      cos[k * N_FFT + n] = Math.cos(a);
      sin[k * N_FFT + n] = Math.sin(a);
    }
  // periodic Hann window, as torch.hann_window(400)
  const win = Float32Array.from({ length: N_FFT }, (_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / N_FFT));
  return (cached = { filters: melFilters(), cos, sin, win });
}

/**
 * Whisper's input: 30 s of 16 kHz mono audio (padded or cut) → 80×3000 log-mel features, row-major [mel][frame].
 * STFT with centre reflect-padding, magnitude², drop the last frame, mel, log10 (≥ 1e-10), clamp to max−8, (x+4)/4.
 */
export function logMel(audio: Float32Array): Float32Array {
  const { filters, cos, sin, win } = tables();
  const x = new Float32Array(N_SAMPLES);
  x.set(audio.subarray(0, N_SAMPLES));
  const pad = N_FFT / 2;
  const padded = new Float32Array(N_SAMPLES + 2 * pad);
  padded.set(x, pad);
  for (let i = 0; i < pad; i++) {
    padded[pad - 1 - i] = x[i + 1]; // reflect, excluding the edge sample
    padded[pad + N_SAMPLES + i] = x[N_SAMPLES - 2 - i];
  }
  const nBins = N_FFT / 2 + 1;
  const out = new Float32Array(N_MELS * N_FRAMES);
  const frame = new Float32Array(N_FFT);
  const power = new Float32Array(nBins);
  let max = -Infinity;
  for (let t = 0; t < N_FRAMES; t++) {
    const off = t * HOP;
    for (let n = 0; n < N_FFT; n++) frame[n] = padded[off + n] * win[n];
    for (let k = 0; k < nBins; k++) {
      let re = 0,
        im = 0;
      const base = k * N_FFT;
      for (let n = 0; n < N_FFT; n++) {
        re += frame[n] * cos[base + n];
        im -= frame[n] * sin[base + n];
      }
      power[k] = re * re + im * im;
    }
    for (let m = 0; m < N_MELS; m++) {
      const f = filters[m];
      let s = 0;
      for (let k = 0; k < nBins; k++) s += f[k] * power[k];
      const v = Math.log10(Math.max(s, 1e-10));
      out[m * N_FRAMES + t] = v;
      if (v > max) max = v;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = (Math.max(out[i], max - 8) + 4) / 4;
  return out;
}

/** GPT-2 byte ↔ unicode table: BPE tokens are strings of these stand-in characters, one per byte. */
const BYTE_DECODER: Record<string, number> = (() => {
  const bs: number[] = [];
  for (let i = 33; i <= 126; i++) bs.push(i);
  for (let i = 161; i <= 172; i++) bs.push(i);
  for (let i = 174; i <= 255; i++) bs.push(i);
  const cs = [...bs];
  let n = 0;
  for (let b = 0; b < 256; b++)
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n++);
    }
  return Object.fromEntries(bs.map((b, i) => [String.fromCharCode(cs[i]), b]));
})();

/** Token ids → text. Ids at or above `specialFrom` (special and timestamp tokens) are skipped. */
export function decodeTokens(ids: number[], idToToken: string[], specialFrom: number): string {
  const bytes: number[] = [];
  for (const id of ids) {
    if (id >= specialFrom) continue;
    const tok = idToToken[id];
    if (tok === undefined) continue;
    for (const ch of tok) {
      const b = BYTE_DECODER[ch];
      if (b !== undefined) bytes.push(b);
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

export interface Segment {
  start: number;
  end: number;
  text: string;
}

/**
 * Splits decoded tokens at timestamp tokens (<|0.00|> = timestampBegin, steps of 0.02 s) into segments, offset by
 * the chunk start. Text before the first timestamp or after the last opens/closes a segment at the chunk edges.
 */
export function segmentsFromTokens(
  ids: number[],
  idToToken: string[],
  eot: number,
  timestampBegin: number,
  offset: number,
  chunkEnd: number,
): Segment[] {
  const segs: Segment[] = [];
  let start: number | null = null;
  let buf: number[] = [];
  const flush = (end: number) => {
    const text = decodeTokens(buf, idToToken, eot).trim();
    if (text)
      segs.push({
        start: offset + (start ?? 0),
        end: Math.max(offset + (start ?? 0), Math.min(chunkEnd, offset + end)),
        text,
      });
    buf = [];
  };
  for (const id of ids) {
    if (id >= timestampBegin) {
      const t = (id - timestampBegin) * 0.02;
      if (start === null) start = t;
      else {
        flush(t);
        start = t;
      }
    } else if (id < eot) buf.push(id);
  }
  if (buf.length) flush(chunkEnd - offset);
  return segs;
}

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, "0");
export function stamp(sec: number, sep: "," | ".") {
  const s = Math.max(0, sec);
  const ms = Math.round((s % 1) * 1000);
  const whole = Math.floor(s) + (ms === 1000 ? 1 : 0);
  return `${pad(whole / 3600)}:${pad((whole % 3600) / 60)}:${pad(whole % 60)}${sep}${pad(ms === 1000 ? 0 : ms, 3)}`;
}
export const toSrt = (segs: Segment[]) =>
  segs.map((s, i) => `${i + 1}\n${stamp(s.start, ",")} --> ${stamp(s.end, ",")}\n${s.text}\n`).join("\n");
export const toVtt = (segs: Segment[]) =>
  "WEBVTT\n\n" + segs.map((s) => `${stamp(s.start, ".")} --> ${stamp(s.end, ".")}\n${s.text}\n`).join("\n");

/** Splits long segments into subtitle-sized lines (≤ `max` characters each), sharing the time by length. */
export function splitLong(segs: Segment[], max = 84): Segment[] {
  const out: Segment[] = [];
  for (const s of segs) {
    if (s.text.length <= max) {
      out.push(s);
      continue;
    }
    const words = s.text.split(/\s+/);
    const parts: string[] = [];
    let cur = "";
    for (const w of words) {
      if (cur && (cur + " " + w).length > max) {
        parts.push(cur);
        cur = w;
      } else cur = cur ? cur + " " + w : w;
    }
    if (cur) parts.push(cur);
    const total = parts.reduce((a, p) => a + p.length, 0);
    let t = s.start;
    for (const p of parts) {
      const d = ((s.end - s.start) * p.length) / total;
      out.push({ start: t, end: t + d, text: p });
      t += d;
    }
  }
  return out;
}

/** Parses SRT or WebVTT into segments (cue settings, numbering and styling blocks ignored). Throws if none. */
export function parseSubtitles(src: string): Segment[] {
  const t = src.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const time = (s: string) => {
    const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/.exec(s.trim());
    if (!m) return NaN;
    return +(m[1] ?? 0) * 3600 + +m[2] * 60 + +m[3] + +m[4].padEnd(3, "0") / 1000;
  };
  const segs: Segment[] = [];
  for (const block of t.split(/\n{2,}/)) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, b] = lines[i].split("-->");
    const start = time(a);
    const end = time(b.trim().split(/\s+/)[0]);
    const text = lines
      .slice(i + 1)
      .join("\n")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!isNaN(start) && !isNaN(end) && text) segs.push({ start, end: Math.max(start, end), text });
  }
  if (!segs.length) throw new Error("No subtitles found. Is this an .srt or .vtt file?");
  return segs;
}

/** Moves every cue by `delta` seconds (negative = earlier), never below 0. */
export const shiftSegments = (segs: Segment[], delta: number) =>
  segs.map((s) => ({ ...s, start: Math.max(0, s.start + delta), end: Math.max(0, s.end + delta) }));
