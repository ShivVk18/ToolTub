"use client";
import { createWorkerClient } from "@/lib/worker-rpc";
import type { ImageJob, ImageResult } from "./image-ops";

type ImageOps = {
  process: (job: ImageJob) => ImageResult;
  heic: (job: { blob: Blob; mime: "image/jpeg" | "image/png"; quality?: number }) => {
    blob: Blob;
    width: number;
    height: number;
  };
};

/** Lazily created: the worker file is only fetched when a tool first calls it. */
export const imageWorker = createWorkerClient<ImageOps>(
  () => new Worker(new URL("./image.worker.ts", import.meta.url), { type: "module" }),
);

type BgOps = { remove: (job: { blob: Blob }) => { blob: Blob; width: number; height: number; backend: string } };

export const bgWorker = createWorkerClient<BgOps>(
  () => new Worker(new URL("./bg.worker.ts", import.meta.url), { type: "module" }),
);

import type { JsonJob, JsonResult } from "@/lib/engines/json";
export const jsonWorker = createWorkerClient<{ format: (job: JsonJob) => JsonResult }>(
  () => new Worker(new URL("./json.worker.ts", import.meta.url), { type: "module" }),
);

import type {
  PdfCompressJob,
  PdfSplitJob,
  PdfMergeJob,
  PdfSplitRangesJob,
  ImagesToPdfJob,
  WatermarkJob,
  OrganizeJob,
  SignJob,
  ProtectJob,
  UnlockJob,
  FormField,
  Resume,
} from "./pdf-ops";
type PdfOps = {
  compress: (job: PdfCompressJob) => { blob: Blob; originalSize: number; keptOriginal: boolean; note?: string };
  split: (job: PdfSplitJob) => { blob: Blob; pages: number; from: number; to: number };
  merge: (job: PdfMergeJob) => { blob: Blob; pages: number };
  splitRanges: (job: PdfSplitRangesJob) => { files: { blob: Blob; label: string; pages: number }[]; total: number };
  imagesToPdf: (job: ImagesToPdfJob) => { blob: Blob; pages: number };
  watermark: (job: WatermarkJob) => { blob: Blob; pages: number };
  organize: (job: OrganizeJob) => { blob: Blob; pages: number };
  sign: (job: SignJob) => { blob: Blob };
  protect: (job: ProtectJob) => { blob: Blob };
  unlock: (job: UnlockJob) => { blob: Blob };
  fields: (job: { bytes: ArrayBuffer }) => FormField[];
  resume: (job: { r: Resume; template: "classic" | "modern"; accent: string }) => { blob: Blob; pages: number };
};
export const pdfWorker = createWorkerClient<PdfOps>(
  () => new Worker(new URL("./pdf.worker.ts", import.meta.url), { type: "module" }),
);

import type { Probe, CompressVideoJob, GifJob, AudioJob } from "./media-ops";
type MediaOps = {
  probe: (job: { file: Blob }) => Probe;
  compress: (job: CompressVideoJob) => {
    blob: Blob;
    ext: string;
    originalSize: number;
    duration: number;
    note?: string;
  };
  convert: (job: { file: Blob; to: "mp4" | "webm" | "mov" }) => { blob: Blob; ext: string; note?: string };
  trim: (job: { file: Blob; start: number; end: number }) => { blob: Blob; ext: string; length: number };
  audio: (job: AudioJob) => { blob: Blob; ext: string; duration: number; note?: string };
  gif: (job: GifJob) => { blob: Blob; frames: number; width: number; height: number };
};
export const mediaWorker = createWorkerClient<MediaOps>(
  () => new Worker(new URL("./media.worker.ts", import.meta.url), { type: "module" }),
);

import type { TranscribeJob, TranscribeResult } from "./whisper.worker";
export const whisperWorker = createWorkerClient<{ transcribe: (job: TranscribeJob) => TranscribeResult }>(
  () => new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" }),
);
