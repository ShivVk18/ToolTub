import { test, expect, type Page } from "@playwright/test";
import { CARD_SLUGS } from "../../src/registry/catalog";

/** Flow 5.7 — every live panel: deep link, Sample, every option, Clear, Copy, full screen + Esc, ⌘/Ctrl+Enter. */
const out = (page: Page) => page.locator("#pnOut");
const text = async (page: Page) => (await out(page).innerText()).trim();

for (const slug of [...CARD_SLUGS]) {
  test(`live panel: ${slug}`, async ({ page, context, browserName }) => {
    await page.goto(`/#${slug}`);
    const panel = page.locator("#panel");
    await expect(panel).toBeVisible();

    // Sample gives output
    const sample = page.locator("#pnSample");
    if (await sample.isVisible()) await sample.click();
    await expect.poll(() => text(page)).not.toBe("");
    await expect(page.locator("#pnStatus")).not.toBeEmpty();

    // Copy (on the sample's first output): the clipboard is filled (Chromium grants clipboard access)
    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.locator("#pnCopy").click();
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      expect(clip.length).toBeGreaterThan(0);
    }

    // every option button changes the output
    const opts = page.locator("#pnOpts .seg");
    const n = await opts.count();
    if (n > 1) {
      const seen: string[] = [];
      for (let i = 0; i < n; i++) {
        const before = await text(page);
        await opts.nth(i).click();
        await expect(opts.nth(i)).toHaveClass(/\bon\b/);
        // async panels (Prettier, YAML) load their library on first use: wait for the new output, not a fixed delay
        if (i > 0) await expect.poll(() => text(page), { timeout: 10_000 }).not.toBe(before);
        else await page.waitForTimeout(150);
        seen.push(await text(page));
      }
      expect(new Set(seen).size, `${slug} options: ${JSON.stringify(seen.map((s) => s.slice(0, 40)))}`).toBe(n);
    }

    // full screen, then Esc
    await page.locator("#pnFull").click();
    await expect.poll(() => page.evaluate(() => document.body.className)).toMatch(/full/);
    await page.keyboard.press("Escape");
    await expect.poll(() => page.evaluate(() => document.body.className)).not.toMatch(/full/);

    // ⌘/Ctrl+Enter runs the tool (generators make a new value)
    const before = await text(page);
    const input = page.locator("#pnIn");
    if (await input.isVisible()) await input.focus();
    else await page.locator("#pnOut").click();
    await page.keyboard.press(browserName === "webkit" ? "Meta+Enter" : "Control+Enter");
    await expect.poll(() => text(page)).not.toBe("");
    // random generators give a new value (Lorem is fixed text by design)
    if (["uuid-generator", "password-generator"].includes(slug)) await expect.poll(() => text(page)).not.toBe(before);

    // Clear empties the input
    const clear = page.locator("#pnClear");
    if (await clear.isVisible()) {
      await clear.click();
      await expect(input).toHaveValue("");
    }
  });
}
