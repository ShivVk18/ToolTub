# style(hallmark F12): the speed stat was invented, now it's measured

**Problem.** The bento card claimed "0.8 ms typical dev-tool run". Nothing in the repo backed that number (it was copied from the mock).

**Measurement.** 60 runs across 12 live panels (sample input, time read from each panel's own status): median 0.1 ms, p90 2.5 ms, max 7.9 ms. Load average was ~30 at the time, so these are pessimistic.

**Fix.** The stat now reads "<3 ms · 9 in 10 dev-tool runs", which the p90 supports.

**Test first.** `redesign-ui.spec.ts › bento grid…` now expects the measured copy and fails on "0.8 ms". It failed before the fix and passes after.

**Reference deviation.** The copy differs from `KlipKit_UI.html:465`. The user approved this in the Hallmark FIX list.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
