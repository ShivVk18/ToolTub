# docs: Phase 4 tools end-to-end report (md, HTML, JSON) and its generator

The Phase 4 deliverables from `docs/agent/02_TOOLS_E2E_TEST_PROMPT.md` §7.

- **`reports/tools-e2e-report.md`:** rewritten from measured results only. The old draft claimed numbers nobody had measured. Covers summary, tool matrix, flows 5.1–5.10, bug table B1–B18, open items needing a decision, privacy, performance (panels and Lighthouse) and how to re-run.
- **`scripts/tools-report.ts`** (new): reads Playwright's JSON results and the panel timings, then writes:
  - `reports/tools-e2e-results.json`, for CI;
  - `reports/tools-e2e-report.html`: one self-contained page in the KlipKit look, with a filterable tool matrix, totals, the per-project table and the narrative sections converted from the markdown. No external resources.
  - Run it with `npx jiti scripts/tools-report.ts [results.json] [perf.json]`.
- **Changelog** through #77.

**Final run (production build, 5 projects, 4 workers):** 586 passed, 0 failed, 0 flaky, 48 skipped by design. Unit tests: 232/232. All 26 live tools pass; 53 are "Coming soon".

The CI workflow (`.github/workflows/test.yml`) already existed and uploads these reports. Its Lighthouse step fails on the 2 s LCP budget; see the report's §7.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
