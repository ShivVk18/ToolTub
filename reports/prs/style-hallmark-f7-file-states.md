# style(hallmark F7): file tools accepted the wrong type silently and had no retry

**Problem (Image Compressor, Compress PDF).**
- A wrong file type was accepted, and the error appeared only after pressing Compress. Drag-and-drop and paste skip the input's `accept` filter.
- The picked file showed only as tiny hint text.
- Errors had no way to recover.
- Success was a bare text line.

**Fix.**
- **Validate on selection.** A new pure `acceptsFile(accept, file)` in `lib/engines/format` matches MIME types, wildcards and extensions, case-insensitively. The Dropzone checks every file on pick, drop and paste, and says "notes.txt isn't a JPG, PNG, WebP, AVIF, GIF or BMP image." with a **Choose another file** button. Each tool passes a `typeLabel`: PDF, image, HEIC, background remover. Image accept strings now include extensions as well, for drops that have no MIME type.
- **File chip.** A `FileChip` pill shows the name (or "a.jpg + 4 more"), the count and size, and **Change**.
- **Error + retry.** `ToolWorkspace` takes `onRetry`, so processing errors also offer **Choose another file**, which clears the file and brings the dropzone back.
- **Result row.** A `ResultRow` shows "before → after", a green "−N%" pill when smaller (AA green `--g-c`), and the actions (ink Download pill) on the same row. In the image tools the per-file list sits above the row, receipt-style; the existing converter tests read the first list item as a file.

**Tests first.**
- New `tests/e2e/file-states.spec.ts` (4 tests): wrong type rejected on selection with no click (image and PDF); chip with name, size, pill shape and Change; processing error leads to Choose another file and the dropzone; result row with "→" and Download, for PDF and image. All 4 failed before the fix.
- New unit test: `engines.test.ts › acceptsFile`.
- Chromium: file-states, tools, platform and tool-design all pass (103).
- WebKit: file-states (4) and the file-tool tests (43) pass.
- Firefox can't launch in this sandbox ("Could not find profile folder"). Untouched tests fail at launch too, so it's the environment, not this change.
- Screenshots checked: wrong type (light), chip (light), result (dark). Axe is clean on each.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
