import { serveWorker } from "@/lib/worker-rpc";
import { formatJson, type JsonJob } from "./json-ops";

serveWorker({ format: (job: JsonJob) => formatJson(job) });
