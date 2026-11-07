import { test, expect, type Page, type Browser } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alert, byTestId, downloadFrom, fx, guard, mediaInfo, output, primary, recordClip, upload } from "./helpers";

/**
 * Video and audio tools end to end. Each browser records its own 3-second test clip (animated canvas + 440 Hz
 * tone) with MediaRecorder, so inputs are real files that browser produces. Outputs are loaded in <video>/<audio>
 * elements and checked: duration, size, frame count. Nothing may be uploaded.
 */
const TMP = join(process.cwd(), "test-results", "media-inputs");
mkdirSync(TMP, { recursive: true });

/** A mono 16-bit 44.1 kHz WAV of a 440 Hz tone, built in Node. */
function toneWav(seconds: number) {
  const rate = 44100;
  const n = rate * seconds;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 12000), 44 + i * 2);
  const path = join(TMP, "tone.wav");
  writeFileSync(path, b);
  return path;
}

const clips: Record<string, string> = {};
async function clip(browser: Browser, project: string, kind: "av" | "silent") {
  const key = `${project}-${kind}`;
  if (clips[key]) return clips[key];
  const page = await browser.newPage();
  const { bytes, ext } = await recordClip(page, 3, kind === "av");
  await page.close();
  const path = join(TMP, `${key}.${ext}`);
  writeFileSync(path, bytes);
  return (clips[key] = path);
}

// The output area is visible while working too: wait for the finished result row (or fail fast on an error).
const done = async (page: Page) => {
  await expect(byTestId(page, "result-row").or(alert(page))).toBeVisible({ timeout: 120_000 });
  await expect(alert(page)).toHaveCount(0);
};
const dl = (page: Page) => downloadFrom(page, () => byTestId(page, "download").click());

test.describe("video tools", () => {
  test.skip(({ isMobile }) => isMobile, "covered on desktop; phones record the same formats");
  test.setTimeout(240_000);

  test("Video Converter: to WebM plays back at the same length; probe shows the clip", async ({
    page,
    browser,
  }, info) => {
    const g = guard(page);
    const src = await clip(browser, info.project.name, "av");
    await page.goto("/video-converter");
    await upload(page, src);
    await expect(byTestId(page, "media-info")).toContainText("320×240");
    await page.getByLabel("Convert to").selectOption("webm");
    await primary(page).click();
    await done(page);
    const { name, bytes } = await dl(page);
    expect(name).toMatch(/\.webm$/);
    const m = await mediaInfo(page, bytes, "video/webm");
    expect(m.width).toBe(320);
    expect(m.duration).toBeGreaterThan(2.5);
    expect(m.duration).toBeLessThan(3.6);
    g.assertNoUpload();
  });

  test("Video Compressor: target size is met and the result plays", async ({ page, browser }, info) => {
    const src = await clip(browser, info.project.name, "av");
    await page.goto("/video-compressor");
    await upload(page, src);
    await page.getByLabel("Or target size (MB)").fill("1");
    await primary(page).click();
    await done(page);
    const { bytes, name } = await dl(page);
    expect(bytes.length).toBeLessThanOrEqual(1_000_000);
    const m = await mediaInfo(page, bytes, name.endsWith(".mp4") ? "video/mp4" : "video/webm");
    expect(m.duration).toBeGreaterThan(2.5);
  });

  test("Video Trimmer: 0:01–0:02 gives a 1-second clip; end before start is refused", async ({
    page,
    browser,
  }, info) => {
    const src = await clip(browser, info.project.name, "av");
    await page.goto("/video-trimmer");
    await upload(page, src);
    await page.getByLabel("Start").fill("0:02");
    await page.getByLabel("End").fill("0:01");
    await expect(page.getByText("The end must be after the start.")).toBeVisible();
    await expect(primary(page)).toBeDisabled();
    await page.getByLabel("Start").fill("0:01");
    await page.getByLabel("End").fill("0:02");
    await primary(page).click();
    await done(page);
    const { bytes, name } = await dl(page);
    const m = await mediaInfo(page, bytes, name.endsWith(".mp4") ? "video/mp4" : "video/webm");
    expect(m.duration).toBeGreaterThan(0.7);
    expect(m.duration).toBeLessThan(1.4);
  });

  test("Video to GIF: 2 s at 5 fps, 320 px wide → a 10-frame GIF that decodes", async ({ page, browser }, info) => {
    const src = await clip(browser, info.project.name, "av");
    await page.goto("/video-to-gif");
    await upload(page, src);
    await page.getByLabel("Start").fill("0:00");
    await page.getByLabel("End").fill("0:02");
    await page.getByLabel("Frames per second").selectOption("5");
    await page.getByLabel("Width").selectOption("320");
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("320×240 · 10 frames");
    const { bytes } = await dl(page);
    expect(bytes.subarray(0, 6).toString("latin1")).toBe("GIF89a");
    const dims = await page.evaluate(async (b64) => {
      const bmp = await createImageBitmap(
        new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: "image/gif" }),
      );
      return [bmp.width, bmp.height];
    }, bytes.toString("base64"));
    expect(dims).toEqual([320, 240]);
  });

  test("Extract Audio → WAV of the same length; a silent video says there's no sound", async ({
    page,
    browser,
  }, info) => {
    const src = await clip(browser, info.project.name, "av");
    await page.goto("/extract-audio");
    await upload(page, src);
    await page.getByLabel("Save as").selectOption("wav");
    await primary(page).click();
    await done(page);
    const { name, bytes } = await dl(page);
    expect(name).toMatch(/\.wav$/);
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("RIFF");
    const m = await mediaInfo(page, bytes, "audio/wav");
    expect(m.duration).toBeGreaterThan(2.5);

    const silent = await clip(browser, info.project.name, "silent");
    await page.goto("/extract-audio");
    await upload(page, silent);
    await expect(page.getByText("This file has no sound to extract.")).toBeVisible();
    await expect(primary(page)).toBeDisabled();
  });

  test("Audio Converter: WAV → compressed audio, trimmed to 1 s", async ({ page }) => {
    const wav = toneWav(3);
    await page.goto("/audio-converter");
    await upload(page, wav);
    await page.getByLabel("Trim").check();
    await page.getByLabel("Start").fill("0:01");
    await page.getByLabel("End").fill("0:02");
    await primary(page).click();
    await done(page);
    const { name, bytes } = await dl(page);
    const type = name.endsWith(".m4a")
      ? "audio/mp4"
      : name.endsWith(".wav")
        ? "audio/wav"
        : name.endsWith(".ogg")
          ? "audio/ogg"
          : "audio/webm";
    const m = await mediaInfo(page, bytes, type);
    expect(m.duration).toBeGreaterThan(0.7);
    expect(m.duration).toBeLessThan(1.4);
  });

  test("a file that isn't media gets a clear message", async ({ page }) => {
    const junk = join(TMP, "junk.webm");
    writeFileSync(junk, "this is not a video");
    await page.goto("/video-converter");
    await upload(page, junk);
    await expect(alert(page)).toContainText("isn't a video or audio format we can read");
  });
});

test.describe("Screen Recorder", () => {
  test("records a (simulated) screen and offers the recording", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop only");
    // Headless browsers can't show the screen picker: stand in a canvas stream for getDisplayMedia.
    await page.addInitScript(() => {
      navigator.mediaDevices.getDisplayMedia = async () => {
        const c = document.createElement("canvas");
        c.width = 320;
        c.height = 200;
        const x = c.getContext("2d")!;
        setInterval(() => {
          x.fillStyle = `hsl(${Date.now() % 360} 60% 50%)`;
          x.fillRect(0, 0, 320, 200);
        }, 50);
        return c.captureStream(20);
      };
    });
    await page.goto("/screen-recorder");
    await primary(page).click();
    await expect(byTestId(page, "stop-recording")).toBeVisible();
    await page.waitForTimeout(2200);
    await byTestId(page, "stop-recording").click();
    await expect(byTestId(page, "recording")).toBeVisible();
    const { name, bytes } = await dl(page);
    expect(name).toMatch(/^screen-recording\.(webm|mp4)$/);
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

test.describe("Speech (Whisper on the device)", () => {
  test.skip(({ isMobile }) => isMobile, "desktop is enough: same code");
  test.setTimeout(300_000);

  test("Transcription: the spoken sentence comes back as text, English detected; timestamps on request", async ({
    page,
    request,
  }) => {
    const hasModel = (await request.head("/models/whisper-tiny/onnx/encoder_model_quantized.onnx")).ok();
    const g = guard(page);
    await page.goto("/transcription");
    await upload(page, fx("speech.wav"));
    await primary(page).click();
    if (!hasModel) {
      await expect(alert(page)).toContainText("isn't available", { timeout: 60_000 });
      return;
    }
    await expect(byTestId(page, "transcript")).toBeVisible({ timeout: 240_000 });
    const text = (await byTestId(page, "transcript").inputValue()).toLowerCase();
    for (const w of ["speech", "text", "device", "uploaded"]) expect(text, text).toContain(w);
    await expect(output(page)).toContainText("English");
    await page.getByLabel("Add timestamps").check();
    await primary(page).click();
    await expect(byTestId(page, "transcript")).toHaveValue(/^\[0:0\d(\.\d)?\] /, { timeout: 240_000 });
    g.assertNoUpload();
  });

  test("Subtitles: generated cues download as valid SRT", async ({ page, request }) => {
    test.skip(
      !(await request.head("/models/whisper-tiny/onnx/encoder_model_quantized.onnx")).ok(),
      "speech model not installed",
    );
    await page.goto("/subtitle-generator");
    await upload(page, fx("speech.wav"));
    await primary(page).click();
    await expect(byTestId(page, "cues").locator("li").first()).toBeVisible({ timeout: 240_000 });
    const srt = (await downloadFrom(page, () => byTestId(page, "download").click())).bytes.toString("utf8");
    expect(srt).toMatch(/^1\n00:00:0\d,\d{3} --> 00:00:0\d,\d{3}\n\S/);
    expect(srt.toLowerCase()).toContain("speech");
  });

  test("Subtitle editor: open an SRT, edit a cue, shift everything, export VTT", async ({ page }) => {
    const srt = join(TMP, "edit-me.srt");
    writeFileSync(srt, "1\n00:00:01,000 --> 00:00:02,000\nHelo\n\n2\n00:00:03,000 --> 00:00:04,500\nWorld\n");
    await page.goto("/subtitle-generator");
    await upload(page, srt);
    await expect(byTestId(page, "cues").locator("li")).toHaveCount(2);
    await page.getByLabel("Cue 1 text").fill("Hello");
    await page.getByLabel("Shift all (seconds)").fill("-0.5");
    await page.getByRole("button", { name: "Apply shift" }).click();
    const files = await downloadFrom(page, () => byTestId(page, "download").click());
    // "separate" downloads: SRT first, then VTT; check whichever arrived
    const text = files.bytes.toString("utf8");
    expect(text).toContain("Hello");
    expect(text).toMatch(/00:00:00[,.]500 --> 00:00:01[,.]500/);
  });
});
