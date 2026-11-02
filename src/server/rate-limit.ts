import "server-only";
import { createHash } from "node:crypto";
import { redis } from "./queue";

/**
 * Own fixed-window rate limiter on Valkey. Stores only a salted hash of the IP, expiring with the window,
 * so no IP address is ever persisted. Default: 20 server jobs per IP per hour.
 */
export async function rateLimit(ip: string, bucket: string, limit = 20, windowSec = 3600) {
  const salt = process.env.RATE_LIMIT_SALT ?? "change-me";
  const key = `rl:${bucket}:${createHash("sha256").update(salt + ip).digest("hex").slice(0, 32)}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, windowSec);
  return { ok: n <= limit, remaining: Math.max(0, limit - n) };
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
