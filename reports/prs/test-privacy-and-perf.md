# test: privacy and timing for every live panel; 5 MB JSON stays responsive

§3 quality checks from the tools spec.

**`tests/e2e/perf-privacy.spec.ts`.**
- **Every live panel (18), one page with the network guard.** Each panel's own timer must show a median of 5 runs under 50 ms. Afterwards there must be no request with a body (nothing uploaded), no third-party request, no failed request and no console error. The medians are written to `test-results/perf.json` for the report; all are 0.1–0.4 ms on Chromium.
- **5 MB JSON.** On JSON Formatter, after the text is in the textarea, no main-thread task may exceed 200 ms until the result shows. Measured: about 60 ms at most. Parsing happens in the worker and the output is a 200k-character preview.

**Found, not fixed (needs your call).** Putting a 5 MB string into the `<textarea>` costs the browser about 280 ms of layout, before any KlipKit code runs. That breaks "the UI never blocks for more than 200 ms" whenever a huge file is pasted or dropped. The fix would change the UI: show inputs over about 1 MB as a file chip ("huge.json · 5 MB · Edit anyway") instead of filling the textarea. It's listed as an open question in the Phase 4 report rather than done quietly.

**Note.** WebKit doesn't support the `longtask` observer, so the 5 MB check only measures on Chromium (it passes trivially on WebKit). Both tests pass on Chromium and WebKit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
