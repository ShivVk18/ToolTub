import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alert, byTestId, fx, gen, output, primary, upload, workspace } from "./helpers";

/** Hallmark F7: file tools validate on selection, show the file as a chip, offer a retry, and end in a result row. */
test.describe("F7: file states on file tools", () => {
  const notes = join(process.cwd(), "test-results", "notes.txt");
  test.beforeAll(() => {
    mkdirSync("test-results", { recursive: true });
    writeFileSync(notes, "not an image");
  });

  test("a wrong file type is rejected on selection, with a way to choose another", async ({ page }) => {
    await page.goto("/image-compressor");
    await upload(page, notes);
    // no click on the primary action needed: the error is immediate
    await expect(alert(page)).toContainText("notes.txt");
    await expect(alert(page)).toContainText(/JPG|PNG|WebP/);
    await expect(primary(page)).toBeDisabled();
    await expect(alert(page).getByRole("button", { name: "Choose another file" })).toBeVisible();

    await page.goto("/compress-pdf");
    await upload(page, fx("photo.jpg"));
    await expect(alert(page)).toContainText(/photo\.jpg isn't a PDF/);
    await expect(primary(page)).toBeDisabled();
  });

  test("the picked file shows as a chip with its name, size and Change", async ({ page }) => {
    await page.goto("/compress-pdf");
    await upload(page, gen("twenty-pages.pdf"));
    const chip = byTestId(page, "file-chip");
    await expect(chip).toContainText("twenty-pages.pdf");
    await expect(chip).toContainText(/\d+(\.\d+)? (KB|MB)/);
    const pill = await chip.evaluate(
      (e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) >= e.getBoundingClientRect().height / 2 - 1,
    );
    expect(pill).toBe(true);
    await chip.getByRole("button", { name: "Change" }).click();
    await expect(byTestId(page, "dropzone")).toBeVisible();
    await expect(primary(page)).toBeDisabled();
  });

  test("a processing error offers Choose another file, which clears the file", async ({ page }) => {
    await page.goto("/compress-pdf");
    await upload(page, gen("fake.pdf"));
    await primary(page).click();
    await expect(alert(page)).toContainText(/isn't a readable PDF/i);
    await alert(page).getByRole("button", { name: "Choose another file" }).click();
    await expect(byTestId(page, "dropzone")).toBeVisible();
    await expect(workspace(page).getByRole("alert")).toHaveCount(0);
  });

  test("success ends in a result row: before → after and the Download pill", async ({ page }) => {
    for (const [path, file] of [
      ["/compress-pdf", gen("twenty-pages.pdf")],
      ["/image-compressor", fx("photo.jpg")],
    ]) {
      await page.goto(path);
      await upload(page, file);
      await primary(page).click();
      const row = output(page).locator('[data-testid="result-row"]');
      await expect(row).toContainText("→", { timeout: 60_000 });
      await expect(row.locator('[data-testid="download"]')).toBeVisible();
    }
  });
});
