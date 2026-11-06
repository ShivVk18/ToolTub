# fix(hero): squiggle underline placed too low (crossed "you need." on phones)

## What and why
The hand-drawn underline under "just say" was measured with `getBoundingClientRect()` while the headline words were still in their entrance animation (shifted down by 0.35em), and the port used `top = bottom − 4` where the reference uses `− 16`. Result: ~13 px too low at 1440 px, and on a 390 px phone it ran through the next line ("you need.").

## How
Measure with layout offsets relative to the h1 (`offsetLeft/Top/Width/Height`), which ignore transforms, and reproduce the reference's resting position: `layoutBottom + 0.35em − 16`. The result no longer depends on when fonts finish loading.

## Evidence
- New e2e (390, 1440, 1920 px) loads the reference and the app and compares the squiggle's offset from "just": all three failed before (verified by reverting the component), pass now (within 1 px: 390 → ref 0.8 / app 0.9; 1440 → 13.7 / 14.5; 1920 → 23.2 / 22.7). `redesign-ui.spec.ts`: 19/19.
- `npm run verify`: exit 0.

## Checklist
- [x] One concern only
- [x] Failing test first
- [x] `npm run verify` green
