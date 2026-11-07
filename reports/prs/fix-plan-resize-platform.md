# fix(plan): "resize for instagram" resized to 1600 px, not the 1080 × 1350 the card showed

**Severity: High** (wrong output). Found by the new §4 expected-value test: "resize for instagram" must fit within 1080×1350 and keep the aspect ratio. A 1600×1200 photo came back at 1600×1200.

**Root cause.** Introduced in #61. The plan runner worked out the platform by looking for "for …" in the step's display text, which reads "Instagram · 1080 × 1350", so it never matched and fell back to the 1600 px default. An explicit "resize 1920x1080" was ignored the same way: the rule matches only "resize", so the size never reached the step.

**Fix.**
- The intent parser puts the box on the step (`w`, `h`): 1080 × 1350 for a platform phrase, exactly as the card shows, or the explicit `W x H` found anywhere in the phrase.
- The runner resizes to `step.w × step.h`, falling back to 1600 px only when no size was given.

**Tests first.** Both failed before the fix and pass after:
- `intent.test.ts`: "resize for instagram" gives `[1080, 1350]`; "resize 1920x1080" gives `[1920, 1080]`.
- `plan.spec.ts › §4 Resize`: the downloaded image is 1080×810, within 1080×1350 with the same aspect ratio. The browser decodes it, so it's a valid image.

The plan suite passes on Chromium and WebKit (10).

**Open question (not changed).** Every platform word shows and now uses 1080 × 1350 (Instagram portrait), including YouTube, and the existing test expects that. Real sizes differ, for example 1280 × 720 for a YouTube thumbnail. Listed in the Phase 4 report.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
