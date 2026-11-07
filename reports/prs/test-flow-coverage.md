# test: flows 5.4, 5.7, 5.8 and 5.9 end to end, with outputs checked

Phase 4 flow coverage that was missing. Each test checks the outcome, not just that the page loaded. The bugs these flows found were fixed in their own PRs: #71 (hero ask bar, QR dead end) and #72 (shrink ranking).

**New `tests/e2e/live-panels.spec.ts` (flow 5.7).** One test per live panel (18). Each checks:
- the `/#slug` deep link opens the panel;
- Sample produces output and a status;
- **every option button gives a distinct output**;
- Copy fills the clipboard (Chromium);
- full screen toggles and Esc exits;
- ⌘/Ctrl+Enter re-runs (UUID and password give a new value; Lorem is fixed text by design);
- Clear empties the input.

36/36 pass on Chromium and WebKit.

**`tests/e2e/flows.spec.ts` additions.**
- **5.4 global paste:**
  - an image file pasted on the page opens with its dimensions (1200 × 800);
  - JSON is recognised, and Format, then "Open in JSON Formatter ⤢", carries the JSON into the panel's input;
  - a JWT is recognised, and Decode shows `user_42` and `HS256`;
  - a short sentence pasted into the composer stays there.
- **5.8 ⌘K:** shrink, jwt, bg and iphone lead to the spec's tools; Esc closes.
- **5.9 voice demo:** with a file loaded (the reference also requires one), the Pro sheet's "Try a voice demo" streams "now protect it with a password" into the composer word by word, then sends it.

All flow tests (13) pass on Chromium and WebKit.

**Test notes.**
- Pastes wait for the page to be interactive: the global paste listener attaches on hydration, and a paste in the first moments after load is ignored. That's a low-severity note in the report.
- The JSON "Open in" button appears on the result card after an action, so the test formats first.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
