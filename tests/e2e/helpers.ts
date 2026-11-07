import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Download, type Page, type Request } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PDFDocument } from "pdf-lib";
import { unzipSync, strFromU8 } from "fflate";

export const FX = join(process.cwd(), "tests/fixtures");
export const fx = (name: string) =>
  name.startsWith("generated/") || name.includes("/") ? join(FX, name) : join(FX, name);
export const gen = (name: string) => join(FX, "generated", name);

/**
 * Page guard: records console errors, page errors, failed same-origin requests, any request to
 * another origin, and any request that carries a body. Call `assertClean()` at the end of a test.
 * For on-device tools, `assertNoUpload()` proves the file never left the browser.
 */
export function guard(page: Page) {
  const consoleErrors: string[] = [];
  const failed: string[] = [];
  const external: string[] = [];
  const bodies: { url: string; size: number }[] = [];
  const origin = () => new URL(page.url() || "http://127.0.0.1").origin;

  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 300)}`));
  page.on("request", (r: Request) => {
    const u = new URL(r.url());
    if (!["http:", "https:"].includes(u.protocol)) return; // blob:, data:
    if (u.origin !== origin() && !u.hostname.match(/^(127\.0\.0\.1|localhost)$/)) external.push(r.url());
    const body = r.postDataBuffer();
    if (body && body.length > 0) bodies.push({ url: r.url(), size: body.length });
  });
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });

  return {
    consoleErrors,
    failed,
    external,
    bodies,
    /** No console errors, no failed requests, no third-party requests. `allow` = regexes for expected errors. */
    assertClean(allow: RegExp[] = []) {
      const ok = (s: string) => !allow.some((re) => re.test(s));
      expect(external, "requests to third-party origins").toEqual([]);
      expect(failed.filter(ok), "failed HTTP requests").toEqual([]);
      expect(consoleErrors.filter(ok), "console errors").toEqual([]);
    },
    /** On-device tools: no request may carry a body (i.e. no upload of any kind). */
    assertNoUpload() {
      expect(bodies, "requests with a body during on-device processing").toEqual([]);
    },
  };
}

// `:visible` everywhere: with Cache Components, Next keeps the previous page mounted (hidden) after
// client navigation, so a plain selector can match the old tool too.
export const workspace = (page: Page) => page.locator('section[aria-label="Tool"]:visible');
export const output = (page: Page) => page.locator('[data-testid="tool-output"]:visible');
export const primary = (page: Page) => page.locator('[data-testid="primary-action"]:visible');
/** The tool's error message (not Next's hidden route announcer, which is also role=alert). */
export const alert = (page: Page) => workspace(page).getByRole("alert");
export const byTestId = (page: Page, id: string) => page.locator(`[data-testid="${id}"]:visible`);

/** Waits until the tool is interactive (controls are disabled until hydration). */
export async function ready(page: Page) {
  await page.locator('section[aria-label="Tool"][data-ready]:visible').waitFor();
}

export async function upload(page: Page, files: string | string[]) {
  await ready(page);
  await page.locator('[data-testid="file-input"]').last().setInputFiles(files);
}

/** Real drag-and-drop: builds a DataTransfer with the file inside the page and dispatches drop. */
export async function dropFile(page: Page, path: string, type: string) {
  await ready(page);
  const b64 = readFileSync(path).toString("base64");
  const name = path.split("/").pop()!;
  await page.locator('[data-testid="dropzone"]:visible').evaluate(
    (el, { b64, name, type }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], name, { type }));
      el.dispatchEvent(new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true }));
      el.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    },
    { b64, name, type },
  );
}

/** Paste a file from the "clipboard" (a synthetic ClipboardEvent, as the browser fires on Ctrl+V). */
export async function pasteFile(page: Page, path: string, type: string) {
  await ready(page);
  const b64 = readFileSync(path).toString("base64");
  const name = path.split("/").pop()!;
  await page.evaluate(
    ({ b64, name, type }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], name, { type }));
      window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
    },
    { b64, name, type },
  );
}

export async function downloadFrom(page: Page, trigger: () => Promise<void>): Promise<{ name: string; bytes: Buffer }> {
  const [dl] = await Promise.all([page.waitForEvent("download"), trigger()]);
  return { name: dl.suggestedFilename(), bytes: await readDownload(dl) };
}

async function readDownload(dl: Download) {
  const path = await dl.path();
  return readFileSync(path!);
}

/** Decodes an image inside the browser and reports its real format, size and transparency. */
export async function inspectImage(page: Page, bytes: Buffer) {
  return page.evaluate(async (b64) => {
    const u8 = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const sig = Array.from(u8.slice(0, 12));
    const ascii = String.fromCharCode(...sig);
    const type =
      sig[0] === 0xff && sig[1] === 0xd8
        ? "image/jpeg"
        : sig[0] === 0x89 && ascii.slice(1, 4) === "PNG"
          ? "image/png"
          : ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP"
            ? "image/webp"
            : "unknown";
    const bmp = await createImageBitmap(new Blob([u8]));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const x = c.getContext("2d")!;
    x.drawImage(bmp, 0, 0);
    const d = x.getImageData(0, 0, bmp.width, bmp.height).data;
    let transparent = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) transparent++;
    return { type, width: bmp.width, height: bmp.height, transparentRatio: transparent / (d.length / 4) };
  }, bytes.toString("base64"));
}

export async function pdfPages(bytes: Buffer) {
  return (await PDFDocument.load(bytes)).getPageCount();
}

export function docxText(bytes: Buffer) {
  const files = unzipSync(new Uint8Array(bytes));
  return strFromU8(files["word/document.xml"]).replace(/<[^>]+>/g, " ");
}

/** axe: zero serious/critical issues. */
export async function assertAccessible(page: Page, label = "") {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map(
      (v) =>
        `${label} ${v.id}: ${v.nodes
          .map((n) => n.target.join(" "))
          .slice(0, 3)
          .join(" | ")}`,
    ),
    "axe serious/critical",
  ).toEqual([]);
}

/** Mobile basics: no horizontal scroll; interactive controls in header + workspace are ≥ 44 px tall/wide. */
export async function assertMobileFriendly(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal scroll in px").toBeLessThanOrEqual(0);
  const small = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        'header button, header a, section[aria-label="Tool"] button, section[aria-label="Tool"] select, section[aria-label="Tool"] input:not([type=file]):not([type=checkbox]):not([type=range]):not([type=color])',
      ),
    ]
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => ({ el: (el as HTMLElement).outerHTML.slice(0, 80), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(({ el, r }) => `${Math.round(r.width)}×${Math.round(r.height)} ${el}`),
  );
  expect(small, "touch targets under 44 px").toEqual([]);
}

/** Sets the theme before any page script runs. */
export async function useTheme(page: Page, theme: "dark" | "light") {
  await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
}

/**
 * Text of each page of a PDF, read in the browser with the app's own self-hosted pdf.js (also proves the
 * file opens in a real PDF reader). `password` for encrypted files; throws the reader's error otherwise.
 */
export async function pdfText(
  page: Page,
  bytes: Buffer,
  password?: string,
): Promise<{ pages: string[]; sizes: [number, number][] }> {
  return page.evaluate(
    async ([b64, pw]) => {
      const lib = await import(/* webpackIgnore: true */ "/vendor/pdfjs/pdf.min.mjs" as string);
      lib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
      const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const doc = await lib.getDocument({
        data,
        password: pw || undefined,
        standardFontDataUrl: "/vendor/pdfjs/standard_fonts/",
      }).promise;
      const pages: string[] = [];
      const sizes: [number, number][] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i);
        const vp = p.getViewport({ scale: 1 });
        sizes.push([Math.round(vp.width), Math.round(vp.height)]);
        const tc = await p.getTextContent();
        pages.push(tc.items.map((it: { str?: string }) => it.str ?? "").join(" "));
      }
      return { pages, sizes };
    },
    [bytes.toString("base64"), password ?? ""] as const,
  );
}

/** Records a test clip in the browser (animated canvas, optional 440 Hz tone) with MediaRecorder. */
export async function recordClip(
  page: Page,
  seconds: number,
  withAudio: boolean,
): Promise<{ bytes: Buffer; ext: string }> {
  await page.goto("/robots.txt");
  const r = await page.evaluate(
    async ([seconds, withAudio]) => {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 240;
      const x = c.getContext("2d")!;
      const stream = c.captureStream(30);
      let ac: AudioContext | null = null;
      if (withAudio) {
        ac = new AudioContext();
        const osc = ac.createOscillator();
        osc.frequency.value = 440;
        const dest = ac.createMediaStreamDestination();
        osc.connect(dest);
        osc.start();
        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      }
      const type = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      )!;
      const rec = new MediaRecorder(stream, { mimeType: type });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      const stopped = new Promise((res) => (rec.onstop = res));
      rec.start(200);
      const t0 = performance.now();
      await new Promise<void>((done) => {
        const draw = () => {
          const t = (performance.now() - t0) / 1000;
          x.fillStyle = `hsl(${(t * 120) % 360} 70% 50%)`;
          x.fillRect(0, 0, 320, 240);
          x.fillStyle = "#fff";
          x.fillRect(20 + ((t * 100) % 260), 100, 40, 40);
          if (t < seconds) requestAnimationFrame(draw);
          else done();
        };
        draw();
      });
      rec.stop();
      await stopped;
      await ac?.close();
      const blob = new Blob(chunks, { type: rec.mimeType });
      const b = new Uint8Array(await blob.arrayBuffer());
      let s = "";
      for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
      return { b64: btoa(s), ext: rec.mimeType.includes("mp4") ? "mp4" : "webm" };
    },
    [seconds, withAudio] as const,
  );
  return { bytes: Buffer.from(r.b64, "base64"), ext: r.ext };
}

/** Loads media bytes in an element: duration, size, and whether it has sound (video element only reports size). */
export async function mediaInfo(page: Page, bytes: Buffer, type: string) {
  return page.evaluate(
    async ([b64, type]) => {
      const u8 = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const el = document.createElement(type.startsWith("audio") ? "audio" : "video");
      el.muted = true;
      el.src = URL.createObjectURL(new Blob([u8], { type }));
      await new Promise((res, rej) => {
        el.onloadedmetadata = res;
        el.onerror = () => rej(new Error("can't play: " + (el.error?.message ?? el.error?.code)));
      });
      // WebM from MediaRecorder can report Infinity until seeked to the end
      if (!isFinite(el.duration)) {
        el.currentTime = 1e9;
        await new Promise((res) => (el.ondurationchange = res));
      }
      const v = el as HTMLVideoElement;
      return { duration: el.duration, width: v.videoWidth ?? 0, height: v.videoHeight ?? 0 };
    },
    [bytes.toString("base64"), type] as const,
  );
}
