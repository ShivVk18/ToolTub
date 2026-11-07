# style(hallmark F14): /search was an underlined link list with a rectangular input

**Problem.** /search used the old shadcn input (8 px radius) and a plain underlined list with "(coming soon)" in brackets. It looked nothing like the palette or the home page.

**Fix.**
- Pill input: 52 px, `bg-panel`, `line2` border, accent focus ring.
- Rows in the palette's style: tinted icon tile, name, tagline, and a category tag pill.
- Live rows are links with an accent-soft hover. Coming-soon rows aren't links, show a "Coming soon" tag, and are muted with a grey icon and a secondary-colour name. Fading the whole row failed axe colour contrast in light mode, so the text isn't faded.
- `CAT_KEY` is exported from `CommandPalette` so both share the category mapping.

**Test first.** `tool-design.spec.ts › F14`:
- the input radius is a full pill;
- live rows are non-underlined links with a category tag;
- coming-soon rows have no link and are muted;
- axe finds no serious or critical issues.

It failed before the fix (radius 8 px) and passes after. I also ran axe in dark mode. `platform.spec.ts` passes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
