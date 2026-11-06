# fix(ui): Tailwind margin/padding utilities were wiped by an unlayered reset

## What and why
`globals.css` (ported from the reference) starts with an unlayered `* { box-sizing: border-box; margin: 0; padding: 0 }`. Tailwind 4 puts utilities in `@layer utilities`, and unlayered CSS beats layered CSS regardless of specificity, so every `m-*`/`p-*` utility on an element without a more specific reference rule resolved to 0: 56 of 173 on the home page (e.g. `mt-[16px]`, `mx-auto`) and 17 of 34 on `/json-formatter` (`px-4`, `py-8`, `p-4`, `mb-6`…). Tool pages lost their padding and the footer's `ml-auto` group couldn't move right.

## How
Keep `box-sizing` only. Tailwind's preflight already resets margin/padding in `@layer base`.

## Evidence
- New e2e "Tailwind margin/padding utilities aren't wiped by the global reset" (no zeroed spacing utility on `/json-formatter`; home footer group at the far right): failed with `px-4, mb-6, mt-4, px-3, py-1, p-4, p-3…`, passes now. `redesign-ui.spec.ts`: 20/20.
- Visual compare vs baseline (1440 light): workspace 1.89→1.07%, capsule nav 2.77→1.76%, footer 7.21→3.56%, hero 1.72→1.70%, live panel 1.32→1.44%. 390 px unchanged (separate work).
- `npm run verify`: exit 0.

## Note
The first `next build` after editing `globals.css` twice emitted stale CSS (cached); a second build picked the change up. Always confirm the compiled CSS before trusting a UI test run.

## Checklist
- [x] One concern only
- [x] Failing test first
- [x] `npm run verify` green
