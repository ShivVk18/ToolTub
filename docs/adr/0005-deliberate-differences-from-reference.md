# 0005 — Where the app is allowed to differ from the reference design

- Status: accepted
- Date: 2026-11-07

## Context
`design/reference/KlipKit_UI.html` is the source of truth for pixels and behaviour, and the visual compare (`npm run visual`) checks the app against it. The Hallmark design audit (`reports/hallmark-audit.md`) and the accessibility and e2e work found places where matching the reference exactly would be wrong: text below WCAG AA contrast, touch targets under 44 px, claims we can't back up ("MOST LOVED", "feels like magic"), layout shift, and a generic-looking type and layout.

## Decision
The app follows the reference except where one of these applies, and only with the user's approval:
1. **Accessibility:** AA contrast tokens (`--g-p/d/c/o`, darker eyebrow and kicker text), 44 px touch targets on phones, a darker shade on the bento demo tiles.
2. **Honesty:** no unearned badges or claims; measured numbers only (for example "<3 ms · 9 in 10 dev-tool runs"); unbuilt tools say "Coming soon".
3. **Stability:** no layout shift. For example, the bento demos reserve their tallest sample's height (#75).
4. **Approved design changes (Hallmark):** Geist for UI text (self-hosted), left-aligned Explore header, per-tool glyphs, flatter bento demo, softer dark aurora, tool pages using the home page's devices.

Each difference is listed with the states it moves in `design/reference/v2/README.md`. Screenshots taken after the Hallmark pass (`design/reference/v2/`) are the baseline for future visual checks.

## Consequences
- 89 of 160 compare states are within 2% of the v1 reference; every larger difference traces back to an entry above.
- New differences need an entry here (or in the v2 README) and the user's approval. "Matches the reference" alone is not enough to reject an accessibility or honesty fix.
