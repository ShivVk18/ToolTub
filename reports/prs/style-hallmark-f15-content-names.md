# style(hallmark F15): "About json formatter" and placeholder guide entries

**Problem.** The explainer heading used the raw lowercase SEO keyword ("About json formatter"). "Keep going" listed "Guide (coming soon): …" items for guide pages that don't exist.

**Fix.**
- The heading uses the tool's display name ("About JSON Formatter & Validator").
- "Keep going" lists only live chains, and is hidden when there are none.
- `relatedGuides` stays in the registry so the list can come back once `/guides` pages exist.

**Test first.** `tool-design.spec.ts › F15`. It failed before the fix and passes after. `seo.spec.ts` (6) still passes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
