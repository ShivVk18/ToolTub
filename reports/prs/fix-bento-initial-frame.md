# fix(bento): cards grew 180 px when scrolled into view; empty under reduced motion; AA contrast

## What and why
- The bento demos (live typing, paste detection) only got content inside the frame loop, which skipped work while the section was off screen. The cards rendered empty, then grew ~180 px (390 px wide) when they scrolled into view — a layout shift that also pushed Explore and Pricing down. Since #12 the loop is also skipped under reduced motion, so those users saw empty demos.
- Once the content exists at load, axe flags it: white labels on the red/amber file tiles (3.9:1 / 2.7:1) and `--muted` "Detected:" / step details on white (4.39:1).

## How
- The frame callback renders once on mount (`t = 4 s`: first demo fully typed, paste card visible), then the loop animates as before.
- `id="bdText"` on the typing demo (as in the reference).
- Contrast: tiles marked `aria-hidden` (they repeat the adjacent text) and get a 28% dark overlay inside `#bento` (hue kept, AA met); "Detected:" and step details use `--ink2`, the same choice already made for other small muted text. Deliberate differences from the reference pixels.

## Evidence
- New e2e: "bento cards don't grow when they scroll into view" (failed: +180 px) and "bento demos show content under reduced motion" (failed: empty) — both pass. Home axe check passes with the content present. `redesign-ui.spec.ts`: 26/26.

## Build note
Turbopack's persistent cache (`.next/cache/turbopack`) kept serving stale CSS after `globals.css` edits, even across two builds. The ship script now clears it before `verify`.

## Checklist
- [x] One section (bento)
- [x] Failing tests first
