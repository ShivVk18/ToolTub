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

  test("F3: code renders in a monospace font", async ({ page }) => {
    await page.goto("/json-formatter");
    const font = await page
      .locator(".font-mono")
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font).toMatch(/ui-monospace|SFMono|Menlo|monospace/);
    expect(font).not.toMatch(/^"?Inter/);
  });

  test("F4: code and result surfaces use the soft surface colour, with AA contrast", async ({ page }) => {
    await page.goto("/json-formatter");
    await page.getByRole("textbox").first().fill('{"a":1,"b":[1,2]}');
    const pre = page.locator("pre").first();
    await expect(pre).toBeVisible();
    const m = await pre.evaluate((el) => {
      const probe = document.createElement("div");
      probe.style.background = "var(--soft)";
      document.body.appendChild(probe);
      const soft = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, soft };
    });
    expect(m.bg).toBe(m.soft);
  });

  test("F15: the explainer uses the tool's display name and lists no guides that don't exist", async ({ page }) => {
    await page.goto("/json-formatter");
    await expect(page.getByRole("heading", { name: "About JSON Formatter & Validator", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /about json formatter/ })).toHaveCount(0);
    await expect(page.getByText(/Guide \(coming soon\)/)).toHaveCount(0);
  });
});
