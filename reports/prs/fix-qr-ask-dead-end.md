# fix(home): the hero ask bar sent nothing; "make a qr code" was a dead end

**Severity: High** (the home page's main input didn't work). Found by the new flow 5.3 tests: generators from the hero ask bar.

**Bug 1: the ask bar did nothing.** On submit, HomeStage switched to the workspace, then wrote the text into the composer's DOM (`cmp.value = text`), dispatched `input` and a synthetic Enter. React tracks a controlled textarea's value, so setting `.value` directly and dispatching `input` never reached `onChange`. The composer's state stayed empty and the Enter sent nothing. Reproduced in a real browser: "generate 10 uuids" left the workspace empty, with the text visible in the composer but never sent. The voice demo works because it goes through state.

**Bug 2: QR dead end.** A QR request ("make a qr code") returned `open: "qr-code-generator"`, and the workspace called `openPanel`. QR has its own page, not a live home panel, so nothing opened.

**Fix.**
- HomeStage passes the request as state (`pendingAsk`). The workspace sends it through its normal `handleSend`, via a ref so it always uses the current handler, once per request.
- A generator that opens a tool uses its live panel if it has one, and otherwise goes to the tool's page.

**Tests first.** New `tests/e2e/flows.spec.ts` (flow 5.3), with the clock frozen at 2026-11-04 10:07 IST, `Asia/Kolkata` and `en-IN` as in §2. From the hero ask bar:
- 10 UUIDs, all v4 and unique;
- a 24-character password;
- 3 lorem paragraphs;
- sha256 of hello world equals `b94d…cde9`, also read back from the clipboard on Chromium;
- `base64 of "hello world"` equals `aGVsbG8gd29ybGQ=`;
- the current timestamp equals the frozen clock;
- "make a qr code" lands on /qr-code-generator with a QR shown.

All failed before the fix. All pass on Chromium and WebKit after; WebKit passed 21/21 in repeats. The home, platform, plan and drop-flow suites pass on Chromium (70). One squiggle test timed out once at load average 87 and passes on its own.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
