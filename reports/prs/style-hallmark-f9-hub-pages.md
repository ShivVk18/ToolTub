# style(hallmark F9): hub pages buried their live tools in a grid of "Coming soon" cards

**Problem.**
- /developer-tools showed 2 live tools, then 24 identical dashed "Coming soon" cards.
- 16 of those "coming soon" tools (Base64, Regex, UUID, Hash, SQL, Cron …) are live panels on the home page.
- /pdf-tools had the same imbalance, with 2 live tools and 9 cards.

**Fix.**
- **Live tools first.** Every live tool is a large card in the Explore grid's style, with its glyph or icon tile, name, tagline and tag. "Live" tools are home panels, linked as `/#slug` (the existing hash deep link); "On device" and "Private server" tools have their own page.
- **Backlog.** The rest is a compact list of dashed chips under "Coming soon", which are not links.
- **New component.** `ToolMark` is a shared tile that renders the glyph if the tool has one and the icon otherwise.
- **Glyph contrast.** Axe found the coloured glyph text was 3.0–4.4:1 on its tinted tile. That also applied to the Explore glyphs from #49. New tokens `--g-p/d/c` keep each category's hue, shaded per theme to ≥ 4.7:1. Explore and the hubs both use them.
- **Live tag contrast.** Hub "● Live" uses the AA green `--g-c`. Explore keeps the reference's `--ok`, about 3.4:1 at 12 px; that's flagged for the Phase 3 re-audit.
- **JSON-LD unchanged.** The hub's JSON-LD still lists only tools with their own page.

**Test first.** `tool-design.spec.ts › F9`:
- routed links go to `/slug` and panel links to `/#slug`;
- Base64 is not in the backlog, and backlog chips aren't links;
- chips are at most 36 px tall and cards are at least 3× that;
- axe passes on /developer-tools (light) and /pdf-tools (dark);
- clicking Base64 opens the live panel.

It failed before the fix and passes after. `platform.spec.ts` (hub test with axe, "Coming soon" heading) passes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
