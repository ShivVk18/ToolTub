# 0007 — Test reports are generated from test output

- Status: accepted
- Date: 2026-11-07

## Context
An earlier tools report claimed results nobody had measured: 28 live tools, per-tool timings and "5/5 entry points" for every tool. Hand-typed pass marks drift from reality, and nobody can tell which ones were checked.

## Decision
- `scripts/tools-report.ts` builds `reports/tools-e2e-results.json` and `reports/tools-e2e-report.html` from Playwright's JSON results (`test-results/results.json`) and the panels' measured timings (`test-results/perf.json`, written by `perf-privacy.spec.ts`).
- A tool's status is "pass" only if tests that match it ran and passed. A column with no test shows "—"; nothing is claimed for it.
- The entry-point map (which test proves route, ⌘K, Explore, chat or paste for each tool) is the one hand-written part. It names the test, so it can be checked.
- The HTML includes the markdown report's narrative (flows, bugs, open items), converted without dependencies or external resources.
- A tool passes only if its **output** was verified (bytes, dimensions, parsed content, hashes), not just because its page loaded.

## Consequences
- Re-running the suite and the script updates every number. The markdown summary still needs a person to update it.
- Gaps show up: live panels have no per-panel phone, dark or axe test yet, and the report says so.
