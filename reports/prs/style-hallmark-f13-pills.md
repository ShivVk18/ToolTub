# style(hallmark F13): mixed button shapes; an unlabelled star floating by the title

**Problem.**
- On tool pages, "Send to next tool" was an 8 px-radius box beside pill buttons.
- Download and Copy were both solid ink, so there were two primaries.
- The favourite ☆ was a bare icon floating next to the H1.

**Fix.**
- **Save chip.** "☆ Save" / "★ Saved" is a pill in the badge row. The visible label is part of the accessible name ("Save to favourites" / "Saved to favourites", WCAG 2.5.3), and `aria-pressed` carries the state.
- **One primary.** Copy is a secondary pill when Download is also shown. On text-only results it stays primary.
- **Send to next tool.** Pill summary; its menu uses 16 px and 12 px radii and the design tokens (`line`, `solid`).

**Tests.**
- New: `tool-design.spec.ts › F13`. Save is a labelled pill on the badge row; Copy differs from Download and is a pill; send-next is a pill. It failed before the fix and passes after.
- Changed: `platform.spec.ts` favourites tests find the button by its new name. The old names were "Add to favourites" / "Remove from favourites". The persisted state is still checked, and an `aria-pressed="true"` assertion was added.
- `tools.spec.ts` (hand-off and copy) and `platform.spec.ts` pass on chromium.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
