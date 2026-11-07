import { test, expect } from "@playwright/test";
import { fx, gen } from "./helpers";

/** Flow 5.5 — a dropped file's card shows correct metadata. */
test.describe("drop flow: file card metadata", () => {
  const load = async (page: import("@playwright/test").Page, path: string) => {
    await page.goto("/");
    await page.locator('input[type="file"][hidden]').setInputFiles(path);
    await expect(page.locator("#work").getByText("What should we do?")).toBeVisible();
  };
  test("PDF page count, also for PDFs whose pages are in compressed object streams", async ({ page }) => {
    await load(page, gen("twenty-pages.pdf")); // pdf-lib output: page objects live in object streams
    await expect(page.locator("#work")).toContainText("20 pages");
    await expect(page.locator("#work")).toContainText("a 20-page PDF");
  });
  test("image dimensions", async ({ page }) => {
    await load(page, fx("photo.jpg"));
    await expect(page.locator("#work")).toContainText("1200 × 800");
  });
  test("several PDFs suggest Merge", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="file"][hidden]').setInputFiles([gen("one-page.pdf"), gen("twenty-pages.pdf")]);
    await expect(page.locator("#work").getByRole("button", { name: /Merge/ })).toBeVisible();
  });
});
