# fix(bento): plan chips flickered near opacity 0 while the demo typed

**Severity: Medium** (visual, and an intermittent accessibility failure). Found by the Phase 4 baseline: `platform.spec › homepage › accessible; mobile friendly` failed on iPhone 14 with "color-contrast: .pv" (the bento plan chips).

**Root cause, two parts.**
1. **Rebuilt every frame.** The bento's typing loop set `.bplan`'s `innerHTML` on every frame. Each rebuild re-created the `.pv` chips and restarted their `chipIn` fade (0.4 s), so while the demo typed, the chips kept restarting from opacity 0. Sampled every 200 ms: mostly "new" elements at opacity 0.00–0.36. A MutationObserver counted 43 rebuilds in 4 s.
2. **Fade at load.** The mount frame (#30, which draws the resting state off screen) also played the fade, so for the first 0.4 s after load the chips were half-transparent. Axe sometimes measured them then.

**Fix.**
- The plan HTML is written only when it changes (cached in `data-html`).
- Chips drawn by the mount frame skip the entrance animation. Chips that appear during the live demo still fade in.

**Tests first.** Both failed before and pass after:
- `redesign-ui.spec › bento plan chips are built once per change` (< 10 rebuilds in 4 s; was 43).
- `… drawn at load are fully opaque straight away` (no running animations on the initial chips).

The new "at load" test now waits for the mount frame to draw the chips; it once ran before them in a full parallel run. The home axe test passes 15/15 (`--repeat-each=5` on iPhone 14, Pixel 7 and Chromium), and `redesign-ui` passes on Chromium (45). One unexplained failure of the existing home axe test happened in a full parallel run; it was not reproduced in 10 parallel repeats or a second full run, so it's listed in the Phase 4 report as seen once.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
