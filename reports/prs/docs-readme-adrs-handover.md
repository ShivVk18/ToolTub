# docs: README, ADRs 0005–0007, CLAUDE.md gotchas

Phase 5 handover docs.

- **README:** rewritten.
  - Mermaid diagram of how the pieces fit: registry, home intent → plan, live panels, pure engines, workers, and the PDF to Word server path.
  - "Add a tool in 5 steps" that matches the code as it is now (catalog row, `home.ts`, `PANEL_SLUGS`/`PANELS` or a `src/tools` page, `planFor`, SEO, tests). The old steps pointed at `registry/tools.ts` rows, which moved to `catalog.ts` in #10.
  - Test commands, CI, and links to the reports.
  - Removed a stray "# ToolTub" line and the link to the outdated `docs/QA-REPORT.md`. The file itself is kept, since deleting it needs your OK.
- **ADRs:**
  - 0005: where the app may differ from the reference (accessibility, honesty, stability, the approved Hallmark changes).
  - 0006: plans run for real or say they can't.
  - 0007: test reports are generated from test output.
- **CLAUDE.md:** where the reports, the v2 baseline and the add-a-tool guide are; the plan rule; and the gotchas found in Phases 2–4 (Turbopack CSS cache, unlayered CSS, standalone static files, jiti, KB vs KiB, slow reference-page tests, Firefox on macOS 27).
- **Report fix:** the PDF to Word upload endpoint is `/api/jobs`, not `/api/convert`. Fixed in the md and the regenerated HTML.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
