/**
 * KlipKit conversion worker. Runs LibreOffice headless (MPL-2.0) in a container with NO network access.
 * - Consumes the "convert" BullMQ queue on Valkey (one job at a time per container; scale with replicas)
 * - Reads/writes files only inside JOBS_DIR/<job id>
 * - Sweeper deletes every job folder older than 1 hour, every 5 minutes
 */
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { execFile } from "node:child_process";
import { readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const JOBS_DIR = process.env.JOBS_DIR ?? "/data/jobs";
// Overridable for tests (e2e uses a few seconds); production default is 1 hour.
const RETENTION_MS = Number(process.env.RETENTION_MS ?? 60 * 60 * 1000);
const SWEEP_INTERVAL_MS = Number(process.env.SWEEP_INTERVAL_MS ?? 5 * 60 * 1000);
const HEARTBEAT_MS = Number(process.env.HEARTBEAT_MS ?? 5000);
const HEARTBEAT_KEY = "klipkit:worker:heartbeat";
const TIMEOUT_MS = 120_000;
const connection = new IORedis(process.env.VALKEY_URL ?? "redis://valkey:6379", { maxRetriesPerRequest: null });

/**
 * Each tool = one LibreOffice invocation. A fresh profile dir per job keeps runs isolated.
 * Args go straight to execFile (no shell), so filter names must NOT be quoted.
 * soffice exits 0 even when a conversion fails; the rename below fails the job if no output exists.
 */
const TOOLS = {
  // writer_pdf_import opens the PDF as flowing text in Writer (better for editing than the default Draw import).
  "pdf-to-word": {
    input: "input.pdf",
    output: "output.docx",
    args: ["--infilter=writer_pdf_import", "--convert-to", "docx:MS Word 2007 XML"],
  },
};

async function convert(job) {
  const spec = TOOLS[job.data.tool];
  if (!spec) throw new Error(`Unknown tool ${job.data.tool}`);
  const dir = join(JOBS_DIR, job.data.id);
  const produced = spec.input.replace(/\.[^.]+$/, "") + "." + spec.output.split(".").pop();
  const once = async () => {
    await run(
      "soffice",
      [
        "--headless",
        "--norestore",
        "--nolockcheck",
        `-env:UserInstallation=file://${dir}/profile`,
        ...spec.args,
        "--outdir",
        dir,
        join(dir, spec.input),
      ],
      { timeout: TIMEOUT_MS, killSignal: "SIGKILL" },
    ).catch((e) => {
      throw new Error(e.killed ? "timeout" : "conversion failed");
    });
    await rename(join(dir, produced), join(dir, spec.output)).catch(() => {
      throw new Error("conversion failed");
    });
  };
  try {
    await once();
  } catch (e) {
    // LibreOffice occasionally fails to start under heavy load. Retry once with a fresh profile;
    // a timeout is not retried because a second try would double the user's wait.
    if (e.message === "timeout") throw e;
    console.warn(`[worker] job ${job.data.id}: first attempt failed, retrying`);
    await rm(join(dir, "profile"), { recursive: true, force: true });
    await once();
  } finally {
    await rm(join(dir, "profile"), { recursive: true, force: true });
  }
  return { ok: true };
}

new Worker("convert", convert, { connection, concurrency: Number(process.env.CONCURRENCY ?? 1) });

async function sweep() {
  const now = Date.now();
  for (const name of await readdir(JOBS_DIR).catch(() => [])) {
    const p = join(JOBS_DIR, name);
    const s = await stat(p).catch(() => null);
    if (s && now - s.mtimeMs > RETENTION_MS) await rm(p, { recursive: true, force: true });
  }
}
setInterval(sweep, SWEEP_INTERVAL_MS);
sweep();

// Heartbeat: the web app refuses new server jobs (503) when no worker has checked in recently.
const beat = () => connection.set(HEARTBEAT_KEY, String(Date.now()), "PX", HEARTBEAT_MS * 3).catch(() => {});
setInterval(beat, HEARTBEAT_MS);
await beat();
console.log("klipkit-worker ready");
