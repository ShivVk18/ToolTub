# style(hallmark F11): one generic icon on ~30 different tools

**Problem.**
- In the Explore grid, ~19 developer tools showed the same `<>` icon.
- Every PDF tool showed the same document icon.
- JWT and Hash shared the padlock.

The cards were hard to tell apart at a glance.

**Fix.**
- **Glyphs.** Each developer and PDF/document tool gets its own mono glyph of up to 4 characters, in the hero satellites' style and the category colour: `{ }`, `JWT`, `B64`, `/.*/`, `UUID`, `#`, `SQL`, `CRON`, `→DOC`, `A+B`, `↓KB` …
- **Single source.** The glyph lives on the registry's home card (`HomeCard.glyph`) and flows through `ToolItem.g`.
- **Unchanged.** Other tools keep their icon. Protect PDF keeps the padlock, which no other tool uses now. Coming-soon cards stay greyed (the existing `.tcard[data-soon] .ti` rule).

**Tests first.**
- Unit, `registry.test.ts › F11`: no two developer or PDF/doc tools share a mark, and glyphs are at most 4 characters. It failed with 32 duplicates and passes now.
- e2e, `redesign-ui.spec.ts › F11`: JSON/JWT/Hash cards render their glyph in a monospace font, and a Creator card keeps its SVG. It failed before the render change and passes after.
- Screenshots were checked in light and dark.

**Note.** The squiggle tests timed out once at load average ~190 (machine load from other apps). They pass when re-run with 2 workers.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
