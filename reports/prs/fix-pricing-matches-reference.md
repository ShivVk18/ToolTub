# fix(pricing): toggle sat 40 px too low; copy and colours differed from the reference

## What and why
- The reference cancels the generic `.tabs { margin: 40px auto 0 }` on the billing toggle with `style="margin:0"`. The port dropped that, so the toggle and both plan cards sat 40 px lower.
- Copy differed: "free forever · no card" → reference "forever · no sign-up"; "All 76 tools, unlimited runs" → "All 76 tools"; "Runs on your device · 100% private" → "Runs on your device".
- Free plan used `text-ink2` for the subline and the feature list; the reference uses muted grey and default ink.

## Evidence
- New e2e "pricing uses the reference copy and spacing" (subline, 4 feature rows, heading → toggle = 30 px): failed, passes now. `redesign-ui.spec.ts`: 21/21.
- Visual compare state o (yearly), light/dark: 1920 → 2.46% / 2.33%, 1440 → 3.49% / 3.35% (before this PR and the harness fixes: 14–19%). The rest is the global line-height difference (next PR).
- `npm run verify`: exit 0.

## Checklist
- [x] One section only (pricing)
- [x] Failing test first
- [x] `npm run verify` green
