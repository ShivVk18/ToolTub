# feat: 9 PDF tools (merge, split, JPG to PDF, watermark & page numbers, protect/unlock, organize, fill & sign, PDF to JPG, Office to PDF)

Second batch of "Coming soon" tools, now working. Everything runs in the browser except Office to PDF, which uses the existing LibreOffice server (same queue and 1-hour deletion as PDF to Word).

| Tool | What it does | Edge cases covered by tests |
|---|---|---|
| Merge PDF | Several PDFs → one, in the order you set (move up/down, remove) | order changes the output (pages have distinct sizes), one file isn't enough, protected or broken files are named in the error |
| Split PDF | Extract pages into one PDF, one PDF per range, or every page (ZIP) | "1-3, 5, 8-", odd/even/last, reversed ranges ("3-1"), duplicates, pages past the end, junk input, protected files |
| JPG to PDF | JPG, PNG, WebP, AVIF, GIF → PDF on A4, Letter or image-sized pages, with margins | landscape photos get landscape pages, transparent PNG kept, **phone photos with EXIF rotation stand upright** (raw JPEG embedding ignores EXIF), corrupted image named |
| Watermark & page numbers | Text (diagonal, centre, footer; colour; opacity), PNG/JPG logo, or page numbers (1 / N, Page 1 of N) on chosen pages | **rotated pages (90°, 270°) get an upright watermark** (checked visually and by position), non-Latin text gets a clear message, non-image logo refused, text read back with pdf.js |
| Protect / Unlock PDF | AES-256 password (qpdf WebAssembly), print/copy permissions; unlock with the password | non-ASCII password round trip, wrong password, unprotected file, mismatched repeat, already-protected file, file can't be opened without the password |
| Organize PDF | Page previews (pdf.js): reorder, rotate, delete, undo | last page can't be deleted, rotation adds to existing rotation, protected PDFs |
| Fill & Sign PDF | Draw or type a signature, click to place it on any page; fill form fields (text, checkbox, dropdown, radio); optional flatten | signature only on the chosen page, fill without signing, flatten removes the fields and keeps the text, non-Latin form text gets a clear message |
| PDF to JPG | Pages → JPG or PNG at 72/150/300 dpi, page ranges, ZIP for several | image sizes equal page sizes at 72 dpi, single page downloads directly, protected PDFs, 50-megapixel cap per page |
| Word, Excel & PowerPoint to PDF | .docx, .xlsx, .pptx, .odt, .ods, .odp → PDF on KlipKit's server | real PDF with the document's text (read back), non-Office file refused (415) |

**New dependencies** (approved): pdf.js 6.5 (Apache-2.0) and qpdf WebAssembly (`@neslinesli93/qpdf-wasm`, ISC; qpdf itself is Apache-2.0). Both are self-hosted from `/vendor` by `scripts/copy-vendor.mjs` and load only on the tools that use them. qpdf ships as a UMD script; the copy step adds an ES export so module workers can import it without `eval` (which the production CSP forbids).

**Server change** (approved): `word-to-pdf` in `SERVER_TOOLS` and the worker. The upload keeps its real extension from a whitelist (docx, xlsx, pptx, odt, ods, odp), so LibreOffice picks the right importer. The wrong-type message now names each tool's input instead of always saying "PDF".

**Bugs found and fixed along the way:**
- **Accessibility:** `Field` wrapped controls in a `<label>`, so a `<select>`'s accessible name included every option ("Add Text watermark Logo…"). Controls are now named by the label text only (`aria-labelledby`). This applies to every tool page.
- **Test infrastructure:** `startWorker()` in the server tests orphaned a running worker when called twice, and the orphan kept taking jobs after `stopWorker()`. It now reuses the running worker.
- **qpdf** reports a wrong password with exit code 2 (measured), not the documented 0, and writes its errors to the console. The unlock check is based on the measured behaviour.

**Tests.**
- Unit: `pages.test.ts` (page ranges, EXIF orientation in both byte orders, truncated data).
- e2e: `pdf-tools.spec.ts`, 24 tests building their own inputs with pdf-lib. Outputs are checked by page sizes, rotation, XObjects, form values and pdf.js text.
- The universal checks (H1, privacy badge, axe light/dark, phone layout and 44 px targets, keyboard) cover the 9 new pages.
- Server: Word to PDF (real conversion and rejection).
- Results: Chromium, WebKit, Pixel 7 and iPhone 14 all pass; server tests 10/10.
- The `/search` test now looks for a coming-soon row under "image", since every PDF tool works now.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
