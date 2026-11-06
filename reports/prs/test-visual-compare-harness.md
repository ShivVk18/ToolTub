# test: deterministic visual-compare harness (frozen clock, frozen CSS animations, pixelmatch)

## What and why
`01_UI_FIX_PROMPT.md` §3 requires a deterministic reference-vs-app comparison. The old script used real-time waits (frames differed per run), a hand-rolled colour diff, 7 of the 10 viewport/theme runs, and needed the app started by hand.

## How
- `page.clock.install` on both pages; time only moves through `page.clock.runFor` (`settle`). Hooks are fired without awaiting so in-page animations don't deadlock on the frozen clock.
- After each state every CSS animation is paused (finite → end state, infinite → t = 0); carets, the typing caret and film grain hidden; orb interior masked.
- pixelmatch (threshold 0.12, AA ignored); side-by-side ref | app | diff images.
- All 16 states (a–p) × 5 viewports × 2 themes, with `--states`, `--vp`, `--theme` filters. Starts the standalone build on :3333 if `APP_URL` isn't set/reachable.
- Writes `reports/ui/results.json` and `reports/ui/summary.md` (PNGs are git-ignored).

## Evidence
Trial run at 1440×900 light: hero 1.72%, live panel 1.33%, Pro sheet 7.70% (the sheet never opens in the app — known bug). Two runs produce identical frames (typewriter text and satellite positions match).

## Checklist
- [x] One concern only (tooling)
- [x] `npm run visual` runs it
