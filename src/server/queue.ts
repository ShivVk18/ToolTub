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
const URL_ = process.env.VALKEY_URL ?? "redis://localhost:6379";

/**
 * Clients are created on first use and rebuilt if they have ended. Previously one shared client was
 * created at import time; after a Valkey outage BullMQ left it permanently closed ("Connection is
 * closed") and every server-tool request returned 503 until the app restarted.
 */
export function getRedis() {
  if (!g.redis || g.redis.status === "end") {
    g.redis = new IORedis(URL_, {
      maxRetriesPerRequest: 1, // fail fast → 503 instead of hanging
      connectTimeout: 2000,
      commandTimeout: 3000,
      lazyConnect: true, // don't connect (or log) until a server tool is actually used
      retryStrategy: (times) => Math.min(times * 100, 500),
    });
    // Errors are reported per request as 503; without a listener a down Valkey floods the logs.
    g.redis.on("error", () => {});
  }
  return g.redis;
}

export function getQueue() {
  // BullMQ gets its own connection (from options, not our instance) so it can't close ours.
  if (!g.queue || g.queue.closing) {
    g.queue = new Queue("convert", {
      connection: {
        url: URL_,
        maxRetriesPerRequest: null,
        connectTimeout: 2000,
        retryStrategy: (times: number) => Math.min(times * 100, 500),
      },
      defaultJobOptions: { attempts: 1, removeOnComplete: { age: 3600 }, removeOnFail: { age: 3600 } },
    });
    g.queue.on("error", () => {});
  }
  return g.queue;
}

/** Fast-failing reachability check before using the queue (BullMQ itself would wait, not fail). */
export const queueUp = async () => {
  try {
    return (await getRedis().ping()) === "PONG";
  } catch {
    return false;
  }
};

export const workerAlive = async () => (await getRedis().exists(HEARTBEAT_KEY)) === 1;

/** Server tools and the input they accept. Adding a tool = add it here and in worker/src/index.mjs. */
export const SERVER_TOOLS = {
  "pdf-to-word": {
    maxMb: 50,
    magic: "%PDF-",
    ext: "pdf",
    outExt: "docx",
    outType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
} as const;
export type ServerTool = keyof typeof SERVER_TOOLS;
