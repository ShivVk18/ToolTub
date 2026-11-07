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
};
export const pdfWorker = createWorkerClient<PdfOps>(
  () => new Worker(new URL("./pdf.worker.ts", import.meta.url), { type: "module" }),
);
