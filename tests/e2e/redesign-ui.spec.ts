import { PNG } from "pngjs";
import { test, expect } from "@playwright/test";
import { assertAccessible } from "./helpers";

test.describe("KlipKit Redesign UI & Visual Layer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("hero section matches Input Model 2.0 with ask bar and alt chips", async ({ page }) => {
    // 1. Eyebrow
    const eyebrow = page.locator("#hero .eyebrow");
    await expect(eyebrow).toBeVisible();
    await expect(eyebrow).toContainText("76 tools · Runs on your device · Free forever");

    // 2. Headline with squiggle
    const h1 = page.locator("#h1");
    await expect(h1).toContainText("Drop it. Paste it.");
    await expect(h1).toContainText("Or just say what you need.");
    await expect(page.locator("#squig")).toBeAttached();
    await expect(page.locator("#squigP")).toBeAttached();

    // 3. Ask bar
    const heroAsk = page.locator("#heroAsk");
    await expect(heroAsk).toBeVisible();
    await expect(page.locator("#heroGo")).toBeVisible();

    // 4. Sample chips + dashed alt chips
    const samples = page.locator("#samples");
    await expect(samples).toBeVisible();
    await expect(samples.locator('[data-sample="pdf"]')).toBeVisible();
    await expect(samples.locator('[data-sample="image"]')).toBeVisible();
    await expect(samples.locator('[data-sample="audio"]')).toBeVisible();

    // Dashed alt chips
    await expect(samples.getByText("Paste JSON")).toBeVisible();
    await expect(samples.getByText("Paste a token")).toBeVisible();
    await expect(samples.getByText("Generate UUIDs")).toBeVisible();
  });

  test("orbiting satellites render 9 pills in hero mode", async ({ page }) => {
    const sats = page.locator("#sats .sat");
    await expect(sats).toHaveCount(9);
    await expect(sats.first()).toBeVisible();
  });

  test("marquee band displays serif and italic phrases", async ({ page }) => {
    const band = page.locator(".band");
    await expect(band).toBeAttached();
    await expect(page.locator("#br1")).toContainText("Compress a PDF");
    await expect(page.locator("#br2")).toContainText("No sign-up");
  });

  test("bento grid in Why KlipKit renders typing demo, paste cycle, and keycaps", async ({ page }) => {
    const bento = page.locator("#bento");
    await expect(bento).toBeVisible();

    // b-big: typing demo
    await expect(bento.locator(".b-big")).toBeVisible();
    await expect(bento.locator(".bstat")).toContainText("76");
    await expect(bento.locator(".bstat")).toContainText("0.8 ms");

    // b-paste: detector cycle
    await expect(bento.locator(".b-paste")).toBeVisible();
    await expect(page.locator("#bpBox")).toBeVisible();

    // b-priv: 0 bytes uploaded
    await expect(bento.locator(".b-priv .zero")).toContainText("0");
    await expect(page.locator("#lockDot")).toBeAttached();

    // b-keys: ⌘ and K keycaps
    await expect(page.locator(".kc").first()).toContainText("⌘");
    await expect(page.locator(".kc").nth(1)).toContainText("K");
  });

  test("tools grid displays 76 tools, category tabs, and Live badges", async ({ page }) => {
    const explore = page.locator("#explore");
    await explore.scrollIntoViewIfNeeded();

    // Number count
    await expect(page.locator("#cnt")).toBeVisible();

    // Tabs
    const tabs = page.locator("#tabs .tab");
    await expect(tabs).toHaveCount(4); // All, Productivity, Developer, Creator
    await expect(page.locator("#tabInd")).toBeVisible();

    // Click Developer tab to see Live tools
    await page.locator("#tabs .tab", { hasText: "Developer" }).click();
    const liveBadges = page.locator(".tcard .tg b");
    await expect(liveBadges.first()).toContainText("Live");
  });

  test("pricing section has monthly/yearly toggle and conic Pro card", async ({ page }) => {
    const pricing = page.locator("#pricing");
    await expect(pricing).toBeVisible();

    // Toggle
    const billTabs = page.locator("#billTabs");
    await expect(billTabs).toBeVisible();
    await expect(billTabs.getByText("Monthly")).toBeVisible();
    await expect(billTabs.getByText("Yearly")).toBeVisible();

    // Pro Card
    const proCard = page.locator(".plan.dark");
    await expect(proCard).toBeVisible();
    await expect(page.locator("#proPrice")).toContainText("₹");
    await expect(page.locator("#proBtn")).toBeVisible();
  });

  test("giant spotlight wordmark is attached at bottom", async ({ page }) => {
    const giant = page.locator("#giant");
    await expect(giant).toBeAttached();
    await expect(giant.locator(".g1")).toContainText("KlipKit");
    await expect(giant.locator(".g2")).toContainText("KlipKit");
  });

  test("clicking a Live tool opens the split-screen LiveToolPanel", async ({ page }) => {
    // Scroll to explore and switch to Developer tab
    const devTab = page.locator("#tabs .tab", { hasText: "Developer" });
    await devTab.scrollIntoViewIfNeeded();
    await devTab.click();

    // Open JSON Formatter
    const jsonCard = page.locator(".tcard", { hasText: "JSON Formatter" });
    await jsonCard.click();

    // Check that panel opened
    const panel = page.locator("#panel");
    await expect(panel).toBeVisible();
    await expect(page.locator("#pnT")).toHaveText("JSON Formatter");
    await expect(page.locator("#pnIn")).toBeVisible();
    await expect(page.locator("#pnOut")).toBeVisible();
    await expect(page.locator("#pnStatus")).toContainText("Valid JSON");

    // Test option segment click (e.g. Minify)
    const minifyOpt = page.locator("#pnOpts button", { hasText: "Minify" });
    if (await minifyOpt.isVisible()) {
      await minifyOpt.click();
      await expect(page.locator("#pnStatus")).toContainText("Valid JSON");
    }

    // Test full screen toggle
    const fullBtn = page.locator("#pnFull");
    await fullBtn.click();
    await expect(page.locator("body")).toHaveClass(/panel-full/);
    await fullBtn.click();
    await expect(page.locator("body")).not.toHaveClass(/panel-full/);

    // Test Chat button returns to thread
    const chatBtn = page.locator("#pnChat");
    await chatBtn.click();
    await expect(page.locator("body")).not.toHaveClass(/panel-open/);
  });

  test("deep linking with hash #base64 opens Base64 live panel", async ({ page }) => {
    await page.goto("/#base64");
    await page.waitForTimeout(400);

    const panel = page.locator("#panel");
    await expect(panel).toBeVisible();
    await expect(page.locator("#pnT")).toHaveText("Base64");
  });

  test("axe accessibility check on home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await assertAccessible(page, "home page");
  });

  test("the Explore grid rule doesn't leak onto other Tailwind `grid` elements", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const leaks = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>(".grid:not(#grid)"))
        .filter((el) => !/(^|\s)(m|mt|my)-/.test(el.className))
        .map((el) => ({ el: el.id || el.className.slice(0, 40), cs: getComputedStyle(el) }))
        .filter(({ cs }) => cs.marginTop === "34px" || cs.maxWidth === "1500px")
        .map(({ el }) => el),
    );
    expect(leaks).toEqual([]);
  });

  test("Go Pro opens a visible, clickable voice sheet; Escape closes it", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator("#gopro").click();
    const sheet = page.locator("#sheet");
    await expect.poll(() => sheet.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    const onTop = await page.locator("#tryVoice").evaluate((btn) => {
      const r = btn.getBoundingClientRect();
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest("#tryVoice") === btn;
    });
    expect(onTop).toBe(true);
    await page.keyboard.press("Escape");
    await expect.poll(() => sheet.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  });

  test("section headings keep their italic second phrase", async ({ page }) => {
    await page.goto("/");
    const styles = await page.evaluate(() =>
      ["#feel", "#explore", "#pricing"].map((id) => {
        const em = document.querySelector(`${id} h2 em`);
        return em ? getComputedStyle(em).fontStyle : "missing";
      }),
    );
    expect(styles).toEqual(["italic", "italic", "italic"]);
  });

  test("the scrolled nav capsule blurs what's behind it", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect(page.locator("body")).toHaveClass(/scrolled/);
    const blur = await page.locator(".navin").evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(blur).toContain("blur(16px)");
  });

  test("the Pro plan card shows its gradient ring", async ({ page }) => {
    await page.goto("/");
    const card = page.locator(".plan.dark");
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const box = (await card.boundingBox())!;
    // Just outside the left edge, halfway down: the ring reaches 1 px past the 1 px border; page background without it.
    const png = PNG.sync.read(
      await page.screenshot({ clip: { x: box.x - 0.5, y: box.y + box.height / 2, width: 1, height: 1 } }),
    );
    const [r, g, b] = png.data;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    expect(saturation, `edge pixel rgb(${r},${g},${b})`).toBeGreaterThan(40);
  });

  for (const width of [390, 1440, 1920]) {
    test(`hero squiggle sits where the reference puts it under "just say" at ${width}px`, async ({
      browser,
      baseURL,
    }) => {
      // Offset of the squiggle from the word "just", once the entrance animation has finished.
      const measure = async (url: string) => {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(url, { waitUntil: "load" });
        await page.waitForTimeout(3200);
        const d = await page.evaluate(() => {
          const just = document.querySelectorAll("#h1 .l2 .w")[1].getBoundingClientRect();
          const sq = document.getElementById("squig")!.getBoundingClientRect();
          return { top: sq.top - just.bottom, left: sq.left - just.left };
        });
        await page.close();
        return d;
      };
      const ref = await measure("file://" + process.cwd() + "/design/reference/KlipKit_UI.html");
      const app = await measure(baseURL + "/");
      expect(Math.abs(app.top - ref.top), `top: app ${app.top} vs ref ${ref.top}`).toBeLessThan(2.5);
      expect(Math.abs(app.left - ref.left), `left: app ${app.left} vs ref ${ref.left}`).toBeLessThan(2.5);
    });
  }

  test("Tailwind margin/padding utilities aren't wiped by the global reset", async ({ page }) => {
    // The JSON Formatter page is built only from Tailwind utilities; none of its spacing should resolve to 0.
    await page.goto("/json-formatter");
    const dead = await page.evaluate(() => {
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("[class]"))) {
        const cs = getComputedStyle(el);
        for (const cls of (el.getAttribute("class") ?? "").split(/\s+/)) {
          const m = /^(m|p)([tblrxy])?-(\[?[\d.]+(?:px|rem)?\]?)$/.exec(cls);
          if (!m || /^(0|\[0px\])$/.test(m[3])) continue;
          const side = (
            { t: "Top", b: "Bottom", l: "Left", r: "Right", x: "Left", y: "Top" } as Record<string, string>
          )[m[2] ?? "t"];
          const prop = (m[1] === "m" ? "margin" : "padding") + side;
          if (cs.getPropertyValue(prop.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())) === "0px") out.push(cls);
        }
      }
      return out;
    });
    expect(dead).toEqual([]);
    // Home footer: the right-hand group is pushed to the far side with ml-auto.
    await page.goto("/");
    const right = page.locator("footer .ml-auto").last();
    const [footer, group] = await Promise.all([page.locator("footer").last().boundingBox(), right.boundingBox()]);
    expect(footer!.x + footer!.width - (group!.x + group!.width)).toBeLessThan(160);
  });

  test("pricing uses the reference copy and spacing", async ({ page }) => {
    await page.goto("/");
    const sec = page.locator("#pricing");
    await sec.scrollIntoViewIfNeeded();
    const free = sec.locator(".plan").first();
    await expect(free.locator(".pe")).toHaveText("forever · no sign-up");
    await expect(free.locator("li")).toHaveText([
      /All 76 tools$/,
      /Runs on your device$/,
      /No watermarks, no clutter$/,
      /Smart suggestions & Tool Chains$/,
    ]);
    // Heading → toggle is .bill's 30 px; the toggle has no extra margin of its own (reference: style="margin:0").
    const [h2, tabs] = await Promise.all([sec.locator("h2").boundingBox(), sec.locator("#billTabs").boundingBox()]);
    expect(Math.round(tabs!.y - (h2!.y + h2!.height))).toBe(30);
  });

  test("home text boxes have the reference's line heights", async ({ browser, baseURL }) => {
    const sels = [".eyebrow", "#hint", "#samples .chip", ".plan li", ".plan .pe", "#explore .tcard p", ".band"];
    const heights = async (url: string) => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(url, { waitUntil: "load" });
      const h = await page.evaluate(
        (ss) => ss.map((s) => Math.round(document.querySelector(s)?.getBoundingClientRect().height ?? -1)),
        sels,
      );
      await page.close();
      return Object.fromEntries(sels.map((s, i) => [s, h[i]]));
    };
    const ref = await heights("file://" + process.cwd() + "/design/reference/KlipKit_UI.html");
    const app = await heights(baseURL + "/");
    for (const s of sels)
      expect(Math.abs(app[s] - ref[s]), `${s}: app ${app[s]} vs ref ${ref[s]}`).toBeLessThanOrEqual(1);
  });

  test("footer brand matches the reference size", async ({ browser, baseURL }) => {
    const measure = async (url: string) => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(url, { waitUntil: "load" });
      const m = await page.evaluate(() => {
        const f = document.querySelectorAll("footer")[document.querySelectorAll("footer").length - 1];
        const mark = f.querySelector(".mark")!.getBoundingClientRect();
        return {
          footer: Math.round(f.getBoundingClientRect().height),
          mark: Math.round(mark.width),
          brandFs: getComputedStyle(f.querySelector(".brand")!).fontSize,
        };
      });
      await page.close();
      return m;
    };
    const ref = await measure("file://" + process.cwd() + "/design/reference/KlipKit_UI.html");
    const app = await measure(baseURL + "/");
    expect(app).toEqual(ref);
  });

  test("prefers-reduced-motion turns off continuous animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("#hero")).toBeVisible();
    // Satellites are hidden; the orb is placed in its slot but doesn't spin.
    await expect(page.locator("#sats")).toBeHidden();
    const snap = () =>
      page.evaluate(() => ({
        rot: getComputedStyle(document.getElementById("orb")!).getPropertyValue("--r"),
        placeholder: (document.getElementById("heroAsk") as HTMLInputElement).placeholder,
        band: Array.from(document.querySelectorAll<HTMLElement>(".band [style*='translate']"))
          .map((e) => e.style.transform)
          .join("|"),
      }));
    const a = await snap();
    await page.waitForTimeout(1500);
    const b = await snap();
    expect(b.rot).toBe(a.rot);
    expect(b.placeholder).toBe(a.placeholder);
    expect(b.band).toBe(a.band);
    // Still usable: the orb sits in its slot and the ask bar works.
    const [orb, slot] = await Promise.all([page.locator("#orb").boundingBox(), page.locator("#orbSlot").boundingBox()]);
    expect(Math.abs(orb!.x + orb!.width / 2 - (slot!.x + slot!.width / 2))).toBeLessThan(12);
  });
});
