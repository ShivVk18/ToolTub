# test: generate PDF fixtures instead of committing them

## What and why
The owner asked not to commit the PDF files. `text.pdf`, `protected.pdf` and `fake.pdf` were binary fixtures made once by a macOS + LibreOffice script, so CI on Linux couldn't rebuild them.

## How
- `tests/fixtures/generate.mjs` (runs in Playwright global setup) now writes `generated/text.pdf` (pdf-lib, same sentences), `generated/protected.pdf` (Standard encryption declared in the trailer, so readers treat it as password-protected) and `generated/fake.pdf` (plain text).
- Tests use `gen(...)` for these three files.
- PDFs untracked (kept on disk) and ignored; removed from `make-committed.sh`.

## Evidence
- pdf-lib: text.pdf loads (1 page); protected.pdf → "is encrypted"; fake.pdf → parse error.
- LibreOffice converts the generated text.pdf to DOCX containing "editable text in Word".
- `server-tools.spec.ts`: 8/8 passed. Compress PDF password/fake tests passed (chromium).

## Checklist
- [x] One concern only
- [x] Tests run green with generated fixtures
- [x] No dependency or infra change
