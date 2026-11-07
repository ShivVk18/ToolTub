# style(hallmark F10): related tools were a lone card off the page's column

**Problem.**
- "Related tools" was a 3-column card grid. With one related tool it showed a single white card.
- The guide (`ToolContent`) below was `mx-auto max-w-3xl`, so it was centred inside the 4xl column while the title and tool were left-aligned. That gave two different left edges.

**Fix.**
- Related tools are home-style chips: a pill with the category's colour mark (as on the hero satellites), the short name, and the tagline as a tooltip.
- The guide is left-aligned, so the title, tool, related chips and guide share one left edge.
- `catColor(category)` is added to `designTools`, so the colours come from the one `CATS` table.

**Test first.** `tool-design.spec.ts › F10` (1440 px, /json-formatter): every related link is a pill, and the related section and guide share the H1's left edge. It failed before the fix (cards) and passes after. `tools.spec.ts › related tool links resolve` and `seo.spec.ts` pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
