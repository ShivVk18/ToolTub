import { test, expect } from "@playwright/test";
import { primary } from "./helpers";

/** Design-system checks for tool pages (Phase 3 audit). */
test.describe("tool pages use the design system", () => {
  test("F1: the primary action is a solid ink pill, not a transparent one", async ({ page }) => {
    await page.goto("/image-compressor");
    const bg = await primary(page).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    const ink = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ink").trim());
    expect(ink).not.toBe("");
  });

  test("F2: page titles are left-aligned serif headings, not the hero's 112 px centred H1", async ({ page }) => {
    for (const path of ["/json-formatter", "/developer-tools", "/about"]) {
      await page.goto(path);
      const h = await page.locator("h1").evaluate((el) => {
        const cs = getComputedStyle(el);
        return { align: cs.textAlign, size: parseFloat(cs.fontSize), font: cs.fontFamily };
      });
      expect(h.align, path).not.toBe("center");
      expect(h.size, path).toBeGreaterThanOrEqual(36);
      expect(h.size, path).toBeLessThanOrEqual(56);
      expect(h.font, path).toMatch(/KKSerif/);
    }
    await page.goto("/");
    expect(await page.locator("#h1").evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
  });
});
