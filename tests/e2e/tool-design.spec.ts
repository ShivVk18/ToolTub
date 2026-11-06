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
});
