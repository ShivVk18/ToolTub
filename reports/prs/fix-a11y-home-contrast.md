# fix(a11y): home text below AA contrast (hidden from the existing axe test)

**Found by** the Phase 3 full-site axe sweep.

**Root cause.** The existing home axe test runs at the top of the page. There, the hero pills sit on a translucent panel over the aurora, so axe can't work out their background and reports the nodes as "incomplete", not as violations. Scrolled, the same text is measured against the page colour, which is how it reads, and fails:
- `.eyebrow` ("26 tools live · …") used `--muted`: 4.21:1, the same issue as K7.
- The hero chip glyphs: `{ }` and ✦ in `--accent` were 4.43:1 (light) and 3.87:1 (dark); `JWT` in `#f2734f` was 2.74:1 (light).
- The section kicker numbers (`.eyb i`, `#5240df`) were 2.7:1 on the dark background.

**Fix.**
- The eyebrow uses `--ink2`.
- The `{ }` and ✦ glyphs use `--g-d`, the AA violet (5.4:1 in both themes).
- `JWT` uses the new `--g-o`: `#b3553a` in light, and the reference's `#f2734f` in dark, where it's already 6.3:1.
- Dark-mode kicker numbers use `--g-d`. Light keeps the reference `#5240df`.

**Not changed, on purpose.** The hero satellites (`#sats`, aria-hidden) dim with their 3D depth. They're decorative, which WCAG 1.4.3 exempts, and the new test excludes only them.

**Tests first.** Both failed before the fix and pass after:
- `redesign-ui.spec.ts › home passes axe … (light/dark), satellites settled`: dark failed on `.eyb i`.
- `redesign-ui.spec.ts › hero text passes contrast against a resolvable background (light/dark, scrolled)`: failed on the eyebrow and both chip glyphs. It uses reduced motion so the looping bento demo isn't caught mid-fade.

`redesign-ui` (43) passes on Chromium.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
