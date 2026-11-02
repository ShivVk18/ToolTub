import { test, expect } from "@playwright/test";
import { assertAccessible, assertMobileFriendly, downloadFrom, fx, guard, inspectImage, output, primary, upload, workspace, alert, byTestId } from "./helpers";

test.describe("homepage", () => {
  test("renders all sections with no console errors or hydration warnings", async ({ page }) => {
    const g = guard(page);
    await page.goto("/");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toContainText("run on your device");
    await expect(page.getByText("No sign-up · Runs on your device · Free forever")).toBeVisible();
    for (const name of ["Productivity", "Developer", "Creator"]) await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Popular tools" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tool Chains" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Questions about KlipKit" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    g.assertClean();
  });
  test("accessible; mobile friendly", async ({ page, isMobile }) => {
    await page.goto("/");
    await assertAccessible(page, "home");
    if (isMobile) await assertMobileFriendly(page);
  });
  test("no link to a tool that doesn't work", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator("main a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
    for (const h of hrefs) expect((await request.get(h)).status(), h).toBe(200);
  });
});

test.describe("search (Cmd/Ctrl+K)", () => {
  test("opens with the shortcut, finds synonyms, navigates with the keyboard", async ({ page, browserName, isMobile }) => {
    test.skip(isMobile, "keyboard shortcut is a desktop feature");
    await page.goto("/");
    await page.keyboard.press(browserName === "webkit" ? "Meta+k" : "Control+k");
    const box = page.getByRole("combobox");
    await expect(box).toBeFocused();
    await box.fill("shrink pdf");
    await expect(page.getByRole("option").first()).toContainText("Compress PDF");
    await box.fill("jwt");
    await expect(page.getByRole("option").first()).toContainText("JWT Decoder");
    await box.fill("heic");
    await expect(page.getByRole("option").first()).toContainText("HEIC to JPG");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/heic-to-jpg$/);
  });
  test("no-results state", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /What do you need to do/ }).click();
    await page.getByRole("combobox").fill("zzqxw");
    await expect(page.getByText("No tool matches")).toBeVisible();
  });
  test("coming-soon tools are labelled, not linked", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /What do you need to do/ }).click();
    await page.getByRole("combobox").fill("merge pdf");
    // Available tools rank first, so find the Merge PDF row rather than assuming it is first.
    const opt = page.getByRole("option").filter({ hasText: "Merge PDF" });
    await expect(opt).toContainText("Coming soon");
    await expect(opt.locator("button")).toBeDisabled();
  });
});

test.describe("recents, favourites, theme", () => {
  test("recents and favourites survive a reload", async ({ page }) => {
    await page.goto("/json-formatter");
    await page.getByRole("button", { name: "Add to favourites" }).click();
    await page.goto("/jwt-decoder");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Favourites" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recently used" })).toBeVisible();
    await page.reload();
    await expect(page.locator("section", { has: page.getByRole("heading", { name: "Favourites" }) })).toContainText("JSON Formatter");
    await page.goto("/json-formatter");
    await expect(page.getByRole("button", { name: "Remove from favourites" })).toBeVisible();
  });
  test("favourite star renders without a hydration mismatch", async ({ page }) => {
    const g = guard(page);
    await page.goto("/json-formatter");
    await page.getByRole("button", { name: "Add to favourites" }).click();
    await page.reload();
    await page.waitForLoadState("networkidle");
    g.assertClean();
  });
  test("works when localStorage is blocked (private mode)", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/json-formatter");
    await page.getByRole("button", { name: "Try a sample" }).click();
    await expect(output(page)).toContainText("Valid JSON");
    expect(errors).toEqual([]);
  });
  test("dark theme persists and is applied before first paint", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => ((window as unknown as { __darkAtDcl: boolean }).__darkAtDcl = document.documentElement.classList.contains("dark"))));
    await page.reload();
    expect(await page.evaluate(() => (window as unknown as { __darkAtDcl: boolean }).__darkAtDcl)).toBe(true);
  });
});

test.describe("Tool Chains", () => {
  test("optimize-image-for-web: JPG → 1600 px → compressed → WebP", async ({ page, browserName }) => {
    const g = guard(page);
    await page.goto("/chain/optimize-image-for-web");
    await upload(page, fx("large-6000x4000.jpg"));
    await primary(page).click();
    if (browserName === "webkit") {
      await expect(alert(page)).toContainText(/Step 3 .*cannot save WEBP/i);
      return;
    }
    await expect(output(page)).toContainText("→", { timeout: 60_000 });
    const { bytes, name } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("large-6000x4000.webp");
    expect(await inspectImage(page, bytes)).toMatchObject({ type: "image/webp", width: 1600, height: 1067 });
    g.assertNoUpload();
  });
  test("instagram-ready-photo gives a JPG within 1080×1350", async ({ page }) => {
    await page.goto("/chain/instagram-ready-photo");
    await upload(page, fx("large-6000x4000.jpg"));
    await primary(page).click();
    await expect(output(page)).toContainText("→", { timeout: 60_000 });
    const { bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(await inspectImage(page, bytes)).toMatchObject({ type: "image/jpeg", width: 1080, height: 720 });
  });
  test("iphone-photo-to-small-jpg converts HEIC then compresses", async ({ page }) => {
    await page.goto("/chain/iphone-photo-to-small-jpg");
    await upload(page, fx("iphone.heic"));
    await primary(page).click();
    await expect(output(page)).toContainText("→", { timeout: 60_000 });
    const { bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect((await inspectImage(page, bytes)).type).toBe("image/jpeg");
  });
  test("a failing step says which step failed", async ({ page }) => {
    await page.goto("/chain/instagram-ready-photo");
    await upload(page, fx("corrupted.jpg"));
    await primary(page).click();
    await expect(alert(page)).toContainText(/Step 1 \(Image Resizer\)/);
  });
});

test.describe("hubs and 404", () => {
  test("category hub lists live tools and coming-soon ones separately", async ({ page }) => {
    await page.goto("/image-tools");
    await assertAccessible(page, "hub");
    await expect(page.locator("h1")).toHaveText("Free Image Tools");
    await expect(page.getByRole("link", { name: /Image Compressor/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Coming soon" })).toBeVisible();
  });
  test("unknown URL returns a real 404 with a way back", async ({ page }) => {
    const res = await page.goto("/this-tool-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("link", { name: /Search all KlipKit tools/ })).toBeVisible();
  });
  test("tool workspace is the same template everywhere", async ({ page }) => {
    for (const slug of ["image-compressor", "json-formatter", "pdf-to-word"]) {
      await page.goto(`/${slug}`);
      await expect(workspace(page)).toBeVisible();
      await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
    }
  });
});
