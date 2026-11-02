import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getQueue, JOBS_DIR, SERVER_TOOLS, workerAlive, type ServerTool } from "@/server/queue";
import { clientIp, rateLimit } from "@/server/rate-limit";

/**
 * POST /api/jobs?tool=pdf-to-word  (multipart, field "file")
 * Validates size + magic bytes, rate-limits per IP, stores the file on the private jobs volume and
 * enqueues a conversion. This is also the seed of the future public KlipKit API (/api/v1, with keys).
 */
export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err) {
    // Log the cause (never file names or contents) so outages are diagnosable; the user gets a 503.
    console.error("[api/jobs] server tool unavailable:", err instanceof Error ? err.message : err);
    return Response.json({ error: "Server tools are temporarily unavailable. Please try again in a few minutes." }, { status: 503 });
  }
}

async function handle(req: Request) {
  const tool = new URL(req.url).searchParams.get("tool") as ServerTool;
  const spec = SERVER_TOOLS[tool];
  if (!spec) return Response.json({ error: "Unknown tool" }, { status: 400 });

  const rl = await rateLimit(clientIp(req), "server-tools", Number(process.env.RATE_LIMIT_MAX ?? 20));
  if (!rl.ok) return Response.json({ error: "Hourly limit reached for server tools" }, { status: 429 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file received" }, { status: 400 });
  if (file.size > spec.maxMb * 1024 * 1024) return Response.json({ error: `File is larger than ${spec.maxMb} MB` }, { status: 413 });

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, spec.magic.length).toString("latin1") !== spec.magic) {
    return Response.json({ error: "That file isn't a valid PDF" }, { status: 415 });
  }

  // Queue up but no worker alive: say so now instead of letting the job wait forever.
  if (!(await workerAlive())) throw new Error("no worker");

  // The client's file name is never used on disk (path traversal safe): files are always input.<ext>.
  const id = randomUUID();
  const dir = join(JOBS_DIR, id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `input.${spec.ext}`), bytes);
  await getQueue().add(tool, { id, tool }, { jobId: id });
  return Response.json({ id }, { status: 202 });
}
