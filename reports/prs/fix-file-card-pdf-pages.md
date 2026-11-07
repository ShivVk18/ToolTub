# fix(drop): the file card had no page count for most modern PDFs

**Severity: Medium** (wrong or missing metadata; flow 5.5). Found in Phase 4: dropping `twenty-pages.pdf` showed "a PDF, 5 KB" instead of "a 20-page PDF".

**Root cause.** `fromFile` counted pages by searching the first 8 MB of the file as text for `/Type /Page`. PDFs that keep their page objects in compressed object streams have none of that text: PDF 1.5+, and pdf-lib's default output. The count came out empty.

**Fix.** When the text search finds nothing, load the PDF with pdf-lib to get the page count. It's imported only when a PDF is dropped, skipped above 100 MB, and ignores encryption, since only the page tree is read. The quick text search stays as the fast path.

**Tests first.** New `tests/e2e/drop-flow.spec.ts` (flow 5.5):
- the card shows "20 pages" and "a 20-page PDF" (failed before, passes after);
- image dimensions show "1200 × 800";
- dropping two PDFs suggests Merge.

Drop-flow and plan tests pass on Chromium and WebKit (18).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
