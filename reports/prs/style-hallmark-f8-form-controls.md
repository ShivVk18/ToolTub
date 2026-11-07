# style(hallmark F8): browser-blue native controls; a white slider track in dark mode

**Problem.**
- Tool-page checkboxes, sliders and selects used the browser's default blue, which clashed with the violet accent.
- In dark mode the quality slider's track was a near-white bar (luminance 0.94).
- Fields were 8 px boxes, while the rest of the UI uses pills.

**Fix.**
- **Native controls (`@layer base`).** All of them get `accent-color: var(--accent)`, and `color-scheme: dark` under the dark theme.
- **Fields.** `inputClass` is a home-style pill: `line2` border, `solid` background, `ink` text, accent focus ring.
- **Select.** `appearance: none` with its own chevron. That rule is unlayered on purpose: inside a layer the field's `px-4` utility took its right padding and the chevron sat under the text.
- **Range.** A new `.kk-range` styles the track and thumb itself: token track, accent fill set by the `--fill` inline var, a `solid` thumb with an accent ring, and a focus outline. Chrome keeps a white native track in dark mode even with `color-scheme: dark` once `accent-color` is set.

**Test first.** `tool-design.spec.ts › F8`. Each check failed before its fix and passes now:
- `accent-color` equals `--accent` on the checkbox and the range;
- the select is a pill with `appearance: none` and room for the chevron;
- in dark mode the range has `color-scheme: dark`;
- a pixel sample at the track's unfilled end is dark (luminance < 0.35).

Screenshots were checked (dark compressor and JSON, light QR), and axe is clean on all three. `tools.spec.ts` and `platform.spec.ts` (99 on chromium) pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
