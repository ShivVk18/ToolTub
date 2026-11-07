import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";
import { gen, guard } from "./helpers";

/** Flow 5.6 — Plan → Run → Results, with the output itself checked (no faked results). */
const work = (page: Page) => page.locator("#work");
const composer = (page: Page) => page.getByLabel("Tell KlipKit what to do");
/** Busy blocks Send; a plan must always hand the workspace back. */
async function expectNotBusy(page: Page) {
  await composer(page).fill("what next");
  await expect(page.getByRole("button", { name: "Send", exact: true })).toBeEnabled();
}

async function dropOnHome(page: Page, path: string) {
  await page.goto("/");
  await page.locator('input[type="file"][hidden]').setInputFiles(path);
  await expect(work(page).getByText("What should we do?")).toBeVisible(); // the workspace has taken the file
}

async function runPlan(page: Page, text: string) {
  await composer(page).fill(text);
  await expect(composer(page)).toHaveValue(text);
  await composer(page).press("Enter");
  const run = work(page).locator(".card .run").last();
  await expect(run).toBeVisible();
  await run.click();
}

test.describe("Plan → Run → Results is real", () => {
  test("compress + split pages 1-5 on a real PDF gives a 5-page PDF you can download", async ({ page }) => {
    const g = guard(page);
    await dropOnHome(page, gen("twenty-pages.pdf"));
    await runPlan(page, "compress it and split pages 1-5");
    const row = work(page).locator(".rrow").last();
    await expect(row).toContainText("twenty-pages-compressed-pages-1-5.pdf", { timeout: 60_000 });
    const [dl] = await Promise.all([
      page.waitForEvent("download"),
      row.getByRole("button", { name: "Download" }).click(),
    ]);
    const bytes = readFileSync((await dl.path())!);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(5);
    // the size shown is the real size of what was downloaded
    const shownKB = Number((await row.locator(".fmeta").innerText()).match(/(\d+) KB/)?.[1]);
    expect(shownKB).toBe(Math.max(1, Math.round(bytes.length / 1e3))); // fmtSize: KB = 1000 bytes
    await expectNotBusy(page);
    g.assertClean();
  });

  test("steps that aren't built say so instead of pretending; 'password' on a PDF isn't the password generator", async ({
    page,
  }) => {
    await dropOnHome(page, gen("twenty-pages.pdf"));
    await composer(page).fill("protect it with a password");
    await composer(page).press("Enter");
    const card = work(page).locator(".card").last();
    await expect(card.locator(".step .tag")).toHaveText("Coming soon");
    await expect(card.locator(".run")).toBeDisabled();
    await expectNotBusy(page);
  });

  test("a step with its own tool offers to continue there with the file (PDF to Word)", async ({ page }) => {
    await dropOnHome(page, gen("twenty-pages.pdf"));
    await runPlan(page, "convert to word");
    const go = work(page).getByRole("button", { name: /Continue in PDF to Word/ });
    await expect(go).toBeVisible();
    await go.click();
    await expect(page).toHaveURL(/\/pdf-to-word$/);
    await expect(page.locator('[data-testid="file-chip"]:visible')).toContainText("twenty-pages.pdf");
  });

  test("the sample PDF is a real file, so its plan runs for real", async ({ page }) => {
    await page.goto("/");
    await page.locator("#samples .chip", { hasText: "PDF" }).click();
    await expect(work(page).getByText("What should we do?")).toBeVisible();
    await runPlan(page, "split pages 1-5");
    const row = work(page).locator(".rrow").last();
    await expect(row).toContainText("-pages-1-5.pdf", { timeout: 60_000 });
    const [dl] = await Promise.all([
      page.waitForEvent("download"),
      row.getByRole("button", { name: "Download" }).click(),
    ]);
    expect((await PDFDocument.load(readFileSync((await dl.path())!))).getPageCount()).toBe(5);
  });

  /** Decodes the downloaded bytes in the browser: proves it's a valid image and gives its real size. */
  async function decode(page: Page, bytes: Buffer, type: string) {
    return page.evaluate(
      async ([b64, t]) => {
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const bmp = await createImageBitmap(new Blob([bin], { type: t }));
        return { w: bmp.width, h: bmp.height };
      },
      [bytes.toString("base64"), type] as const,
    );
  }

  test("§4 Resize: 'resize for instagram' fits within 1080×1350 and keeps the aspect ratio", async ({ page }) => {
    await dropOnHome(page, gen("photo-1600x1200.png"));
    await runPlan(page, "resize for instagram");
    const row = work(page).locator(".rrow").last();
    await expect(row).toContainText("-resized", { timeout: 60_000 });
    const [dl] = await Promise.all([
      page.waitForEvent("download"),
      row.getByRole("button", { name: "Download" }).click(),
    ]);
    const { w, h } = await decode(page, readFileSync((await dl.path())!), "image/png");
    expect(w).toBeLessThanOrEqual(1080);
    expect(h).toBeLessThanOrEqual(1350);
    expect(Math.abs(w / h - 1600 / 1200)).toBeLessThan(0.01);
    expect(w).toBe(1080); // fits the width exactly (the limiting side)
  });
});
