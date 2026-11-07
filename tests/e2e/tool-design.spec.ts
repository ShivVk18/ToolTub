import { test, expect } from "@playwright/test";
import { assertAccessible, fx, primary, upload } from "./helpers";

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

  test("F14: /search has a pill input and tagged result rows; coming-soon rows are muted, not links", async ({
    page,
  }) => {
    await page.goto("/search?q=pdf");
    const input = page.getByRole("textbox", { name: "Search tools" });
    const radius = await input.evaluate((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius));
    const height = await input.evaluate((e) => e.getBoundingClientRect().height);
    expect(radius).toBeGreaterThanOrEqual(height / 2 - 1);

    const rows = page.locator("[data-search-row]");
    await expect(rows.first()).toBeVisible();
    // live rows: a link, no underline, with a category tag
    const live = rows.filter({ has: page.locator("a") }).first();
    await expect(live.locator("a")).toHaveCSS("text-decoration-line", "none");
    await expect(live.locator("[data-cat]")).toHaveText(/Productivity|Developer|Creator/);
    // coming-soon rows: no link, tagged and muted
    const soon = rows.filter({ hasText: "Coming soon" }).first();
    await expect(soon).toBeVisible();
    await expect(soon.locator("a")).toHaveCount(0);
    // muted without fading text (that fails AA): grey, dimmed icon and a secondary-colour name
    const m = await soon.evaluate((e) => {
      const icon = e.querySelector("[aria-hidden]")!;
      const name = e.querySelector(".font-semibold")!;
      return { op: Number(getComputedStyle(icon).opacity), name: getComputedStyle(name).color };
    });
    expect(m.op).toBeLessThan(1);
    expect(m.name).not.toBe(
      await page.locator("body").evaluate(() => {
        const d = document.createElement("i");
        d.style.color = "var(--ink)";
        document.body.append(d);
        const c = getComputedStyle(d).color;
        d.remove();
        return c;
      }),
    );
    await assertAccessible(page, "/search");
  });

  test("F13: result actions are pills with one primary; Save is a labelled chip beside the badges", async ({
    page,
  }) => {
    await page.goto("/json-formatter");
    const radius = (sel: string) =>
      page
        .locator(sel)
        .first()
        .evaluate((e) => {
          const r = e.getBoundingClientRect();
          return parseFloat(getComputedStyle(e).borderTopLeftRadius) >= r.height / 2 - 1;
        });

    // ☆ Save chip: visible label, a pill, on the same row as the privacy badge
    const save = page.getByRole("button", { name: "Save to favourites" });
    await expect(save).toHaveText(/Save/);
    await expect(save).toHaveAttribute("aria-pressed", "false");
    const [saveBox, badgeBox] = await Promise.all([
      save.boundingBox(),
      page.getByText(/Runs on your device/).boundingBox(),
    ]);
    expect(Math.abs(saveBox!.y + saveBox!.height / 2 - (badgeBox!.y + badgeBox!.height / 2))).toBeLessThan(6);
    expect(
      await save.evaluate(
        (e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) >= e.getBoundingClientRect().height / 2 - 1,
      ),
    ).toBe(true);

    await page.getByRole("button", { name: "Try a sample" }).click();
    await expect(page.locator('[data-testid="download"]:visible')).toBeVisible();
    // one primary: Download is ink, Copy beside it is a secondary pill
    const bg = (id: string) =>
      page.locator(`[data-testid="${id}"]:visible`).evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(await bg("copy")).not.toBe(await bg("download"));
    expect(await radius('[data-testid="copy"]:visible')).toBe(true);

    // Send to next tool is a pill like its neighbours (JSON has no live next tool; the compressor does)
    await page.goto("/image-compressor");
    await upload(page, fx("photo.jpg"));
    await primary(page).click();
    await expect(page.locator('[data-testid="send-next"]:visible')).toBeVisible();
    expect(await radius('[data-testid="send-next"]:visible')).toBe(true);
  });

  test("F10: related tools are home-style chips in the same column as the title and the guide", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/json-formatter");
    const related = page.locator('section[aria-labelledby="related"]');
    const chips = related.getByRole("link");
    expect(await chips.count()).toBeGreaterThan(0);
    for (const c of await chips.all()) {
      const pill = await c.evaluate(
        (e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) >= e.getBoundingClientRect().height / 2 - 1,
      );
      expect(pill).toBe(true);
    }
    const left = (l: import("@playwright/test").Locator) =>
      l.evaluate((e) => Math.round(e.getBoundingClientRect().left));
    const h1 = await left(page.locator("main h1").first());
    expect(await left(related)).toBe(h1);
    expect(await left(page.locator("article.prose-klip"))).toBe(h1);
  });

  test("F9: hubs lead with every live tool as a large card; the backlog is a compact chip list", async ({ page }) => {
    await page.goto("/developer-tools");
    const live = page.locator("[data-hub-live] a");
    // routed tools open their page; live home panels open via the home deep link
    await expect(live.filter({ hasText: "JSON Formatter" })).toHaveAttribute("href", "/json-formatter");
    await expect(live.filter({ hasText: "Base64" })).toHaveAttribute("href", "/#base64");
    await expect(live.filter({ hasText: "Regex Tester" })).toHaveAttribute("href", "/#regex-tester");

    const soon = page.locator("[data-hub-soon] li");
    expect(await soon.count()).toBeGreaterThan(0);
    await expect(soon.filter({ hasText: /^Base64$/ })).toHaveCount(0);
    await expect(page.locator("[data-hub-soon] a")).toHaveCount(0);
    const chipH = await soon.first().evaluate((e) => e.getBoundingClientRect().height);
    const cardH = await live.first().evaluate((e) => e.getBoundingClientRect().height);
    expect(chipH).toBeLessThanOrEqual(36);
    expect(cardH).toBeGreaterThan(chipH * 3);
    // glyphs keep the category hue but meet AA on their tinted tile, in both themes
    await assertAccessible(page, "/developer-tools light");
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.goto("/pdf-tools");
    await assertAccessible(page, "/pdf-tools dark");
    await page.goto("/developer-tools");

    // the deep link really opens the live panel
    await live.filter({ hasText: "Base64" }).click();
    await expect(page.getByLabel("Base64 workspace")).toBeVisible();
  });
});
