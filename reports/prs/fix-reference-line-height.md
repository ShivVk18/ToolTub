# fix(ui): restore the reference's line heights in the home design

## What and why
The reference never sets `line-height`, so its text uses the browser's `normal` (~1.2). Tailwind's preflight sets `line-height: 1.5` on `html`, so every reference-styled text box in the app was taller: eyebrow 41 vs 37 px, plan rows 44 vs 42 px, etc. This was the "everything sits ~4 px lower" drift in the UI audit.

## How
`line-height: normal` on the reference-styled roots: `#nav, #stage, .band, .sec, .giant, footer, #pal, #sheet, #toast, .flychip`. Tool-page content keeps Tailwind's 1.5; `leading-*` utilities on descendants still win.

## Evidence
- New e2e "home text boxes have the reference's line heights" loads reference and app and compares box heights (eyebrow, hint, chip, plan row, plan subline, tool-card text, marquee band) within 1 px: failed (eyebrow 41 vs 37), passes now. (Footer height differs for another reason — logo size — fixed separately.)
- Visual compare 1440 light: hero 1.70 → 0.41%, pricing 3.49 → 0.78%, capsule nav 1.97%. Explore 2.44 → 3.04% (to investigate).
- Full chromium + platform e2e: 125 passed, 11 skipped, 1 failed (PDF to Word under load — unrelated, root-caused next).
- `npm run verify`: exit 0.

## Checklist
- [x] One concern only
- [x] Failing test first
- [x] `npm run verify` green
