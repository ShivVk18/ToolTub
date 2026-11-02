import "server-only";
import { Queue } from "bullmq";
import IORedis from "ioredis";

/**
 * Job queue on self-hosted Valkey (BSD-3, Redis-compatible) with BullMQ (MIT).
 * Files live on a shared Docker volume (JOBS_DIR) that only the app and worker can see;
 * the queue carries only job ids and tool names, never file contents.
 */
export const JOBS_DIR = process.env.JOBS_DIR ?? "/data/jobs";
export const RETENTION_MS = 60 * 60 * 1000;
/** Set by the worker every few seconds with a short TTL. Missing = no worker alive → 503. */
export const HEARTBEAT_KEY = "klipkit:worker:heartbeat";

const g = globalThis as unknown as { redis?: IORedis; queue?: Queue };
// Fail fast in the web app: if Valkey is down, a command times out after 3 s and the API answers 503
// instead of hanging. (The offline queue stays on so requests sent while connecting still go through.)
export const redis = (g.redis ??= new IORedis(process.env.VALKEY_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  connectTimeout: 2000,
  commandTimeout: 3000,
  lazyConnect: true, // don't connect (or log) until a server tool is actually used
  // Reconnect quickly after a Valkey restart (default back-off grows to 2 s and failed requests meanwhile).
  retryStrategy: (times) => Math.min(times * 100, 500),
}));
// Errors are reported per request as 503; without these listeners a down Valkey floods the logs.
redis.on("error", () => {});
export const convertQueue = (g.queue ??= new Queue("convert", {
  connection: redis,
  defaultJobOptions: { attempts: 1, removeOnComplete: { age: 3600 }, removeOnFail: { age: 3600 } },
}));
convertQueue.on("error", () => {});

export const workerAlive = async () => (await redis.exists(HEARTBEAT_KEY)) === 1;

/** Server tools and the input they accept. Adding a tool = add it here and in worker/src/index.mjs. */
export const SERVER_TOOLS = {
  "pdf-to-word": { maxMb: 50, magic: "%PDF-", ext: "pdf", outExt: "docx", outType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
} as const;
export type ServerTool = keyof typeof SERVER_TOOLS;
