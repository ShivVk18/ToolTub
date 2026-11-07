import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { alert, byTestId, downloadFrom, fx, gen, guard, inspectImage, output, primary, upload } from "./helpers";

/**
 * Image and creator tools end to end. Outputs are decoded in the browser and checked: exact sizes, formats,
 * metadata gone, colours picked. Inputs that need special content (GPS EXIF, text for OCR, known colours) are
 * built here. Everything must stay on the device: no request carries a body.
 */
const TMP = join(process.cwd(), "test-results", "image-inputs");
mkdirSync(TMP, { recursive: true });

/** A PNG drawn in the browser: solid areas and optional text. */
async function drawPng(
  page: Page,
  name: string,
  w: number,
  h: number,
  spec: { fills?: [string, number][]; text?: string },
) {
  await page.goto("/robots.txt");
  const b64 = await page.evaluate(
    async ([w, h, spec]) => {
      const c = new OffscreenCanvas(w, h);
      const x = c.getContext("2d")!;
      x.fillStyle = "#fff";
      x.fillRect(0, 0, w, h);
      let at = 0;
      for (const [color, share] of spec.fills ?? []) {
        x.fillStyle = color;
        x.fillRect(0, at, w, h * share);
        at += h * share;
      }
      if (spec.text) {
        x.fillStyle = "#111";
        x.font = "bold 64px Arial, Helvetica, sans-serif";
        x.textBaseline = "middle";
        x.fillText(spec.text, 40, h / 2);
      }
      const b = new Uint8Array(await (await c.convertToBlob({ type: "image/png" })).arrayBuffer());
      let s = "";
      for (const v of b) s += String.fromCharCode(v);
      return btoa(s);
    },
    [w, h, spec] as const,
  );
  const path = join(TMP, name);
  writeFileSync(path, Buffer.from(b64, "base64"));
  return path;
}

/** photo.jpg with an EXIF block holding Make "KlipCam" and a GPS position (12°58′N 77°35′E). */
function gpsJpeg() {
  const be32 = (v: number) => [v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255];
  const t: number[] = [0x4d, 0x4d, 0, 42, ...be32(8), 0, 2];
  const makeAt = 8 + 2 + 24 + 4;
  const gpsAt = makeAt + 8;
  t.push(0x01, 0x0f, 0, 2, ...be32(8), ...be32(makeAt), 0x88, 0x25, 0, 4, ...be32(1), ...be32(gpsAt), ...be32(0));
  t.push(..."KlipCam\0".split("").map((c) => c.charCodeAt(0)));
  const ratAt = gpsAt + 2 + 48 + 4;
  t.push(0, 4, 0, 1, 0, 2, ...be32(2), 78, 0, 0, 0, 0, 2, 0, 5, ...be32(3), ...be32(ratAt));
  t.push(0, 3, 0, 2, ...be32(2), 69, 0, 0, 0, 0, 4, 0, 5, ...be32(3), ...be32(ratAt + 24), ...be32(0));
  for (const [a, b] of [
    [12, 58],
    [77, 35],
  ])
    t.push(...be32(a), ...be32(1), ...be32(b), ...be32(1), ...be32(0), ...be32(1));
  const body = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), Buffer.from(t)]);
  const src = readFileSync(fx("photo.jpg"));
  const out = Buffer.concat([
    src.subarray(0, 2),
    Buffer.from([0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 255]),
    body,
    src.subarray(2),
  ]);
  const path = join(TMP, "gps-photo.jpg");
  writeFileSync(path, out);
  return path;
}

const done = (page: Page) => expect(output(page)).toBeVisible({ timeout: 60_000 });
const dl = (page: Page) => downloadFrom(page, () => byTestId(page, "download").click());

test.describe("Crop Image", () => {
  test("square preset → 800×800 JPG; numbers clamp to the image; rotate swaps the sides", async ({ page }) => {
    const g = guard(page);
    await page.goto("/crop-image");
    await upload(page, fx("photo.jpg"));
    await expect(byTestId(page, "crop-stage")).toBeVisible();
    await page.getByLabel("Aspect").selectOption({ label: "1:1 square" });
    await expect(page.getByLabel("W", { exact: true })).toHaveValue("800");
    await primary(page).click();
    await done(page);
    const first = await dl(page);
    expect(first.name).toBe("photo-cropped.jpg");
    let bytes = first.bytes;
    expect(await inspectImage(page, bytes)).toMatchObject({ type: "image/jpeg", width: 800, height: 800 });

    await page.getByLabel("Aspect").selectOption({ label: "Free" });
    await page.getByLabel("W", { exact: true }).fill("5000");
    await expect(page.getByLabel("W", { exact: true })).toHaveValue("1200");
    await page.getByRole("button", { name: "Rotate 90° clockwise" }).click();
    await expect(page.getByLabel("W", { exact: true })).toHaveValue("800");
    await primary(page).click();
    await done(page);
    ({ bytes } = await dl(page));
    expect(await inspectImage(page, bytes)).toMatchObject({ width: 800, height: 1200 });
    g.assertNoUpload();
  });

  test("dragging the box moves the crop; PNG transparency is kept", async ({ page }) => {
    await page.goto("/crop-image");
    await upload(page, gen("transparent.png"));
    await page.getByLabel("W", { exact: true }).fill("50");
    await page.getByLabel("H", { exact: true }).fill("50");
    const box = byTestId(page, "crop-box");
    const b = (await box.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 40, b.y + b.height / 2 + 30, { steps: 4 });
    await page.mouse.up();
    expect(Number(await page.getByLabel("X", { exact: true }).inputValue())).toBeGreaterThan(0);
    await primary(page).click();
    await done(page);
    const { name, bytes } = await dl(page);
    expect(name).toBe("transparent-cropped.png");
    expect(await inspectImage(page, bytes)).toMatchObject({ type: "image/png", width: 50, height: 50 });
  });
});

test.describe("EXIF Remover", () => {
  test("removes GPS and camera EXIF without touching the picture; reports what it found", async ({ page }) => {
    const g = guard(page);
    await page.goto("/exif-remover");
    await upload(page, [gpsJpeg(), gen("transparent.png")]);
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("removed GPS location from 1");
    await expect(byTestId(page, "exif-report")).toContainText("location 12.9667, 77.5833");
    await expect(byTestId(page, "exif-report")).toContainText("camera KlipCam");
    const files = unzipSync(new Uint8Array((await dl(page)).bytes));
    const jpg = Buffer.from(files["gps-photo.jpg"]);
    expect(jpg.toString("latin1")).not.toContain("Exif");
    expect(jpg.toString("latin1")).not.toContain("KlipCam");
    // the image data after the metadata is byte-for-byte the original photo
    const orig = readFileSync(fx("photo.jpg"));
    expect(jpg.subarray(jpg.length - 1000).equals(orig.subarray(orig.length - 1000))).toBe(true);
    expect(await inspectImage(page, jpg)).toMatchObject({ width: 1200, height: 800 });
    g.assertNoUpload();
  });

  test("AVIF is re-encoded (no lossless path) and says so", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "WebKit on this runner can't decode AVIF");
    await page.goto("/exif-remover");
    await upload(page, fx("photo.avif"));
    await primary(page).click();
    await done(page);
    await expect(byTestId(page, "exif-report")).toContainText("re-encoded");
  });
});

test.describe("Bulk Rename", () => {
  test("pattern with numbers; extensions kept; preview matches the ZIP; photos can be shrunk", async ({ page }) => {
    await page.goto("/bulk-rename");
    await upload(page, [fx("photo.jpg"), gen("one-page.pdf"), gen("valid.json")]);
    await page.getByLabel("Pattern").fill("trip-{n}");
    await page.getByLabel("Digits").selectOption("3");
    await expect(byTestId(page, "rename-preview")).toContainText("photo.jpg → trip-001.jpg");
    await expect(byTestId(page, "rename-preview")).toContainText("valid.json → trip-003.json");
    await page.getByLabel("Resize photos").selectOption("800");
    await primary(page).click();
    await done(page);
    const files = unzipSync(new Uint8Array((await dl(page)).bytes));
    expect(Object.keys(files).sort()).toEqual(["trip-001.jpg", "trip-002.pdf", "trip-003.json"]);
    expect(await inspectImage(page, Buffer.from(files["trip-001.jpg"]))).toMatchObject({ width: 800, height: 533 });
    expect(Buffer.from(files["trip-002.pdf"]).equals(readFileSync(gen("one-page.pdf")))).toBe(true);
  });

  test("duplicate results get (2), illegal characters are replaced", async ({ page }) => {
    await page.goto("/bulk-rename");
    await upload(page, [fx("photo.jpg"), gen("photo.webp")]);
    await page.getByLabel("Pattern").fill("a/b");
    await expect(byTestId(page, "rename-preview")).toContainText("a-b.jpg");
    await page.getByLabel("Pattern").fill("same");
    await expect(byTestId(page, "rename-preview")).toContainText("same.webp");
    await upload(page, fx("photo.jpg"));
    await expect(byTestId(page, "rename-preview")).toContainText("same (2).jpg");
  });
});

test.describe("Social Image Resizer", () => {
  test("three platform sizes at their exact pixels; nothing selected disables the button", async ({ page }) => {
    const g = guard(page);
    await page.goto("/social-image-resizer");
    await upload(page, fx("photo.jpg"));
    await page.getByLabel("Fit").selectOption("blur");
    await primary(page).click();
    await done(page);
    const files = unzipSync(new Uint8Array((await dl(page)).bytes));
    const sizes = await Promise.all(
      Object.entries(files)
        .sort()
        .map(async ([n, b]) => [n, await inspectImage(page, Buffer.from(b))] as const),
    );
    expect(sizes.map(([n, i]) => `${n} ${i.width}x${i.height}`)).toEqual([
      "photo-ig-portrait-1080x1350.jpg 1080x1350",
      "photo-ig-square-1080x1080.jpg 1080x1080",
      "photo-ig-story-1080x1920.jpg 1080x1920",
    ]);
    for (const l of ["Instagram post (square)", "Instagram post (portrait)", "Instagram / TikTok story"])
      await page.getByLabel(l).uncheck();
    await expect(primary(page)).toBeDisabled();
    g.assertNoUpload();
  });
});

test.describe("Thumbnail Preview", () => {
  test("flags a square image, previews it, and exports a 1280×720 JPG under 2 MB", async ({ page }) => {
    const sq = await drawPng(page, "square.png", 1000, 1000, { fills: [["#6d5df5", 1]] });
    await page.goto("/thumbnail-preview");
    await upload(page, sq);
    await expect(byTestId(page, "thumb-checks")).toContainText("Aspect ratio is 1.00:1");
    await expect(byTestId(page, "thumb-checks")).toContainText("1000×1000 is small");
    await expect(byTestId(page, "thumb-previews").locator("img")).toHaveCount(3);
    await page.getByLabel("Title").fill("My new video");
    await expect(byTestId(page, "thumb-previews")).toContainText("My new video");
    await primary(page).click();
    await done(page);
    const { bytes } = await dl(page);
    expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
    expect(await inspectImage(page, bytes)).toMatchObject({ type: "image/jpeg", width: 1280, height: 720 });
  });
});

test.describe("Meme Generator", () => {
  test("renders a preview and exports at the photo's size; no text disables export", async ({ page }) => {
    await page.goto("/meme-generator");
    await upload(page, fx("photo.jpg"));
    await expect(byTestId(page, "meme-preview").locator("canvas")).toBeVisible();
    await primary(page).click();
    await done(page);
    const { name, bytes } = await dl(page);
    expect(name).toBe("photo-meme.jpg");
    expect(await inspectImage(page, bytes)).toMatchObject({ width: 1200, height: 800 });
    await page.getByLabel("Top text").fill("");
    await page.getByLabel("Bottom text").fill("");
    await expect(primary(page)).toBeDisabled();
  });
});

test.describe("Image Watermark", () => {
  test("text on several photos keeps their sizes and changes the corner pixels", async ({ page }) => {
    const g = guard(page);
    const white = await drawPng(page, "white.png", 600, 400, {});
    await page.goto("/image-watermark");
    await upload(page, [white, fx("photo.jpg")]);
    await page.getByLabel("Colour").fill("#e5484d");
    await page.getByLabel("Opacity").selectOption("1");
    await primary(page).click();
    await done(page);
    const files = unzipSync(new Uint8Array((await dl(page)).bytes));
    expect(Object.keys(files).sort()).toEqual(["photo-watermarked.jpg", "white-watermarked.png"]);
    const marked = await page.evaluate(async (b64) => {
      const bmp = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))]));
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const x = c.getContext("2d")!;
      x.drawImage(bmp, 0, 0);
      const corner = x.getImageData(bmp.width - 200, bmp.height - 60, 190, 50).data;
      let red = 0;
      for (let i = 0; i < corner.length; i += 4) if (corner[i] > 200 && corner[i + 1] < 120) red++;
      const topLeft = x.getImageData(0, 0, 100, 100).data;
      return { red, w: bmp.width, h: bmp.height, topLeftWhite: topLeft.every((v) => v === 255) };
    }, Buffer.from(files["white-watermarked.png"]).toString("base64"));
    expect(marked).toMatchObject({ w: 600, h: 400, topLeftWhite: true });
    expect(marked.red).toBeGreaterThan(50);
    g.assertNoUpload();
  });

  test("logo mode needs a logo", async ({ page }) => {
    await page.goto("/image-watermark");
    await upload(page, fx("photo.jpg"));
    await page.getByLabel("Watermark").selectOption("logo");
    await expect(primary(page)).toBeDisabled();
    await page.getByLabel("Logo").setInputFiles(gen("transparent.png"));
    await primary(page).click();
    await done(page);
  });
});

test.describe("Colour tools", () => {
  test("palette finds the two colours with their shares", async ({ page }) => {
    const img = await drawPng(page, "two.png", 300, 200, {
      fills: [
        ["#e6484d", 0.7],
        ["#6d5df5", 0.3],
      ],
    });
    await page.goto("/color-palette-from-image");
    await upload(page, img);
    await page.getByLabel("Colours").selectOption("3");
    await primary(page).click();
    await done(page);
    const p = byTestId(page, "palette");
    await expect(p.locator("li").first()).toContainText("#E6484D · 70%");
    // the band edge is anti-aliased, so ~1% of pixels form a blended third colour: violet is 29–30%
    await expect(p).toContainText(/#6D5DF5 · (29|30)%/);
  });

  test("picker reads the exact pixel colour and its contrast", async ({ page }) => {
    const img = await drawPng(page, "solid.png", 200, 200, { fills: [["#6d5df5", 1]] });
    await page.goto("/image-color-picker");
    await upload(page, img);
    await byTestId(page, "picker-image").click({ position: { x: 50, y: 50 } });
    await expect(byTestId(page, "picked")).toContainText("#6D5DF5");
    await expect(byTestId(page, "picked")).toContainText("rgb(109, 93, 245)");
    await expect(byTestId(page, "picked")).toContainText(/Contrast: [\d.]+:1 on white/);
  });
});

test.describe("Collage Maker", () => {
  test("3 photos on a wide canvas → 1920×1080 JPG; one photo isn't enough", async ({ page }) => {
    await page.goto("/collage-maker");
    await upload(page, fx("photo.jpg"));
    await expect(primary(page)).toBeDisabled();
    await upload(page, [gen("transparent.png"), gen("photo.webp")]);
    await page.getByLabel("Size").selectOption({ label: "Wide 1920×1080" });
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("3 photos · 1920×1080");
    expect(await inspectImage(page, (await dl(page)).bytes)).toMatchObject({
      type: "image/jpeg",
      width: 1920,
      height: 1080,
    });
  });
});

test.describe("Image to Text (OCR)", () => {
  test("reads printed text from an image, on the device", async ({ page }) => {
    test.setTimeout(180_000);
    const g = guard(page);
    const img = await drawPng(page, "text.png", 1200, 200, { text: "KlipKit reads 12345" });
    await page.goto("/image-to-text");
    await upload(page, img);
    await primary(page).click();
    await expect(byTestId(page, "ocr-text")).toBeVisible({ timeout: 150_000 });
    const text = await byTestId(page, "ocr-text").inputValue();
    expect(text).toContain("KlipKit");
    expect(text).toContain("12345");
    await expect(output(page)).toContainText("% confidence");
    g.assertNoUpload();
  });

  test("a blank image says no text was found", async ({ page }) => {
    test.setTimeout(180_000);
    const img = await drawPng(page, "blank.png", 400, 200, {});
    await page.goto("/image-to-text");
    await upload(page, img);
    await primary(page).click();
    await expect(alert(page)).toContainText("No text found", { timeout: 150_000 });
  });
});

test.describe("Passport Photo", () => {
  test("without the background model: a clear message, no crash", async ({ page, request }) => {
    const hasModel = (await request.head("/models/isnet-general-use-int8.onnx")).ok();
    test.skip(hasModel, "model present: the photo flow runs instead");
    await page.goto("/passport-photo-maker");
    await upload(page, fx("photo.jpg"));
    await expect(alert(page)).toBeVisible({ timeout: 60_000 });
    await expect(alert(page)).toContainText(/model|download/i);
  });
});
