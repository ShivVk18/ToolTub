# fix(workspace): the composer didn't grow with its text

## What and why
The reference grows the composer textarea with its content (`height = min(140, scrollHeight)` on every input). The port kept it at a fixed 46 px, so on a phone a multi-step instruction scrolled out of view and the live-highlight mirror no longer lined up with the text (UI audit: High).

## How
`useLayoutEffect` on the composer text: reset to 46 px, then fit to `scrollHeight` up to 140 px (scroll beyond that). An empty composer stays one line, because Chrome counts the wrapped placeholder in `scrollHeight`.

## Evidence
- New e2e "composer grows with its text on a phone (up to 140 px)" (grows and shows all text; caps at 140; back to 46 when empty): failed, passes now. `redesign-ui.spec.ts`: 24/24.
- Visual compare state e (typing a multi-step instruction), light: 390 px 9.89% → 4.74%; 1440 px 0.81%.

## Checklist
- [x] One concern only
- [x] Failing test first
