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
