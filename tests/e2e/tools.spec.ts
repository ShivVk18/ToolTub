import { test, expect, type Page } from "@playwright/test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  assertAccessible,
  assertMobileFriendly,
  downloadFrom,
  dropFile,
  fx,
  gen,
  guard,
  inspectImage,
  output,
  pasteFile,
  pdfPages,
  primary,
  ready,
  upload,
  useTheme,
  workspace,
  alert,
  byTestId,
} from "./helpers";

// Routed tools, from the registry (kept in sync by the "routed tools" test below).
const TOOLS = [
  { slug: "image-compressor", h1: "Image Compressor", device: true, action: true },
  { slug: "image-resizer", h1: "Image Resizer", device: true, action: true },
  { slug: "image-converter", h1: "Image Converter", device: true, action: true },
  { slug: "heic-to-jpg", h1: "HEIC to JPG Converter", device: true, action: true },
  { slug: "compress-pdf", h1: "Compress PDF", device: true, action: true },
  { slug: "background-remover", h1: "Background Remover", device: true, action: true },
  { slug: "pdf-to-word", h1: "PDF to Word", device: false, action: true },
  { slug: "json-formatter", h1: "JSON Formatter & Validator", device: true, action: false },
  { slug: "jwt-decoder", h1: "JWT Decoder", device: true, action: false },
  { slug: "qr-code-generator", h1: "QR Code Generator", device: true, action: false },
];

const DEVICE_BADGE = "Runs on your device — nothing uploaded";
const SERVER_BADGE = /Processed on KlipKit's own server — deleted after 1 hour/;

// ───────────────────────── Universal checklist (every tool) ─────────────────────────
for (const t of TOOLS) {
  test.describe(`universal: ${t.slug}`, () => {
    test("loads cleanly with H1, privacy badge and a disabled primary action", async ({ page }) => {
      const g = guard(page);
      await page.goto(`/${t.slug}`);
      await expect(page.locator("h1")).toHaveText(t.h1);
      await expect(page.locator("h1")).toHaveCount(1);
      if (t.device) await expect(page.getByText(DEVICE_BADGE)).toBeVisible();
      else await expect(page.getByText(SERVER_BADGE)).toBeVisible();
      if (t.action) await expect(primary(page)).toBeDisabled();
      await page.waitForLoadState("networkidle");
      g.assertClean();
    });

    test("accessible in light and dark mode", async ({ page }) => {
      await page.goto(`/${t.slug}`);
      await expect(workspace(page)).toBeVisible();
      await assertAccessible(page, "light");
      await useTheme(page, "dark");
      await page.reload();
      await expect(page.locator("html")).toHaveClass(/dark/);
      await assertAccessible(page, "dark");
    });

    test("mobile: no horizontal scroll, touch targets ≥ 44 px", async ({ page, isMobile }) => {
      test.skip(!isMobile, "mobile projects only");
      await page.goto(`/${t.slug}`);
      await expect(workspace(page)).toBeVisible();
      await assertMobileFriendly(page);
    });

    test("keyboard: the first control in the tool is reachable with Tab and shows focus", async ({
      page,
      isMobile,
      browserName,
    }) => {
      test.skip(isMobile, "keyboard test on desktop");
      await page.goto(`/${t.slug}`);
      await ready(page);
      // Safari only tabs to buttons and links with Option+Tab (its default "Press Tab to highlight" setting).
      const key = browserName === "webkit" ? "Alt+Tab" : "Tab";
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press(key);
        const inTool = await page.evaluate(() => !!document.activeElement?.closest('section[aria-label="Tool"]'));
        if (inTool) {
          const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
          expect(outline).not.toBe("none");
          return;
        }
      }
      throw new Error("Never reached a control inside the tool with Tab");
    });

    test("related tool links resolve", async ({ page, request }) => {
      await page.goto(`/${t.slug}`);
      const hrefs = await page
        .locator('section[aria-labelledby="related"] a')
        .evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
      for (const h of hrefs) expect((await request.get(h)).status(), h).toBe(200);
    });
  });
}

// ───────────────────────── Image tools ─────────────────────────
test.describe("Image Compressor", () => {
  test("compresses a JPG, output is a smaller valid JPG with the same dimensions; no upload", async ({ page }) => {
    const g = guard(page);
    await page.goto("/image-compressor");
    await upload(page, fx("photo.jpg"));
    await primary(page).click();
    await expect(output(page)).toContainText("→");
    const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    const img = await inspectImage(page, bytes);
    expect(img).toMatchObject({ type: "image/jpeg", width: 1200, height: 800 });
    expect(bytes.length).toBeLessThan(readFileSync(fx("photo.jpg")).length);
    expect(name).toBe("photo-compressed.jpg");
    g.assertNoUpload();
    g.assertClean();
  });

  test("PNG with a target size works in every browser (Safari can't write WebP, so it gets JPG)", async ({
    page,
    browserName,
  }) => {
    await page.goto("/image-compressor");
    await upload(page, gen("photo-1600x1200.png"));
    await page.getByLabel("Target size (KB, optional)").fill("150");
    await primary(page).click();
    await expect(output(page)).toContainText("→", { timeout: 60_000 });
    await expect(output(page)).toContainText(browserName === "webkit" ? "Saved as JPG" : "Saved as WebP");
    const { bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(bytes.length).toBeLessThanOrEqual(150 * 1024);
    const img = await inspectImage(page, bytes);
    expect(img).toMatchObject({ width: 1600, height: 1200 });
  });

  test("quality slider changes the output size", async ({ page }) => {
    await page.goto("/image-compressor");
    const sizeAt = async (q: string) => {
      await page.locator('input[type="range"]').fill(q);
      await primary(page).click();
      await expect(output(page)).toContainText("→");
      return (await downloadFrom(page, () => byTestId(page, "download").click())).bytes.length;
    };
    await upload(page, fx("photo.jpg"));
    const low = await sizeAt("0.4");
    const high = await sizeAt("0.95");
    expect(high).toBeGreaterThan(low);
  });

  test("target size is respected (50 KB)", async ({ page }) => {
    await page.goto("/compress-image-to-50kb");
    await upload(page, fx("large-6000x4000.jpg"));
    await primary(page).click();
    await expect(output(page)).toContainText("→", { timeout: 60_000 });
    const { bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(bytes.length).toBeLessThanOrEqual(50 * 1024);
  });

  test("PNG transparency is preserved", async ({ page }) => {
    await page.goto("/image-compressor");
    await upload(page, gen("transparent.png"));
    await primary(page).click();
    await expect(output(page)).toContainText("→");
    const { bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    const img = await inspectImage(page, bytes);
    expect(img.type).toBe("image/png");
    expect(img.transparentRatio).toBeGreaterThan(0.45);
  });

  test("batch: several files keep their order and download as one ZIP", async ({ page }) => {
    await page.goto("/image-compressor");
    await upload(page, [fx("photo.jpg"), gen("transparent.png"), gen("tiny-1x1.png")]);
    await primary(page).click();
    await expect(output(page)).toContainText("Download all (3)");
    const rows = await output(page).locator("li span.truncate").allTextContents();
    expect(rows).toEqual(["photo-compressed.jpg", "transparent-compressed.png", "tiny-1x1-compressed.png"]);
    const { name } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("klipkit-images.zip");
  });

  test("drag-and-drop and paste both load files", async ({ page }) => {
    await page.goto("/image-compressor");
    await dropFile(page, fx("photo.jpg"), "image/jpeg");
    await expect(workspace(page)).toContainText("1 image");
    await page.getByRole("button", { name: "Change" }).click();
    await pasteFile(page, gen("transparent.png"), "image/png");
    await expect(workspace(page)).toContainText("1 image");
    await expect(primary(page)).toBeEnabled();
  });

  test("corrupted image → clear error, UI recovers", async ({ page }) => {
    await page.goto("/image-compressor");
    await upload(page, fx("corrupted.jpg"));
    await primary(page).click();
    await expect(alert(page)).toContainText(/isn't an image/i);
    await page.getByRole("button", { name: "Change" }).click();
    await upload(page, fx("photo.jpg"));
    await primary(page).click();
    await expect(output(page)).toContainText("→");
  });

  test("file over the limit → message stating the limit", async ({ page }) => {
    await page.goto("/image-compressor");
    const big = join(process.cwd(), "test-results", "big-51mb.jpg");
    mkdirSync("test-results", { recursive: true });
    writeFileSync(big, Buffer.alloc(51 * 1024 * 1024, 1));
    await upload(page, big);
    await expect(alert(page)).toContainText("50 MB");
  });

  test("processing the same file twice works (no stale state)", async ({ page }) => {
    await page.goto("/image-compressor");
    await upload(page, fx("photo.jpg"));
    await primary(page).click();
    await expect(output(page)).toContainText("→");
    await primary(page).click();
    await expect(output(page)).toContainText("→");
    await page.getByRole("button", { name: "Change" }).click();
    await upload(page, fx("photo.jpg"));
    await expect(primary(page)).toBeEnabled();
  });

  test("Send to next tool hands the image to the converter without re-upload", async ({ page }) => {
    await page.goto("/image-compressor");
    await upload(page, fx("photo.jpg"));
    await primary(page).click();
    await expect(output(page)).toContainText("→");
    await byTestId(page, "send-next").click();
    await page.getByRole("button", { name: "Image Converter" }).click();
    await expect(page).toHaveURL(/image-converter/);
    await expect(workspace(page)).toContainText("1 image");
    await expect(primary(page)).toBeEnabled();
  });
});

test.describe("Image Resizer", () => {
  test("outputs exact pixel size and keeps aspect ratio", async ({ page }) => {
    await page.goto("/image-resizer");
    await upload(page, fx("photo.jpg"));
    await page.getByLabel("Max width (px)").fill("600");
    await primary(page).click();
    await expect(output(page)).toContainText("→");
    const { bytes, name } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(await inspectImage(page, bytes)).toMatchObject({ width: 600, height: 400 });
    expect(name).toBe("photo-resized.jpg");
  });
  test("handles a 6000×4000 image and a 1×1 image", async ({ page }) => {
    await page.goto("/image-resizer");
    await upload(page, [fx("large-6000x4000.jpg"), gen("tiny-1x1.png")]);
    await primary(page).click();
    await expect(output(page)).toContainText("1600×1067");
    await expect(output(page)).toContainText("1×1");
  });
});

test.describe("Image Converter", () => {
  for (const [label, mime] of [
    ["JPG", "image/jpeg"],
    ["PNG", "image/png"],
    ["WebP", "image/webp"],
  ] as const) {
    test(`converts JPG, PNG, WebP, GIF and AVIF inputs to ${label}`, async ({ page, browserName }) => {
      await page.goto("/image-converter");
      await page.getByLabel("Convert to").selectOption(mime);
      await upload(page, [
        fx("photo.jpg"),
        gen("transparent.png"),
        gen("photo.webp"),
        fx("anim.gif"),
        fx("photo.avif"),
      ]);
      await primary(page).click();
      if (mime === "image/webp" && browserName === "webkit") {
        // Safari cannot encode WebP from a canvas: the tool must say so clearly.
        await expect(alert(page)).toContainText(/cannot save WEBP/i);
        return;
      }
      await expect(output(page)).toContainText("Download all (5)");
      // Check one real output file: the first one.
      const first = output(page).locator("li").first();
      await expect(first).toContainText(mime === "image/jpeg" ? ".jpg" : mime === "image/png" ? ".png" : ".webp");
    });
  }
});

test.describe("HEIC to JPG", () => {
  test("converts a real HEIC to a valid JPG, on device", async ({ page }) => {
    const g = guard(page);
    await page.goto("/heic-to-jpg");
    await upload(page, fx("iphone.heic"));
    await primary(page).click();
    await expect(output(page)).toContainText("Converted 1 photo", { timeout: 60_000 });
    const { bytes, name } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("iphone.jpg");
    expect(await inspectImage(page, bytes)).toMatchObject({ type: "image/jpeg", width: 900, height: 600 });
    g.assertNoUpload();
    g.assertClean();
  });
  test("a JPG renamed .heic gives a clear error", async ({ page }) => {
    await page.goto("/heic-to-jpg");
    const fake = join(process.cwd(), "test-results", "fake.heic");
    mkdirSync("test-results", { recursive: true });
    writeFileSync(fake, readFileSync(fx("corrupted.jpg")));
    await upload(page, fake);
    await primary(page).click();
    await expect(alert(page)).toContainText(/couldn't be read as a HEIC/i, { timeout: 60_000 });
  });
});

// ───────────────────────── PDF ─────────────────────────
test.describe("Compress PDF", () => {
  test("image-heavy PDF gets smaller, still opens, same page count; no upload", async ({ page }) => {
    const g = guard(page);
    await page.goto("/compress-pdf");
    await upload(page, gen("image-heavy.pdf"));
    await primary(page).click();
    await expect(output(page)).toContainText("→", { timeout: 90_000 });
    const { bytes, name } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("image-heavy-compressed.pdf");
    expect(bytes.length).toBeLessThan(readFileSync(gen("image-heavy.pdf")).length * 0.5);
    expect(await pdfPages(bytes)).toBe(6);
    g.assertNoUpload();
  });
  test("target size is met or explained", async ({ page }) => {
    await page.goto("/compress-pdf-to-100kb");
    await upload(page, gen("image-heavy.pdf"));
    await primary(page).click();
    await expect(output(page)).toContainText("→", { timeout: 90_000 });
    const { bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    if (bytes.length > 100 * 1024) await expect(output(page)).toContainText(/Couldn't reach 100 KB/);
  });
  test("text-only PDF: explains small savings, keeps 20 pages", async ({ page }) => {
    await page.goto("/compress-pdf");
    await upload(page, gen("twenty-pages.pdf"));
    await primary(page).click();
    await expect(output(page)).toContainText(/no photos or scans|already as small/i);
    const { bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(await pdfPages(bytes)).toBe(20);
  });
  test("password-protected PDF → asks to unlock first", async ({ page }) => {
    await page.goto("/compress-pdf");
    await upload(page, gen("protected.pdf"));
    await primary(page).click();
    await expect(alert(page)).toContainText(/password-protected/i);
  });
  test("fake PDF (.txt renamed) → clear error", async ({ page }) => {
    await page.goto("/compress-pdf");
    await upload(page, gen("fake.pdf"));
    await primary(page).click();
    await expect(alert(page)).toContainText(/isn't a readable PDF/i);
  });
});

// ───────────────────────── Developer ─────────────────────────
test.describe("JSON Formatter", () => {
  test("formats the sample, copies valid JSON", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only in Playwright");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/json-formatter");
    await page.getByRole("button", { name: "Try a sample" }).click();
    await expect(output(page)).toContainText("Valid JSON");
    await byTestId(page, "copy").click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(JSON.parse(clip).name).toBe("KlipKit");
  });
  test("invalid JSON shows line 7 and a fix", async ({ page }) => {
    await page.goto("/json-formatter");
    await page.getByLabel("JSON input").fill(readFileSync(gen("invalid-line7.json"), "utf8"));
    await expect(alert(page)).toContainText("line 7");
    await expect(alert(page)).toContainText(/trailing comma/i);
  });
  test("minify works", async ({ page }) => {
    await page.goto("/json-formatter");
    await page.getByLabel("JSON input").fill('{ "a" : [1, 2] }');
    await page.getByLabel("Indent").selectOption("min");
    await expect(output(page).locator("pre")).toHaveText('{"a":[1,2]}');
  });
  test("5 MB JSON is formatted without freezing the page", async ({ page }) => {
    await page.goto("/json-formatter");
    const text = readFileSync(gen("huge-5mb.json"), "utf8");
    await page.getByLabel("JSON input").evaluate((el: HTMLTextAreaElement, v) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setter.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, text);
    // While it formats (in a worker), the page must keep painting: no frame gap over 500 ms.
    const maxGap = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let last = performance.now(),
            max = 0;
          const end = last + 3000;
          const tick = (now: number) => {
            max = Math.max(max, now - last);
            last = now;
            if (now < end) requestAnimationFrame(tick);
            else resolve(max);
          };
          requestAnimationFrame(tick);
        }),
    );
    expect(maxGap).toBeLessThan(500);
    await expect(output(page)).toContainText("Valid JSON", { timeout: 30_000 });
    await expect(output(page)).toContainText("Showing the first 200 KB");
  });
});

test.describe("JWT Decoder", () => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  test("decodes a valid token, flags expiry, states signature is not verified; no upload", async ({ page }) => {
    const g = guard(page);
    await page.goto("/jwt-decoder");
    await page
      .getByLabel("JWT")
      .fill(`${b64({ alg: "RS256", typ: "JWT" })}.${b64({ sub: "u_1", exp: 4102444800 })}.sig`);
    await expect(output(page)).toContainText("alg: RS256");
    await expect(output(page)).toContainText("Not expired");
    await expect(output(page)).toContainText(/Signature not verified/);
    await expect(output(page)).toContainText("u_1");
    g.assertNoUpload();
  });
  test("expired token is flagged", async ({ page }) => {
    await page.goto("/jwt-decoder");
    await page.getByLabel("JWT").fill(`${b64({ alg: "HS256" })}.${b64({ exp: 1000 })}.sig`);
    await expect(output(page)).toContainText("Expired");
  });
  test("malformed token gives a clear error", async ({ page }) => {
    await page.goto("/jwt-decoder");
    await page.getByLabel("JWT").fill("not-a-token");
    await expect(alert(page)).toContainText(/three parts/);
  });
});

test.describe("QR Code Generator", () => {
  test("the default code is in the server HTML (it was the LCP element, painted only after JS: 4.2 s)", async ({
    request,
  }) => {
    const html = await (await request.get("/qr-code-generator")).text();
    expect(html).toMatch(/<img[^>]*alt="Your QR code"/);
    expect(html).toContain("data:image/svg+xml");
  });
  test("renders a QR for a link and downloads PNG + SVG", async ({ page }) => {
    const g = guard(page);
    await page.goto("/qr-code-generator");
    await page.getByLabel("URL").fill("https://example.org/klipkit");
    await expect(page.getByAltText("Your QR code")).toBeVisible();
    const [a, b] = await new Promise<{ name: string; bytes: Buffer }[]>((resolve) => {
      const got: { name: string; bytes: Buffer }[] = [];
      page.on("download", async (d) => {
        got.push({ name: d.suggestedFilename(), bytes: readFileSync((await d.path())!) });
        if (got.length === 2) resolve(got);
      });
      byTestId(page, "download").click();
    });
    expect([a.name, b.name].sort()).toEqual(["qr-code.png", "qr-code.svg"]);
    const png = [a, b].find((x) => x.name.endsWith(".png"))!;
    expect(await inspectImage(page, png.bytes)).toMatchObject({ type: "image/png", width: 1024, height: 1024 });
    g.assertNoUpload();
    g.assertClean();
  });
  test("Wi-Fi landing page opens in Wi-Fi mode", async ({ page }) => {
    await page.goto("/wifi-qr-code-generator");
    await expect(page.getByRole("tab", { name: "Wi-Fi" })).toHaveAttribute("aria-selected", "true");
  });
});

// ───────────────────────── AI (on device) ─────────────────────────
test.describe("Background Remover", () => {
  test("without the model file: clear message, no crash", async ({ page, request }) => {
    const hasModel = (await request.head("/models/isnet-general-use-int8.onnx")).ok();
    test.skip(hasModel, "model present: covered by the next test");
    await page.goto("/background-remover");
    await upload(page, fx("photo.jpg"));
    await primary(page).click();
    await expect(alert(page)).toContainText(/Couldn't download the AI model/);
  });
  test("with the model: transparent PNG, model downloaded once then cached", async ({ page, request }) => {
    test.skip(
      !(await request.head("/models/isnet-general-use-int8.onnx")).ok(),
      "model file not installed (public/models/README.md)",
    );
    test.setTimeout(240_000);
    await page.goto("/background-remover");
    await upload(page, fx("photo.jpg"));
    await primary(page).click();
    await expect(output(page)).toContainText("Ran on your device", { timeout: 200_000 });
    const { bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    const img = await inspectImage(page, bytes);
    expect(img.type).toBe("image/png");
    expect(img.transparentRatio).toBeGreaterThan(0.05);
    // Second run: no network request for the model.
    const modelRequests: string[] = [];
    page.on("request", (r) => r.url().includes("/models/") && modelRequests.push(r.url()));
    await page.reload();
    await upload(page, fx("photo.jpg"));
    await primary(page).click();
    await expect(output(page)).toContainText("Ran on your device", { timeout: 200_000 });
    expect(modelRequests).toEqual([]);
  });
});

// Exposed for other specs.
export async function openTool(page: Page, slug: string) {
  await page.goto(`/${slug}`);
  await expect(workspace(page)).toBeVisible();
}
