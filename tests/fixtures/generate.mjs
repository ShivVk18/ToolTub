// Builds the large/derived fixtures into tests/fixtures/generated (gitignored).
// Pure Node + pdf-lib, plus Playwright's Chromium for WebP encoding. Safe to run repeatedly.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { PDFDocument, PDFHexString, StandardFonts } from "pdf-lib";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "generated");
mkdirSync(out, { recursive: true });
const put = (name, data) => writeFileSync(join(out, name), data);

// ---- PNG encoder (RGBA, no dependencies) ----
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function png(w, h, pixel) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a] = pixel(x, y); raw.set([r, g, b, a], y * (w * 4 + 1) + 1 + x * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
// Left half fully transparent, right half opaque gradient: easy to assert alpha survives.
put("transparent.png", png(256, 128, (x, y) => (x < 128 ? [0, 0, 0, 0] : [x, y * 2, 200, 255])));
put("tiny-1x1.png", png(1, 1, () => [255, 0, 0, 255]));

// ---- PDFs ----
async function textPdf(pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) doc.addPage([595, 842]).drawText(`KlipKit fixture page ${i} of ${pages}`, { x: 72, y: 760, size: 18, font });
  return doc.save();
}
put("one-page.pdf", await textPdf(1));
put("twenty-pages.pdf", await textPdf(20));
{
  const doc = await PDFDocument.create();
  const jpg = readFileSync(join(here, "large-6000x4000.jpg"));
  for (let i = 0; i < 6; i++) { const img = await doc.embedJpg(jpg); doc.addPage([842, 595]).drawImage(img, { x: 0, y: 0, width: 842, height: 595 }); }
  put("image-heavy.pdf", await doc.save());
}
// Text PDF for PDF to Word: the server test expects this sentence in the .docx.
{
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  ["KlipKit test document", "This paragraph should become editable text in Word.", "Second line with numbers 12345."].forEach((line, i) =>
    page.drawText(line, { x: 72, y: 760 - i * 28, size: 14, font }),
  );
  put("text.pdf", await doc.save());
}
// Declares Standard encryption in the trailer, so PDF readers (pdf-lib included) treat it as password-protected.
{
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]);
  const ctx = doc.context;
  const pad = PDFHexString.of("28BF4E5E4E758A4164004E56FFFA01082E2E00B6D0683E802F0CA9FE6453697A");
  ctx.trailerInfo.Encrypt = ctx.register(ctx.obj({ Filter: "Standard", V: 1, R: 2, Length: 40, P: -4, O: pad, U: pad }));
  ctx.trailerInfo.ID = ctx.obj([PDFHexString.of("4B6C69704B6974"), PDFHexString.of("4B6C69704B6974")]);
  put("protected.pdf", await doc.save({ useObjectStreams: false }));
}
// Plain text with a .pdf name: must be rejected as "not a readable PDF".
put("fake.pdf", "This is plain text, not a PDF.\n");

// ---- JSON ----
put("valid.json", JSON.stringify({ name: "KlipKit", tools: 78, nested: { ok: true, list: [1, 2, 3] } }));
// Trailing comma at the end of line 6 → JSON.parse reports the error on line 7.
put("invalid-line7.json", '{\n  "a": 1,\n  "b": 2,\n  "c": 3,\n  "d": 4,\n  "e": 5,\n}\n');
{
  const rows = [];
  let size = 2;
  for (let i = 0; size < 5 * 1024 * 1024; i++) { const r = JSON.stringify({ id: i, name: `item-${i}`, tags: ["a", "b", "c"], price: i * 1.5, active: i % 2 === 0 }); rows.push(r); size += r.length + 1; }
  put("huge-5mb.json", `[${rows.join(",")}]`);
}

// ---- WebP (needs a real encoder → Chromium canvas) ----
if (!existsSync(join(out, "photo.webp"))) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const b64 = readFileSync(join(here, "photo.jpg")).toString("base64");
  const webp = await page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    c.getContext("2d").drawImage(bmp, 0, 0);
    const blob = await c.convertToBlob({ type: "image/webp", quality: 0.9 });
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, b64);
  put("photo.webp", Buffer.from(webp));
  await browser.close();
}
console.log("fixtures: generated into tests/fixtures/generated");
