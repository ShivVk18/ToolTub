# docs: Hallmark pass results, v2 visual baseline, changelog through #60

**What this adds.**
- **`design/reference/v2/`.** The new visual baseline: 64 JPGs covering the 16 states × light/dark at 1440 and 390 px, 5.1 MB. The full PNG set is 192 MB, so it isn't committed; `npm run visual` regenerates it. The folder also has `results-vs-v1.json` and a README tracing every larger difference to an approved change.
- **`design/reference/v1/README.md`.** v1 is the reference prototype, kept unedited where it is.
- **`reports/hallmark-audit.md`.** Re-audit against the original gates, plus the open items.
- **`reports/ui-fix-report.md` §8.** Visual compare (89/160 against v1, all explained), Lighthouse mobile table (≥ 90 on every page after #58), and axe (0 serious or critical across 46 page × theme runs after #59).
- **`reports/changelog.md`.** Rows for #31–#60.

**No code changes.**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
