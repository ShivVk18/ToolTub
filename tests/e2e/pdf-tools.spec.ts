import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, PDFName, PDFDict, degrees, StandardFonts } from "pdf-lib";
import { unzipSync } from "fflate";
import {
  alert,
  byTestId,
  downloadFrom,
  fx,
  gen,
  guard,
  inspectImage,
  output,
  pdfText,
  primary,
  upload,
} from "./helpers";

/**
 * The PDF tools end to end, with their real outputs checked: page counts and order (inputs have distinct page
 * sizes), rotation, real encryption, rendered image sizes and text read back with pdf.js. Inputs are built here
 * with pdf-lib so every edge case is explicit. Everything must run on the device: no request carries a body.
 */
const TMP = join(process.cwd(), "test-results", "pdf-inputs");
mkdirSync(TMP, { recursive: true });

const A4: [number, number] = [595, 842];
const LETTER: [number, number] = [612, 792];
const A5: [number, number] = [420, 595];

/** A PDF whose pages have the given sizes and the text "Page N"; optional rotation per page. */
async function makePdf(name: string, sizes: [number, number][], rotate: number[] = []) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  sizes.forEach(([w, h], i) => {
    const p = doc.addPage([w, h]);
    p.drawText(`Page ${i + 1}`, { x: 40, y: h - 60, size: 24, font });
    if (rotate[i]) p.setRotation(degrees(rotate[i]));
  });
  const path = join(TMP, name);
  writeFileSync(path, await doc.save());
  return path;
}
const load = (b: Buffer) => PDFDocument.load(b);
const sizesOf = async (b: Buffer) =>
  (await load(b))
    .getPages()
    .map((p) => p.getSize())
    .map(({ width, height }) => [Math.round(width), Math.round(height)]);

/** photo.jpg with an EXIF Orientation=6 (rotate 90° CW) segment inserted, like a phone photo taken upright. */
function rotatedJpeg() {
  const src = readFileSync(fx("photo.jpg"));
  const tiff = Buffer.from([0x4d, 0x4d, 0, 42, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0]);
  const body = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 255]), body]);
  const path = join(TMP, "rotated-exif.jpg");
  writeFileSync(path, Buffer.concat([src.subarray(0, 2), app1, src.subarray(2)]));
  return path;
}

const done = (page: Page) => expect(output(page)).toBeVisible({ timeout: 60_000 });

test.describe("Merge PDF", () => {
  test("merges in the chosen order; reordering changes the output; nothing uploaded", async ({ page }) => {
    const g = guard(page);
    const a = await makePdf("a-letter.pdf", [LETTER]);
    const b = await makePdf("b-a5x3.pdf", [A5, A5, A5]);
    await page.goto("/merge-pdf");
    await expect(primary(page)).toBeDisabled();
    await upload(page, [a, b]);
    await expect(byTestId(page, "file-list")).toContainText("2 PDFs");
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("4 pages");
    const first = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(first.name).toBe("merged.pdf");
    let bytes = first.bytes;
    expect(await sizesOf(bytes)).toEqual([LETTER, A5, A5, A5]);
    // move the A5 file to the top
    await page.getByRole("button", { name: "Move b-a5x3.pdf up" }).click();
    await primary(page).click();
    await done(page);
    ({ bytes } = await downloadFrom(page, () => byTestId(page, "download").click()));
    expect(await sizesOf(bytes)).toEqual([A5, A5, A5, LETTER]);
    g.assertNoUpload();
    g.assertClean();
  });

  test("one file isn't enough; removing a file updates the list", async ({ page }) => {
    const a = await makePdf("one.pdf", [A4]);
    const b = await makePdf("two.pdf", [A4]);
    await page.goto("/merge-pdf");
    await upload(page, [a, b]);
    await page.getByRole("button", { name: "Remove two.pdf" }).click();
    await expect(byTestId(page, "file-list")).toContainText("1 PDF ");
    await expect(primary(page)).toBeDisabled();
  });

  test("a password-protected or broken file is named in the error", async ({ page }) => {
    await page.goto("/merge-pdf");
    await upload(page, [gen("one-page.pdf"), gen("protected.pdf")]);
    await primary(page).click();
    await expect(alert(page)).toContainText(/"protected\.pdf" is password-protected/);
    await page.goto("/merge-pdf");
    await upload(page, [gen("one-page.pdf"), gen("fake.pdf")]);
    await primary(page).click();
    await expect(alert(page)).toContainText(/"fake\.pdf" isn't a readable PDF/);
  });
});

test.describe("Split PDF", () => {
  test("extracts 1-3, 5, 8- from 20 pages into one 17-page PDF", async ({ page }) => {
    const g = guard(page);
    await page.goto("/split-pdf");
    await upload(page, gen("twenty-pages.pdf"));
    await page.getByLabel("Pages", { exact: true }).fill("1-3, 5, 8-");
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("17 of 20 pages");
    const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("twenty-pages-pages-1-3_5_8-20.pdf");
    expect((await load(bytes)).getPageCount()).toBe(17);
    g.assertNoUpload();
  });

  test("every page as its own PDF comes as a ZIP of single pages, in order", async ({ page }) => {
    const src = await makePdf("three.pdf", [A4, LETTER, A5]);
    await page.goto("/split-pdf");
    await upload(page, src);
    await page.getByLabel("Split").selectOption("every");
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("3 PDFs from 3 pages");
    const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("three-split.zip");
    const files = unzipSync(new Uint8Array(bytes));
    expect(Object.keys(files).sort()).toEqual(["three-page-1.pdf", "three-page-2.pdf", "three-page-3.pdf"]);
    expect(await sizesOf(Buffer.from(files["three-page-2.pdf"]))).toEqual([LETTER]);
  });

  test("one PDF per range; a reversed range comes out reversed", async ({ page }) => {
    const src = await makePdf("three-b.pdf", [A4, LETTER, A5]);
    await page.goto("/split-pdf");
    await upload(page, src);
    await page.getByLabel("Split").selectOption("ranges");
    await page.getByLabel("Pages", { exact: true }).fill("3-1, 2");
    await primary(page).click();
    await done(page);
    const files = unzipSync(new Uint8Array((await downloadFrom(page, () => byTestId(page, "download").click())).bytes));
    expect(await sizesOf(Buffer.from(files["three-b-pages-3-1.pdf"]))).toEqual([A5, LETTER, A4]);
    expect(await sizesOf(Buffer.from(files["three-b-page-2.pdf"]))).toEqual([LETTER]);
  });

  test("edge cases: pages past the end, junk, protected file", async ({ page }) => {
    await page.goto("/split-pdf");
    await upload(page, gen("twenty-pages.pdf"));
    await page.getByLabel("Pages", { exact: true }).fill("30");
    await primary(page).click();
    await expect(alert(page)).toContainText("only 20 pages");
    await page.goto("/split-pdf");
    await upload(page, gen("twenty-pages.pdf"));
    await page.getByLabel("Pages", { exact: true }).fill("first few");
    await primary(page).click();
    await expect(alert(page)).toContainText("isn't a page or range");
    await page.goto("/split-pdf");
    await upload(page, gen("protected.pdf"));
    await primary(page).click();
    await expect(alert(page)).toContainText("password-protected");
  });
});

test.describe("JPG to PDF", () => {
  test("JPG + transparent PNG + WebP → 3 A4 pages; landscape photos get landscape pages", async ({ page }) => {
    const g = guard(page);
    await page.goto("/jpg-to-pdf");
    await upload(page, [fx("photo.jpg"), gen("transparent.png"), gen("photo.webp")]);
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("3 pages");
    const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("images.pdf");
    const sizes = await sizesOf(bytes);
    expect(sizes[0]).toEqual([842, 595]); // photo.jpg is 1200×800 → landscape A4
    for (const s of sizes) expect([s[0], s[1]].sort()).toEqual([595, 842]);
    g.assertNoUpload();
  });

  test("'same as the image' with no margin: page = image size; EXIF rotation is applied", async ({ page }) => {
    await page.goto("/jpg-to-pdf");
    await upload(page, [fx("photo.jpg"), rotatedJpeg()]);
    await page.getByLabel("Page size").selectOption("fit");
    await page.getByLabel("Margin").selectOption("0");
    await primary(page).click();
    await done(page);
    const { bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(await sizesOf(bytes)).toEqual([
      [1200, 800],
      [800, 1200], // the phone photo stands upright
    ]);
  });

  test("a corrupted image is named in the error", async ({ page }) => {
    await page.goto("/jpg-to-pdf");
    await upload(page, [fx("photo.jpg"), fx("corrupted.jpg")]);
    await primary(page).click();
    await expect(alert(page)).toContainText(`"corrupted.jpg" isn't an image we can read`);
  });
});

test.describe("PDF Watermark", () => {
  test("adds the text to every page, readable by a PDF reader, also on rotated pages", async ({ page }) => {
    const g = guard(page);
    const src = await makePdf("rot.pdf", [A4, A4, LETTER], [0, 90, 270]);
    await page.goto("/pdf-watermark");
    await upload(page, src);
    await page.getByLabel("Text", { exact: true }).fill("DRAFT 2026");
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("Watermarked 3 pages");
    const { bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    const { pages } = await pdfText(page, bytes);
    for (const t of pages) expect(t).toContain("DRAFT 2026");
    // the watermark sits on the visible page, not off-canvas: check its position with pdf.js on the rotated page
    const inside = await page.evaluate(async (b64) => {
      const lib = await import("/vendor/pdfjs/pdf.min.mjs" as string);
      lib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
      const doc = await lib.getDocument({ data: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) }).promise;
      const out: boolean[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i);
        const vp = p.getViewport({ scale: 1 });
        const tc = await p.getTextContent();
        const it = tc.items.find((x: { str: string }) => x.str.includes("DRAFT"));
        const m = vp.transform;
        const [tx, ty] = [it.transform[4], it.transform[5]];
        const [x, y] = [m[0] * tx + m[2] * ty + m[4], m[1] * tx + m[3] * ty + m[5]];
        out.push(x >= 0 && x <= vp.width && y >= 0 && y <= vp.height);
      }
      return out;
    }, bytes.toString("base64"));
    expect(inside).toEqual([true, true, true]);
    g.assertNoUpload();
  });

  test("only the chosen pages; non-Latin text gets a clear message", async ({ page }) => {
    await page.goto("/pdf-watermark");
    await upload(page, gen("twenty-pages.pdf"));
    await page.getByLabel("Pages", { exact: true }).fill("odd");
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("Watermarked 10 pages");
    await page.getByLabel("Text", { exact: true }).fill("गोपनीय");
    await primary(page).click();
    await expect(alert(page)).toContainText("Latin letters");
  });
});

test.describe("Protect PDF", () => {
  test("AES-256: opens with the password, not without; no upload", async ({ page }) => {
    const g = guard(page);
    await page.goto("/protect-pdf");
    await upload(page, gen("one-page.pdf"));
    await page.getByLabel("Password", { exact: true }).fill("s3cret pass");
    await page.getByLabel("Repeat password").fill("s3cret pass");
    await primary(page).click();
    await expect(output(page)).toContainText("AES-256", { timeout: 60_000 });
    const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("one-page-protected.pdf");
    expect(bytes.toString("latin1")).toMatch(/\/Encrypt/);
    expect(bytes.toString("latin1")).toMatch(/\/V 5/); // AES-256
    await expect(load(bytes)).rejects.toThrow(/encrypted/i);
    expect((await pdfText(page, bytes, "s3cret pass")).pages).toHaveLength(1);
    await expect(pdfText(page, bytes, "wrong")).rejects.toThrow();
    g.assertNoUpload();
    g.assertClean();
  });

  test("mismatched passwords block the button; an already protected PDF is refused", async ({ page }) => {
    await page.goto("/protect-pdf");
    await upload(page, gen("one-page.pdf"));
    await page.getByLabel("Password", { exact: true }).fill("abc12345");
    await page.getByLabel("Repeat password").fill("abc12346");
    await expect(page.getByText("The passwords don't match.")).toBeVisible();
    await expect(primary(page)).toBeDisabled();
    await page.goto("/protect-pdf");
    await upload(page, gen("protected.pdf"));
    await page.getByLabel("Password", { exact: true }).fill("x");
    await page.getByLabel("Repeat password").fill("x");
    await primary(page).click();
    await expect(alert(page)).toContainText("password-protected");
  });
});

test.describe("Organize PDF", () => {
  test("delete, rotate and reorder pages from the preview grid", async ({ page }) => {
    const g = guard(page);
    const src = await makePdf("org.pdf", [A4, LETTER, A5]);
    await page.goto("/organize-pdf");
    await upload(page, src);
    await expect(byTestId(page, "page-grid").locator("img")).toHaveCount(3, { timeout: 30_000 });
    await expect(primary(page)).toBeDisabled(); // nothing changed yet
    await page.getByRole("button", { name: "Delete page 2" }).click();
    await page.getByRole("button", { name: "Rotate page 1 right" }).click();
    await page.getByRole("button", { name: "Move page 2 left" }).click(); // A5 to the front
    await primary(page).click();
    await done(page);
    const doc = await load((await downloadFrom(page, () => byTestId(page, "download").click())).bytes);
    expect(doc.getPages().map((p) => [Math.round(p.getWidth()), p.getRotation().angle])).toEqual([
      [A5[0], 0],
      [A4[0], 90],
    ]);
    // undo restores the previous state
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(byTestId(page, "page-grid").locator("li")).toHaveCount(2);
    g.assertNoUpload();
  });

  test("the last page can't be deleted; protected PDFs explain themselves", async ({ page }) => {
    await page.goto("/organize-pdf");
    await upload(page, gen("one-page.pdf"));
    await expect(page.getByRole("button", { name: "Delete page 1" })).toBeDisabled();
    await page.goto("/organize-pdf");
    await upload(page, gen("protected.pdf"));
    await expect(alert(page)).toContainText("password-protected");
  });
});

test.describe("Sign PDF", () => {
  test("typed signature placed on the chosen page as an image", async ({ page }) => {
    const g = guard(page);
    const src = await makePdf("contract.pdf", [A4, A4]);
    await page.goto("/sign-pdf");
    await upload(page, src);
    await expect(primary(page)).toBeDisabled();
    await page.getByRole("tab", { name: "Type" }).click();
    await page.getByLabel("Type your name").fill("Asha Rao");
    await page.getByLabel("Page").fill("2");
    await byTestId(page, "sign-preview").click({ position: { x: 100, y: 100 } });
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("Signed on page 2");
    const doc = await load((await downloadFrom(page, () => byTestId(page, "download").click())).bytes);
    const xobjects = (i: number) => {
      const res = doc.getPage(i).node.Resources();
      const x = res?.lookup(PDFName.of("XObject"));
      return x instanceof PDFDict ? x.keys().length : 0;
    };
    expect(xobjects(0)).toBe(0);
    expect(xobjects(1)).toBe(1);
    g.assertNoUpload();
  });

  test("a drawn signature works too", async ({ page }) => {
    await page.goto("/sign-pdf");
    await upload(page, gen("one-page.pdf"));
    const pad = byTestId(page, "signature-pad");
    const box = (await pad.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++)
      await page.mouse.move(box.x + 20 + i * 20, box.y + box.height / 2 + (i % 2 ? -15 : 15));
    await page.mouse.up();
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("Signed on page 1");
  });
});

test.describe("PDF to JPG", () => {
  test("every page at 72 dpi → ZIP of JPGs the size of the pages", async ({ page }) => {
    const g = guard(page);
    const src = await makePdf("render.pdf", [A4, LETTER]);
    await page.goto("/pdf-to-jpg");
    await upload(page, src);
    await page.getByLabel("Quality").selectOption("72");
    await primary(page).click();
    await done(page);
    const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("render-images.zip");
    const files = unzipSync(new Uint8Array(bytes));
    expect(Object.keys(files).sort()).toEqual(["render-page-1.jpg", "render-page-2.jpg"]);
    expect(await inspectImage(page, Buffer.from(files["render-page-1.jpg"]))).toMatchObject({
      type: "image/jpeg",
      width: 595,
      height: 842,
    });
    expect(await inspectImage(page, Buffer.from(files["render-page-2.jpg"]))).toMatchObject({
      width: 612,
      height: 792,
    });
    g.assertNoUpload();
  });

  test("one page as PNG at 150 dpi; protected PDFs are refused", async ({ page }) => {
    await page.goto("/pdf-to-jpg");
    await upload(page, gen("twenty-pages.pdf"));
    await page.getByLabel("Format").selectOption("image/png");
    await page.getByLabel("Pages", { exact: true }).fill("2");
    await primary(page).click();
    await done(page);
    const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("twenty-pages-page-2.png");
    const img = await inspectImage(page, bytes);
    expect(img.type).toBe("image/png");
    await page.goto("/pdf-to-jpg");
    await upload(page, gen("protected.pdf"));
    await expect(alert(page)).toContainText("password-protected");
  });
});

test.describe("Watermark: logo and page numbers", () => {
  test("page numbers 'Page n of N' on every page, readable by a PDF reader", async ({ page }) => {
    const src = await makePdf("num.pdf", [A4, A4, LETTER, A5]);
    await page.goto("/pdf-watermark");
    await upload(page, src);
    await page.getByLabel("Add", { exact: true }).selectOption("numbers");
    await page.getByLabel("Format").selectOption("page n of N");
    await primary(page).click();
    await done(page);
    await expect(output(page)).toContainText("Numbered 4 pages");
    const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("num-numbered.pdf");
    const { pages } = await pdfText(page, bytes);
    pages.forEach((t, i) => expect(t).toContain(`Page ${i + 1} of 4`));
  });

  test("a PNG logo is drawn on the chosen pages; a non-image logo is refused", async ({ page }) => {
    const src = await makePdf("logo.pdf", [A4, A4]);
    await page.goto("/pdf-watermark");
    await upload(page, src);
    await page.getByLabel("Add", { exact: true }).selectOption("image");
    await expect(primary(page)).toBeDisabled();
    await page.getByLabel("Logo", { exact: true }).setInputFiles(gen("transparent.png"));
    await page.getByLabel("Pages", { exact: true }).fill("2");
    await primary(page).click();
    await done(page);
    const doc = await load((await downloadFrom(page, () => byTestId(page, "download").click())).bytes);
    const xo = (i: number) => {
      const x = doc.getPage(i).node.Resources()?.lookup(PDFName.of("XObject"));
      return x instanceof PDFDict ? x.keys().length : 0;
    };
    expect([xo(0), xo(1)]).toEqual([0, 1]);
    await page.getByLabel("Logo", { exact: true }).setInputFiles(gen("fake.pdf"));
    await primary(page).click();
    await expect(alert(page)).toContainText("PNG or JPG");
  });
});

test.describe("Unlock PDF", () => {
  test("protect → unlock round trip; wrong password and unprotected files explain themselves", async ({ page }) => {
    const g = guard(page);
    await page.goto("/protect-pdf");
    await upload(page, gen("one-page.pdf"));
    await page.getByLabel("Password", { exact: true }).fill("päss wörd!");
    await page.getByLabel("Repeat password").fill("päss wörd!");
    await primary(page).click();
    await expect(output(page)).toContainText("AES-256", { timeout: 60_000 });
    const locked = await downloadFrom(page, () => byTestId(page, "download").click());
    const lockedPath = join(TMP, "locked.pdf");
    writeFileSync(lockedPath, locked.bytes);

    await page.goto("/protect-pdf");
    await page.getByRole("tab", { name: "Remove a password" }).click();
    await upload(page, lockedPath);
    await page.getByLabel("Current password").fill("wrong");
    await primary(page).click();
    await expect(alert(page)).toContainText("password is wrong", { timeout: 60_000 });

    await page.goto("/protect-pdf");
    await page.getByRole("tab", { name: "Remove a password" }).click();
    await upload(page, lockedPath);
    await page.getByLabel("Current password").fill("päss wörd!");
    await primary(page).click();
    await expect(output(page)).toContainText("Unlocked", { timeout: 60_000 });
    const { name, bytes } = await downloadFrom(page, () => byTestId(page, "download").click());
    expect(name).toBe("locked-unlocked.pdf");
    expect((await load(bytes)).getPageCount()).toBe(1); // opens without a password

    await page.goto("/protect-pdf");
    await page.getByRole("tab", { name: "Remove a password" }).click();
    await upload(page, gen("one-page.pdf"));
    await page.getByLabel("Current password").fill("x");
    await primary(page).click();
    await expect(alert(page)).toContainText("isn't password-protected");
    g.assertNoUpload();
  });
});

test.describe("Fill & Sign: form fields", () => {
  test("fills text, checkbox and dropdown fields; flatten locks them", async ({ page }) => {
    const doc = await PDFDocument.create();
    const p = doc.addPage(A4);
    const form = doc.getForm();
    form.createTextField("full_name").addToPage(p, { x: 50, y: 700, width: 300, height: 24 });
    form.createCheckBox("agree").addToPage(p, { x: 50, y: 650, width: 16, height: 16 });
    const dd = form.createDropdown("city");
    dd.addOptions(["Bengaluru", "Delhi", "Mumbai"]);
    dd.addToPage(p, { x: 50, y: 600, width: 200, height: 24 });
    const path = join(TMP, "form.pdf");
    writeFileSync(path, await doc.save());

    await page.goto("/sign-pdf");
    await upload(page, path);
    const fields = byTestId(page, "form-fields");
    await expect(fields).toContainText("Form fields (3)");
    await fields.getByLabel("full_name").fill("Asha Rao");
    await fields.getByLabel("agree").check();
    await fields.getByLabel("city").selectOption("Delhi");
    await primary(page).click(); // no signature: just save the filled form
    await done(page);
    await expect(output(page)).toContainText("3 fields filled");
    let out = await load((await downloadFrom(page, () => byTestId(page, "download").click())).bytes);
    expect(out.getForm().getTextField("full_name").getText()).toBe("Asha Rao");
    expect(out.getForm().getCheckBox("agree").isChecked()).toBe(true);
    expect(out.getForm().getDropdown("city").getSelected()).toEqual(["Delhi"]);

    await fields.getByLabel(/Lock the answers/).check();
    await primary(page).click();
    await done(page);
    const flat = (await downloadFrom(page, () => byTestId(page, "download").click())).bytes;
    out = await load(flat);
    expect(out.getForm().getFields()).toHaveLength(0);
    expect((await pdfText(page, flat)).pages[0]).toContain("Asha Rao");

    await fields.getByLabel("full_name").fill("आशा");
    await primary(page).click();
    await expect(alert(page)).toContainText("only Latin letters");
  });
});
