import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fx, gen } from "./helpers";

/** Flow 5.3 — generators from the hero ask bar. Clock frozen as in §2, so "now" is deterministic. */
const NOW = new Date("2026-11-04T10:07:00+05:30");
test.use({ timezoneId: "Asia/Kolkata", locale: "en-IN" });

async function ask(page: Page, text: string) {
  await page.goto("/");
  const box = page.getByRole("textbox", { name: "Ask KlipKit or paste something" });
  await box.fill(text);
  await box.press("Enter");
}
const card = (page: Page) => page.locator("#work .rcard2").last();
const lines = async (page: Page) => (await card(page).locator("pre").innerText()).trim().split("\n");

test.describe("generators from the hero ask bar", () => {
  // Date is frozen at NOW; timers still run, so the UI behaves normally.
  test.beforeEach(async ({ page }) => page.clock.setFixedTime(NOW));

  test("10 UUIDs: all v4, no duplicates", async ({ page }) => {
    await ask(page, "generate 10 uuids");
    const ids = await lines(page);
    expect(ids).toHaveLength(10);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(ids).size).toBe(10);
  });
  test("password of 24 characters", async ({ page }) => {
    await ask(page, "generate a 24 character password");
    const [pw] = await lines(page);
    expect(pw).toHaveLength(24);
  });
  test("3 paragraphs of lorem ipsum", async ({ page }) => {
    await ask(page, "3 paragraphs of lorem ipsum");
    const text = (await card(page).locator("pre").innerText()).trim();
    expect(text.split(/\n\s*\n/)).toHaveLength(3);
  });
  test("sha256 of hello world (copied value checked)", async ({ page, context, browserName }) => {
    await ask(page, "sha256 of hello world");
    await expect(card(page)).toContainText("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
    if (browserName === "chromium") {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await card(page).getByRole("button", { name: /Copy/ }).click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
      );
    }
  });
  test('base64 of "hello world"', async ({ page }) => {
    await ask(page, 'base64 of "hello world"');
    await expect(card(page).locator("pre")).toHaveText("aGVsbG8gd29ybGQ=");
  });
  test("current timestamp uses the (frozen) clock", async ({ page }) => {
    await ask(page, "current timestamp");
    await expect(page.locator("#work")).toContainText(String(Math.floor(NOW.getTime() / 1000)));
  });
  test("a QR code request opens the QR tool, ready to use", async ({ page }) => {
    await ask(page, "make a qr code");
    await expect(page).toHaveURL(/\/qr-code-generator$/);
    await expect(page.getByAltText("Your QR code")).toBeVisible();
  });
});

/** Flow 5.4 — global paste (⌘V anywhere on the page) starts the right flow. */
test.describe("global paste", () => {
  // Paste once the page is interactive (the global paste listener attaches on hydration).
  const pasteText = (page: Page, text: string) =>
    page.waitForLoadState("networkidle").then(() =>
      page.evaluate((t) => {
        const dt = new DataTransfer();
        dt.setData("text", t);
        document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
      }, text),
    );
  const JWT =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzQyIiwibmFtZSI6IkFzaGEgUmFvIiwiaWF0IjoxNzMwNTAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.c2lnbmF0dXJl";

  test("a paste in the first instant after load (before the app is ready) isn't lost", async ({ page }) => {
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const dt = new DataTransfer();
        dt.setData("text", '{"early":true,"items":[1,2,3]}');
        document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
      });
    });
    await page.goto("/");
    await expect(page.locator("#work")).toContainText("early", { timeout: 20_000 });
  });

  test("an image file pasted on the page opens it as a file", async ({ page }) => {
    await page.goto("/");
    const b64 = readFileSync(fx("photo.jpg")).toString("base64");
    await page.waitForLoadState("networkidle");
    await page.evaluate((b) => {
      const dt = new DataTransfer();
      dt.items.add(new File([Uint8Array.from(atob(b), (c) => c.charCodeAt(0))], "photo.jpg", { type: "image/jpeg" }));
      window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
    }, b64);
    await expect(page.locator("#work")).toContainText("photo.jpg");
    await expect(page.locator("#work")).toContainText("1200 × 800");
  });
  test("JSON text is recognised, and 'Open in JSON Formatter' carries it into the panel", async ({ page }) => {
    await page.goto("/");
    await pasteText(page, '{"user":{"id":42,"name":"Asha Rao"}}');
    await expect(page.locator("#work")).toContainText("That's a JSON");
    await page
      .locator("#work")
      .getByRole("button", { name: /Format/ })
      .first()
      .click();
    await page
      .locator("#work")
      .getByRole("button", { name: /Open in JSON Formatter/ })
      .last()
      .click();
    await expect(page.locator("#panel")).toBeVisible();
    await expect(page.locator("#pnIn")).toHaveValue(/"Asha Rao"/);
  });
  test("a JWT is recognised, and Decode shows its claims", async ({ page }) => {
    await page.goto("/");
    await pasteText(page, JWT);
    await expect(page.locator("#work")).toContainText("That's a JWT token");
    await page.locator("#work").getByRole("button", { name: "Decode it" }).click();
    await expect(page.locator("#work")).toContainText("user_42");
    await expect(page.locator("#work")).toContainText("HS256");
  });
  test("a short sentence pasted into the composer stays in the composer", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="file"][hidden]').setInputFiles(gen("one-page.pdf"));
    await expect(page.locator("#work").getByText("What should we do?")).toBeVisible();
    const cmp = page.getByLabel("Tell KlipKit what to do");
    await cmp.focus();
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData("text", "make it smaller please");
      document.getElementById("cmp")!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
    });
    // not turned into a paste card: the thread doesn't gain a paste of this sentence
    await expect(page.locator("#work .paste, #work [data-paste]")).toHaveCount(0);
  });
});

/** Flow 5.8 — ⌘K synonyms from the spec. */
test("palette synonyms: shrink, jwt, bg, iphone", async ({ page, browserName, isMobile }) => {
  test.skip(isMobile, "keyboard shortcut is a desktop feature");
  await page.goto("/");
  await page.keyboard.press(browserName === "webkit" ? "Meta+k" : "Control+k");
  const input = page.locator("#pq");
  for (const [q, name] of [
    ["shrink", "Compress PDF"],
    ["jwt", "JWT Decoder"],
    ["bg", "Background Remover"],
    ["iphone", "HEIC to JPG"],
  ]) {
    await input.fill(q);
    await expect(page.locator(".plist .pi").first(), q).toContainText(name);
  }
  await page.keyboard.press("Escape");
  await expect(input).toBeHidden();
});

/** Flow 5.9 — the Pro voice demo streams the words, highlights them and sends. */
test("voice demo: with a file loaded, words stream into the composer, then it sends", async ({ page }) => {
  // As in the reference, the demo needs a file first ("Drop a file first, then speak.").
  await page.goto("/");
  await page.locator('input[type="file"][hidden]').setInputFiles(gen("one-page.pdf"));
  await expect(page.locator("#work").getByText("What should we do?")).toBeVisible();
  await page.getByRole("button", { name: "Voice command (Pro)" }).click();
  await page.locator("#tryVoice").click();
  const cmp = page.getByLabel("Tell KlipKit what to do");
  await expect(cmp).toHaveValue(/now protect/); // streaming in, word by word
  await expect(page.locator("#work .msg.user").last()).toContainText("now protect it with a password", {
    timeout: 15_000,
  });
  await expect(cmp).toHaveValue("");
});
