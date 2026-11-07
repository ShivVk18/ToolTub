# test: a longer time limit for the tests that open the reference page

**Symptom.** In the final Phase 4 run (5 projects, 4 workers), four Chromium tests hit the 90 s limit: the three hero-squiggle checks and "home text boxes have the reference's line heights". On their own, all four pass in Chromium and WebKit.

**Root cause (measured).** Each of these tests opens `design/reference/KlipKit_UI.html` in its own page next to the app.
- The trace of a failed run shows 61 s between finishing the reference measurement and opening the app page. That time is `page.close()` on the reference.
- Alone, that close takes 0.3 s and the reference page is idle (profiled: 2.8 s idle out of 3 s).
- With 4 copies in parallel, each close takes about 4 s. The reference is a heavy page (blurs, animations) drawn without a GPU, so its teardown gets much slower as the CPU gets busier.
- Nothing in the app is involved, and the assertions themselves pass.

**Change.** `test.setTimeout(240_000)` on these four tests, with a comment explaining why. This is the same budget other heavy tests already use (`tools.spec`, `offline.spec`). No assertion changed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
