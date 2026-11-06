# chore: format the codebase with Prettier and add format:check to verify

## What and why
Prettier was added in #5. Formatting everything in one mechanical PR keeps later diffs small and lets `verify` enforce the style.

## How
- `prettier --write .` (97 files; reference CSS, docs, design, reports and generated files are ignored).
- `verify` now also runs `format:check`.

## Evidence
- `npm run verify`: exit 0 (format check passes, 182/182 unit tests, build OK).
- Playwright platform + chromium: 119 passed, 11 skipped (same skips as before), 0 failed.

## Checklist
- [x] One concern only (formatting, no logic change)
- [x] `npm run verify` green
