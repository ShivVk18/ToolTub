import { serveWorker } from "@/lib/worker-rpc";
import { formatJson, type JsonJob } from "@/lib/engines/json";

serveWorker({ format: (job: JsonJob) => formatJson(job) });
