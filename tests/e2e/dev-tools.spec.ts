import { test, expect } from "@playwright/test";
import { alert, byTestId, downloadFrom, guard, output, pdfText, primary } from "./helpers";

/** Diff Checker, HTML Playground, Text to Speech and Résumé Builder end to end (outputs checked). */

test.describe("Diff Checker", () => {
  test("counts changes, highlights the changed words, ignore options, unified patch", async ({ page }) => {
    const g = guard(page);
    await page.goto("/diff-checker");
    const [a, b] = [page.getByLabel("Original"), page.getByLabel("Changed")];
    await a.fill("one\ntwo apples\nthree");
    await b.fill("one\ntwo pears\nthree\nfour");
    await expect(byTestId(page, "diff-stats")).toHaveText("1 changed · 1 added · 0 removed");
    const mod = byTestId(page, "diff-table").locator('tr[data-type="mod"]');
    await expect(mod.locator("span", { hasText: "apples" })).toBeVisible();
    await expect(mod.locator("span", { hasText: "pears" })).toBeVisible();
    await a.fill("Hello  World");
    await b.fill("hello world");
    await expect(byTestId(page, "diff-stats")).toHaveText("1 changed · 0 added · 0 removed");
    await page.getByLabel("Ignore whitespace").check();
    await page.getByLabel("Ignore case").check();
    await expect(byTestId(page, "diff-stats")).toHaveText("No differences.");
    await page.getByLabel("Ignore case").uncheck();
    await page.getByLabel("View").selectOption("unified");
    await expect(byTestId(page, "diff-unified")).toContainText("-Hello  World");
    await expect(byTestId(page, "diff-unified")).toContainText("+hello world");
    g.assertNoUpload();
    g.assertClean();
  });
});

test.describe("HTML Playground", () => {
  test("renders in a sandbox and captures console output", async ({ page, browserName }) => {
    await page.goto("/html-playground");
    const frame = page.frameLocator('[data-testid="pg-preview"]');
    await expect(frame.locator("h1")).toHaveText("Hello, KlipKit");
    await frame.locator("#b").click();
    await expect(byTestId(page, "pg-console")).toContainText("clicked");
    await page.getByLabel("HTML").fill("<p id='x'>changed</p>");
    await page.getByLabel("JavaScript").fill("console.log('sum', 2 + 3); undefinedFn();");
    await expect(frame.locator("#x")).toHaveText("changed");
    await expect(byTestId(page, "pg-console")).toContainText("sum 5");
    // WebKit hides error details from opaque-origin (sandboxed) frames; it gets a clear generic line instead
    await expect(byTestId(page, "pg-console")).toContainText(
      browserName === "webkit" ? "Script error (details hidden" : "undefinedFn",
    );
    // the sandbox has no same-origin access: it can't read the page's storage
    const blocked = await frame.locator("body").evaluate(() => {
      try {
        return typeof window.parent.document;
      } catch {
        return "blocked";
      }
    });
    expect(blocked).toBe("blocked");
  });
});

test.describe("Text to Speech", () => {
  test("reads the text with the chosen rate and highlights the current word", async ({ page }) => {
    // headless browsers have no voices: stand in a minimal speechSynthesis that fires boundary events
    await page.addInitScript(() => {
      const spoken: { text: string; rate: number }[] = [];
      (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
      const synth = {
        getVoices: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        speak: (u: SpeechSynthesisUtterance) => {
          spoken.push({ text: u.text, rate: u.rate });
          setTimeout(() => u.onboundary?.({ charIndex: 8, charLength: 5 } as SpeechSynthesisEvent), 50);
          setTimeout(() => u.onend?.({} as SpeechSynthesisEvent), 1500);
        },
      };
      Object.defineProperty(window, "speechSynthesis", { value: synth });
    });
    await page.goto("/text-to-speech");
    await page.getByLabel("Text to read").fill("KlipKit reads aloud");
    await page.getByLabel("Speed").fill("1.5");
    await primary(page).click();
    await expect(byTestId(page, "tts-reading").locator("mark")).toHaveText("reads");
    expect(await page.evaluate(() => (window as unknown as { __spoken: unknown[] }).__spoken)).toEqual([
      { text: "KlipKit reads aloud", rate: 1.5 },
    ]);
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  });
});

test.describe("Résumé Builder", () => {
  test("makes a text PDF with the entered details; the draft survives a reload", async ({ page }) => {
    const g = guard(page);
    await page.goto("/resume-builder");
    await page.getByLabel("Full name").fill("Rohan Mehta");
    await page.getByLabel("Job 1 role").fill("Staff Engineer");
    await page.getByLabel("Template").selectOption("classic");
    await primary(page).click();
    await expect(byTestId(page, "result-row")).toBeVisible({ timeout: 30_000 });
    const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("Rohan-Mehta-resume.pdf");
    const text = (await pdfText(page, bytes)).pages.join(" ");
    for (const s of ["Rohan Mehta", "Staff Engineer", "EXPERIENCE", "EDUCATION", "Figma"]) expect(text).toContain(s);
    await page.reload();
    await expect(page.getByLabel("Full name")).toHaveValue("Rohan Mehta");
    await page.getByLabel("Full name").fill("रोहन");
    await primary(page).click();
    await expect(alert(page)).toContainText("Latin letters");
    await page.getByLabel("Full name").fill("");
    await expect(primary(page)).toBeDisabled();
    g.assertNoUpload();
  });
});
