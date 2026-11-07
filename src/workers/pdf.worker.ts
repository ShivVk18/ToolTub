import { serveWorker, type Progress } from "@/lib/worker-rpc";
import { compressPdf, splitPdf, type PdfCompressJob, type PdfSplitJob } from "./pdf-ops";

serveWorker({
  compress: (job: PdfCompressJob, progress: Progress) => compressPdf(job, progress),
  split: (job: PdfSplitJob) => splitPdf(job),
});
