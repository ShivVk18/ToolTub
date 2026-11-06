# fix(ui): the Pro plan card's animated gradient ring was clipped

## What and why
The reference draws a rotating conic-gradient ring around the dark Pro card with `.plan.dark::before{inset:-2px;padding:2px;mask…}`. The port added `overflow-hidden` to the card, which clips the pseudo-element to the padding box, so the ring never showed.

## How
Removed `overflow-hidden` from the Pro card (nothing inside it overflows).

## Evidence
- New e2e "the Pro plan card shows its gradient ring" samples the pixel just outside the card edge: page background without the fix (rgb 212,209,224 — test fails), ring colour with it. Verified by temporarily reverting the component. `redesign-ui.spec.ts`: 16/16.
- `npm run verify`: exit 0.

## Checklist
- [x] One concern only
- [x] Failing test first
- [x] `npm run verify` green
