import { serveWorker, type Progress } from "@/lib/worker-rpc";
import { compressPdf, type PdfCompressJob } from "./pdf-ops";

serveWorker({ compress: (job: PdfCompressJob, progress: Progress) => compressPdf(job, progress) });
