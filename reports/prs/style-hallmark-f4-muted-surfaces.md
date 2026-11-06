# style(hallmark F4): grey slabs where tool pages meant a soft surface

## What and why
Tool pages used shadcn's `bg-muted` for code blocks, the file-summary bar, the progress track, hovers and the drag-over state. In this theme `muted` is the reference's **text** grey (#7C7870 / #8F8B94), so those surfaces became heavy grey slabs: ink on #7C7870 ≈ 4:1, and ≈ 3:1 in dark. The ink progress fill was nearly invisible on it.

## How
- Surfaces use the `soft` token (#FAF8F3 / #211F29) instead of `muted` (all 11 usages); `text-muted` stays for text.
- Drag-over: accent border + accent-soft tint. Progress fill: accent.

## Evidence
- `tool-design.spec.ts` F4 (JSON output background = `--soft`): failed (rgb 124,120,112), passes. Tools + tool-design: 76 passed, 11 skipped.
- Before/after light + dark (local): `reports/ui/prs/f3-f4-json-output.png` (also shows F1 buttons and F3 monospace).

## Follow-up
Download and Copy are now both ink pills; Copy becomes a secondary pill in F13.
