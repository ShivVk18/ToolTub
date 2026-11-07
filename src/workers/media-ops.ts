/**
 * Video and audio tools in a worker: Mediabunny (MPL-2.0) reads and writes containers, the browser's WebCodecs
 * encode and decode (hardware where available). Codecs are chosen by what this browser can actually encode:
 * MP4/H.264 where possible, otherwise WebM/VP9. No server, no ffmpeg.
 */
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  CanvasSink,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat,
  WavOutputFormat,
  OggOutputFormat,
  MovOutputFormat,
  QUALITY_HIGH,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  getEncodableAudioCodecs,
  getEncodableVideoCodecs,
  AudioSample,
  type OutputFormat,
  type VideoCodec,
  type AudioCodec,
} from "mediabunny";
import type { Progress } from "@/lib/worker-rpc";
import { encodeGif, type GifFrame } from "@/lib/engines/gif";

export interface Probe {
  duration: number;
  width?: number;
  height?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec?: string | null;
  audioCodec?: string | null;
  format: string;
}

async function open(file: Blob) {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const format = await input.getFormat();
    return { input, format: format.name };
  } catch {
    throw new Error("This file isn't a video or audio format we can read (try MP4, WebM, MOV, MP3, WAV, M4A or OGG).");
  }
}

export async function probe({ file }: { file: Blob }): Promise<Probe> {
  const { input, format } = await open(file);
  const v = await input.getPrimaryVideoTrack();
  const a = await input.getPrimaryAudioTrack();
  if (!v && !a) throw new Error("This file has no video or audio track.");
  return {
    duration: await input.computeDuration(),
    width: v ? v.displayWidth : undefined,
    height: v ? v.displayHeight : undefined,
    hasVideo: !!v,
    hasAudio: !!a,
    videoCodec: v ? v.codec : null,
    audioCodec: a ? a.codec : null,
    format,
  };
}

/** Best container + codecs this browser can encode. */
async function videoTarget(prefer: "mp4" | "webm" | "mov" = "mp4") {
  const v = await getEncodableVideoCodecs(["avc", "vp9", "av1", "vp8"] as VideoCodec[]);
  const a = await getEncodableAudioCodecs(["aac", "opus"] as AudioCodec[]);
  if ((prefer === "mp4" || prefer === "mov") && v.includes("avc"))
    return {
      format: prefer === "mov" ? new MovOutputFormat() : new Mp4OutputFormat({ fastStart: "in-memory" }),
      ext: prefer,
      type: prefer === "mov" ? "video/quicktime" : "video/mp4",
      video: "avc" as VideoCodec,
      audio: (a.includes("aac") ? "aac" : "opus") as AudioCodec,
    };
  const vc = (["vp9", "av1", "vp8"] as VideoCodec[]).find((c) => v.includes(c));
  if (!vc) throw new Error("This browser can't encode video. Try Chrome, Edge or Safari 17+.");
  return {
    format: new WebMOutputFormat(),
    ext: "webm",
    type: "video/webm",
    video: vc,
    audio: "opus" as AudioCodec,
    fellBack: prefer !== "webm",
  };
}

async function run(conversion: Conversion, progress: Progress, label: string) {
  if (!conversion.isValid) {
    const why = conversion.discardedTracks.map((d) => d.reason).join(", ");
    throw new Error(`Can't convert this file${why ? ` (${why.replace(/_/g, " ")})` : ""}.`);
  }
  conversion.onProgress = (p) => progress({ ratio: p, label });
  await conversion.execute();
}

const done = (output: Output, type: string) => new Blob([(output.target as BufferTarget).buffer!], { type });

// ───────────────────────── Compress ─────────────────────────
export interface CompressVideoJob {
  file: Blob;
  quality: "low" | "medium" | "high";
  maxHeight?: number;
  targetMB?: number;
}
export async function compressVideo(job: CompressVideoJob, progress: Progress) {
  const { input } = await open(job.file);
  const v = await input.getPrimaryVideoTrack();
  if (!v) throw new Error("This file has no video track.");
  const duration = await input.computeDuration();
  const t = await videoTarget("mp4");
  const output = new Output({ format: t.format as OutputFormat, target: new BufferTarget() });
  let bitrate: number | typeof QUALITY_HIGH =
    job.quality === "low" ? QUALITY_LOW : job.quality === "high" ? QUALITY_HIGH : QUALITY_MEDIUM;
  let audioBitrate = 128_000;
  if (job.targetMB) {
    const total = (job.targetMB * 8_000_000 * 0.95) / Math.max(1, duration); // 5% for the container
    // Mediabunny needs whole numbers: an unrounded bitrate made every target-size compression fail.
    audioBitrate = Math.round(Math.min(96_000, Math.max(32_000, total * 0.1)));
    bitrate = Math.round(Math.max(80_000, total - audioBitrate));
  }
  const height = job.maxHeight && v.displayHeight > job.maxHeight ? job.maxHeight : undefined;
  const conversion = await Conversion.init({
    input,
    output,
    video: { codec: t.video, bitrate, height: height ? Math.round(height / 2) * 2 : undefined, forceTranscode: true },
    audio: { codec: t.audio, bitrate: audioBitrate },
  });
  await run(conversion, progress, "Compressing on your device…");
  const blob = done(output, t.type);
  return {
    blob,
    ext: t.ext,
    originalSize: job.file.size,
    duration,
    note: t.fellBack ? "Saved as WebM: this browser can't write MP4." : undefined,
  };
}

// ───────────────────────── Convert ─────────────────────────
export async function convertVideo({ file, to }: { file: Blob; to: "mp4" | "webm" | "mov" }, progress: Progress) {
  const { input } = await open(file);
  if (!(await input.getPrimaryVideoTrack()))
    throw new Error("This file has no video track. For audio, use the Audio Converter.");
  const t = await videoTarget(to);
  const output = new Output({ format: t.format as OutputFormat, target: new BufferTarget() });
  const conversion = await Conversion.init({ input, output, video: { codec: t.video }, audio: { codec: t.audio } });
  await run(conversion, progress, "Converting on your device…");
  return {
    blob: done(output, t.type),
    ext: t.ext,
    note: t.ext !== to ? `Saved as ${t.ext.toUpperCase()}: this browser can't write ${to.toUpperCase()}.` : undefined,
  };
}

// ───────────────────────── Trim ─────────────────────────
export async function trimMedia({ file, start, end }: { file: Blob; start: number; end: number }, progress: Progress) {
  const { input } = await open(file);
  const duration = await input.computeDuration();
  if (!(end > start)) throw new Error("The end must be after the start.");
  if (start >= duration) throw new Error(`The clip is only ${duration.toFixed(1)} s long.`);
  const hasVideo = !!(await input.getPrimaryVideoTrack());
  const t = hasVideo ? await videoTarget("mp4") : await audioTarget("m4a");
  const output = new Output({ format: t.format as OutputFormat, target: new BufferTarget() });
  const conversion = await Conversion.init({
    input,
    output,
    trim: { start, end: Math.min(end, duration) },
    ...(hasVideo
      ? {
          video: { codec: (t as Awaited<ReturnType<typeof videoTarget>>).video },
          audio: { codec: (t as { audio: AudioCodec }).audio },
        }
      : { audio: { codec: (t as { audio: AudioCodec }).audio } }),
  });
  await run(conversion, progress, "Cutting on your device…");
  return { blob: done(output, t.type), ext: t.ext, length: Math.min(end, duration) - start };
}

// ───────────────────────── Audio ─────────────────────────
type AudioOut = "m4a" | "wav" | "webm" | "ogg";
async function audioTarget(to: AudioOut) {
  const a = await getEncodableAudioCodecs(["aac", "opus"] as AudioCodec[]);
  if (to === "wav")
    return { format: new WavOutputFormat(), ext: "wav", type: "audio/wav", audio: "pcm-s16" as AudioCodec };
  if (to === "m4a" && a.includes("aac"))
    return {
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      ext: "m4a",
      type: "audio/mp4",
      audio: "aac" as AudioCodec,
    };
  if (a.includes("opus"))
    return to === "ogg"
      ? { format: new OggOutputFormat(), ext: "ogg", type: "audio/ogg", audio: "opus" as AudioCodec }
      : { format: new WebMOutputFormat(), ext: "webm", type: "audio/webm", audio: "opus" as AudioCodec };
  // Nothing compressed available: WAV always works.
  return { format: new WavOutputFormat(), ext: "wav", type: "audio/wav", audio: "pcm-s16" as AudioCodec };
}

export interface AudioJob {
  file: Blob;
  to: AudioOut;
  /** Optional trim, in seconds. */
  start?: number;
  end?: number;
}
export async function extractAudio({ file, to, start, end }: AudioJob, progress: Progress) {
  const { input } = await open(file);
  if (!(await input.getPrimaryAudioTrack())) throw new Error("This file has no audio track.");
  const duration = await input.computeDuration();
  const trimmed = start !== undefined || end !== undefined;
  const s = Math.max(0, start ?? 0);
  const e = Math.min(duration, end ?? duration);
  if (trimmed && !(e > s)) throw new Error("The end must be after the start.");
  const t = await audioTarget(to);
  const output = new Output({ format: t.format as OutputFormat, target: new BufferTarget() });
  const conversion = await Conversion.init({
    input,
    output,
    video: { discard: true },
    audio: { codec: t.audio, bitrate: 160_000, process: fillGaps(trimmed ? s : 0) },
    ...(trimmed ? { trim: { start: s, end: e } } : {}),
  });
  await run(conversion, progress, "Converting audio on your device…");
  return {
    blob: done(output, t.type),
    ext: t.ext,
    duration: trimmed ? e - s : duration,
    note: t.ext !== to ? `Saved as ${t.ext.toUpperCase()}: this browser can't write ${to.toUpperCase()}.` : undefined,
  };
}

/**
 * Keeps audio in step with the video timeline: recordings (screen captures, phones under load) can have holes
 * between audio packets or start late, and formats without timestamps (WAV) would otherwise close the holes, making
 * the audio shorter and out of sync. Inserts silence for any gap over 10 ms, measured from `from` seconds.
 */
function fillGaps(from: number) {
  let end = from;
  return (sample: AudioSample): AudioSample | AudioSample[] => {
    const gap = sample.timestamp - end;
    end = Math.max(end, sample.timestamp + sample.duration);
    if (gap <= 0.01) return sample;
    const frames = Math.round(gap * sample.sampleRate);
    const silence = new AudioSample({
      data: new Float32Array(frames * sample.numberOfChannels),
      format: "f32-planar",
      numberOfChannels: sample.numberOfChannels,
      sampleRate: sample.sampleRate,
      timestamp: sample.timestamp - frames / sample.sampleRate,
    });
    return [silence, sample];
  };
}

// ───────────────────────── GIF ─────────────────────────
export interface GifJob {
  file: Blob;
  start: number;
  end: number;
  fps: number;
  width: number;
}
export async function videoToGif(job: GifJob, progress: Progress) {
  const { input } = await open(job.file);
  const v = await input.getPrimaryVideoTrack();
  if (!v) throw new Error("This file has no video track.");
  const duration = await input.computeDuration();
  const start = Math.max(0, job.start);
  const end = Math.min(duration, job.end);
  if (!(end > start)) throw new Error("The end must be after the start.");
  if (end - start > 30) throw new Error("Keep GIFs under 30 seconds: they get very large.");
  const w = Math.min(job.width, v.displayWidth);
  const h = Math.round((w * v.displayHeight) / v.displayWidth / 2) * 2;
  const sink = new CanvasSink(v, { width: w, height: h, fit: "fill", poolSize: 1 });
  // Frame times from a count, not by adding 1/fps repeatedly (float drift made 2 s at 5 fps give 11 frames).
  const count = Math.max(1, Math.round((end - start) * job.fps));
  const times = Array.from({ length: count }, (_, i) => start + i / job.fps);
  const frames: GifFrame[] = [];
  const ctxCanvas = new OffscreenCanvas(w, h);
  const ctx = ctxCanvas.getContext("2d", { willReadFrequently: true })!;
  let i = 0;
  for await (const wrapped of sink.canvasesAtTimestamps(times)) {
    progress({ ratio: (i / times.length) * 0.6, label: `Reading frame ${i + 1} of ${times.length}` });
    if (wrapped) {
      ctx.drawImage(wrapped.canvas as OffscreenCanvas, 0, 0);
      frames.push({ rgba: ctx.getImageData(0, 0, w, h).data, delay: 100 / job.fps });
    }
    i++;
  }
  if (!frames.length) throw new Error("Couldn't read any frames from this video.");
  progress({ ratio: 0.7, label: "Building the GIF…" });
  const gif = encodeGif(frames, w, h);
  return { blob: new Blob([gif as BlobPart], { type: "image/gif" }), frames: frames.length, width: w, height: h };
}
