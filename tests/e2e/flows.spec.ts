import { test, expect, type Page } from "@playwright/test";

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
