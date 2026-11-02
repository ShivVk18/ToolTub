import { serveWorker } from "@/lib/worker-rpc";
import { heicTo, processImage, type ImageJob } from "./image-ops";

serveWorker({
  process: (job: ImageJob) => processImage(job),
  heic: (job: { blob: Blob; mime: "image/jpeg" | "image/png"; quality?: number }) => heicTo(job),
});
