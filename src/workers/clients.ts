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

import type { PdfCompressJob } from "./pdf-ops";
type PdfOps = {
  compress: (job: PdfCompressJob) => { blob: Blob; originalSize: number; keptOriginal: boolean; note?: string };
};
export const pdfWorker = createWorkerClient<PdfOps>(
  () => new Worker(new URL("./pdf.worker.ts", import.meta.url), { type: "module" }),
);
