import { test, expect } from "@playwright/test";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { docxText, downloadFrom, fx, gen, output, pdfText, primary, upload, alert, byTestId } from "./helpers";
import { JOBS_DIR, REDIS_PORT } from "../../playwright.config";

/**
 * Server tools end to end: real Redis/Valkey + the real worker + LibreOffice.
 * Skips (with a reason) if redis-server/valkey-server or soffice are not installed.
 * Worker runs with a shortened expiry (RETENTION_MS) so auto-delete can be tested.
 */
const which = (bin: string) => {
  try {
    return execSync(`command -v ${bin}`, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};
// CI provides Valkey as a service container (E2E_EXTERNAL_REDIS=1) instead of a local binary.
const EXTERNAL_REDIS = !!process.env.E2E_EXTERNAL_REDIS;
const REDIS = EXTERNAL_REDIS ? "external" : which("valkey-server") || which("redis-server");
const SOFFICE_DIR =
  process.env.SOFFICE_DIR ??
  (existsSync("/Applications/LibreOffice.app/Contents/MacOS/soffice")
    ? "/Applications/LibreOffice.app/Contents/MacOS"
    : which("soffice").replace(/\/soffice$/, ""));
const RETENTION_MS = 6000;

let redis: ChildProcess | undefined;
let worker: ChildProcess | undefined;
const startRedis = async () => {
  if (EXTERNAL_REDIS) return;
  redis = spawn(REDIS, ["--port", String(REDIS_PORT), "--save", "", "--appendonly", "no"], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 600));
};
const startWorker = async () => {
  // Reuse a running worker: starting a second one orphaned the first, which then kept taking jobs after stopWorker().
  if (worker) return;
  worker = spawn(process.execPath, ["worker/src/index.mjs"], {
    env: {
      ...process.env,
      PATH: `${SOFFICE_DIR}:${process.env.PATH}`,
      VALKEY_URL: `redis://127.0.0.1:${REDIS_PORT}`,
      JOBS_DIR,
      RETENTION_MS: String(RETENTION_MS),
      SWEEP_INTERVAL_MS: "1000",
      HEARTBEAT_MS: "1000",
    },
    stdio: "pipe",
  });
  await new Promise<void>((resolve) => worker!.stdout!.on("data", (d) => String(d).includes("ready") && resolve()));
  await new Promise((r) => setTimeout(r, 1500));
};
const stopWorker = async () => {
  worker?.kill("SIGKILL");
  worker = undefined;
  await new Promise((r) => setTimeout(r, 300));
};

test.describe.configure({ mode: "serial" });
test.skip(!REDIS || !SOFFICE_DIR, "needs redis-server/valkey-server and LibreOffice (soffice) installed");

test.beforeAll(() => {
  rmSync(JOBS_DIR, { recursive: true, force: true });
  mkdirSync(JOBS_DIR, { recursive: true });
});
test.afterAll(async () => {
  await stopWorker();
  redis?.kill("SIGKILL");
});

const post = (
  request: import("@playwright/test").APIRequestContext,
  file: { name: string; mimeType: string; buffer: Buffer },
  tool = "pdf-to-word",
) => request.post(`/api/jobs?tool=${tool}`, { multipart: { file } });
const pdf = () => ({ name: "text.pdf", mimeType: "application/pdf", buffer: readFileSync(gen("text.pdf")) });

async function waitDone(request: import("@playwright/test").APIRequestContext, id: string, ms = 60_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const s = await (await request.get(`/api/jobs/${id}`)).json();
    if (s.state === "completed" || s.state === "failed") return s;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("job did not finish");
}

test("queue down: API answers 503 fast and the UI says 'temporarily unavailable'", async ({ request, page }) => {
  test.skip(EXTERNAL_REDIS, "can't stop a CI service container from the test");
  const t0 = Date.now();
  const res = await post(request, pdf());
  expect(res.status()).toBe(503);
  expect(Date.now() - t0).toBeLessThan(5000);
  await page.goto("/pdf-to-word");
  await upload(page, gen("text.pdf"));
  await primary(page).click();
  await expect(alert(page)).toContainText(/temporarily unavailable/i);
});

test("worker stopped (queue up): server tools say 'temporarily unavailable' instead of hanging", async ({
  request,
}) => {
  await startRedis();
  const res = await post(request, pdf());
  expect(res.status()).toBe(503);
  expect((await res.json()).error).toMatch(/temporarily unavailable/i);
});

test("PDF to Word: real DOCX with the PDF's text, downloaded in the browser", async ({ page }) => {
  await startWorker();
  await page.goto("/pdf-to-word");
  await upload(page, gen("text.pdf"));
  await primary(page).click();
  await expect(output(page)).toContainText("Done", { timeout: 60_000 });
  const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
  expect(name).toBe("text.docx");
  expect(docxText(bytes)).toContain("editable text in Word");
});

test("Word to PDF: a real PDF with the document's text, downloaded in the browser", async ({ page }) => {
  await startWorker();
  await page.goto("/word-to-pdf");
  await upload(page, fx("doc.docx"));
  await primary(page).click();
  await expect(output(page)).toContainText("Done", { timeout: 60_000 });
  const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
  expect(name).toBe("doc.pdf");
  expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  const text = (await pdfText(page, bytes)).pages.join(" ");
  expect(text).toContain("KlipKit test document");
  expect(text).toContain("12345");
});

test("Word to PDF refuses a file that isn't an Office document", async ({ request }) => {
  const res = await request.post("/api/jobs?tool=word-to-pdf", {
    multipart: {
      file: { name: "notes.docx", mimeType: "application/octet-stream", buffer: Buffer.from("plain text") },
    },
  });
  expect(res.status()).toBe(415);
  expect((await res.json()).error).toMatch(/Word, Excel or PowerPoint/);
});

test("upload validation: unknown tool, wrong content type, size limit", async ({ request }) => {
  expect((await post(request, pdf(), "nope")).status()).toBe(400);
  expect(
    (
      await post(request, { name: "fake.pdf", mimeType: "application/pdf", buffer: readFileSync(gen("fake.pdf")) })
    ).status(),
  ).toBe(415);
  const big = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(51 * 1024 * 1024)]);
  expect((await post(request, { name: "big.pdf", mimeType: "application/pdf", buffer: big })).status()).toBe(413);
});

test("path traversal in the file name cannot write outside the job folder", async ({ request }) => {
  const res = await post(request, { ...pdf(), name: "../../../../tmp/klipkit-evil.pdf" });
  expect(res.status()).toBe(202);
  const { id } = await res.json();
  expect(existsSync("/tmp/klipkit-evil.pdf")).toBe(false);
  expect(readdirSync(join(JOBS_DIR, id))).toContain("input.pdf");
  await waitDone(request, id);
});

test("queued job shows its position and survives a worker restart", async ({ request }) => {
  await stopWorker();
  const res = await post(request, pdf()); // heartbeat still fresh for a moment → accepted and queued
  expect(res.status()).toBe(202);
  const { id } = await res.json();
  const s = await (await request.get(`/api/jobs/${id}`)).json();
  expect(s.state).toBe("waiting");
  expect(s.position).toBe(1);
  // Stay down past the retention time: the restarted worker's first sweep used to delete this queued
  // job's upload (only the job converting was spared), so it failed. This made the test fail only under load.
  await new Promise((r) => setTimeout(r, RETENTION_MS + 1500));
  await startWorker();
  const done = await waitDone(request, id);
  expect(done.state, `job failed: ${done.error ?? "no reason given"}`).toBe("completed");
});

test("files are deleted automatically after the retention time", async ({ request }) => {
  const { id } = await (await post(request, pdf())).json();
  expect((await waitDone(request, id)).state).toBe("completed");
  expect((await request.get(`/api/jobs/${id}/file`)).status()).toBe(200);
  await new Promise((r) => setTimeout(r, RETENTION_MS + 2500));
  expect(existsSync(join(JOBS_DIR, id))).toBe(false);
  expect((await request.get(`/api/jobs/${id}/file`)).status()).toBe(410);
});

test("rate limit: 50 quick uploads from one IP are blocked after the limit", async ({ request }) => {
  const statuses: number[] = [];
  for (let i = 0; i < 50; i++) statuses.push((await post(request, pdf())).status());
  expect(statuses).toContain(429);
  expect(statuses.filter((s) => s === 202).length).toBeLessThanOrEqual(20);
});
