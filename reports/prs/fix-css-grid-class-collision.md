# fix(ui): scope the Explore grid rule to #grid so it stops overriding Tailwind's `grid`

## What and why
The reference CSS styles its tool grid with `.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;max-width:1500px;margin:34px auto 0}` (plus two breakpoints). Ported verbatim into `globals.css`, the class rule also matched every element using Tailwind's `grid` utility: 29 elements on the home page (mic/send buttons, file tiles, plan step badges, Explore icon tiles, pricing check bullets, palette backdrop) got a 34 px top margin, 4 columns and a 1500 px width cap. Root cause of most High rows in the UI audit.

## How
`.grid` → `#grid` in the base rule and both breakpoints (the Explore grid has `id="grid"`, as in the reference).

## Evidence
- New e2e test "the Explore grid rule doesn't leak onto other Tailwind `grid` elements": failed with 29 leaking elements, passes after the fix. `redesign-ui.spec.ts`: 12/12.
- Before/after (local, git-ignored): `reports/ui/prs/grid-collision-pricing.png` (feature rows: bullets and text back on one line), `reports/ui/prs/grid-collision-workspace.png` (PDF tile inside its card, composer buttons aligned).
- `npm run verify`: exit 0.

## Checklist
- [x] One concern only
- [x] Failing test first
- [x] `npm run verify` green
