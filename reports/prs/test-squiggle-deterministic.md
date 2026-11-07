# test: squiggle-position test depended on the reference's font-load timing

**Found by** the Phase 4 baseline. `redesign-ui › hero squiggle sits where the reference puts it` failed on WebKit at 390, 1440 and 1920 px (app +0.9 px, reference −14.8 px).

**Root cause, in the reference, not the app.** The reference runs `placeSquiggle()` on `document.fonts.ready` and measures the word "just" while it is still in its `wordIn` entrance animation, which starts 0.35 em low. Normally fonts are ready at the start of that animation, so the squiggle is placed 0.35 em lower; the app reproduces this with its `0.35 × font size` term. Under heavy load (load average 50–190 during the run) the callback fired after the animation, and the reference put the squiggle about 15 px higher.

Measured on a quieter machine:

| Browser | Page | 390 px | 1440 px |
|---|---|---|---|
| Chromium | reference | 0.8 | 13.7 |
| Chromium | app | 0.9 | 14.5 |
| WebKit | reference | 0.8 | 13.7 |
| WebKit | app | 0.9 | 14.5 |

So the app matches the reference in both browsers.

**Fix (test only).** For the reference page, the test rewinds the `#h1 .w` animations to their start, calls the reference's own `placeSquiggle()`, then finishes the animations. That reproduces the normal placement on every run. The app is measured as before, and the tolerance is still 2.5 px.

A fake clock was tried first, as in the visual harness, but it doesn't control CSS animations or font loading, so WebKit still placed it at −13.5.

**Result.** 12/12 pass (Chromium + WebKit, 3 widths, repeated twice) at load average 54–108. Before this, the test failed even at normal timing whenever the machine was busy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
