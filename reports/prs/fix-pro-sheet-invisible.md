# fix(ui): the Pro voice sheet never became visible

## What and why
Clicking "Go Pro" set the sheet's Tailwind `opacity-100 pointer-events-auto`, but the reference CSS `#sheet{opacity:0;pointer-events:none}` (ID selector) wins over utility classes and only yields to `#sheet.open`. The sheet stayed invisible and the page under it kept the clicks ("Try a voice demo" was unreachable). The `.sbox` entrance transform also never reset for the same reason.

## How
`VoiceSheet` adds the `open` class when open, as the reference does (and as the command palette already did).

## Evidence
- New e2e "Go Pro opens a visible, clickable voice sheet; Escape closes it": failed (opacity "0"), passes now; checks computed opacity and that `#tryVoice` is the top element at its own centre. `redesign-ui.spec.ts`: 13/13.
- Screenshot (local, git-ignored): `reports/ui/prs/pro-sheet-after.png`.
- `npm run verify`: exit 0.

## Checklist
- [x] One concern only
- [x] Failing test first
- [x] `npm run verify` green
