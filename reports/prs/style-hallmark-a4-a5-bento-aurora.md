# style(hallmark A4 + A5): nested bento cards; stock-looking dark glow

**Problem.**
- **A4.** The bento typing demo nested three surfaces: the card, then a soft demo card, then the composer card.
- **A5.** In dark mode the magenta and violet corner blooms were strong enough to read as a stock glow effect.

**Fix (approved ASK items).**
- **A4.** `.bdemo` has no background, border or padding of its own. The composer (`.bcomp`) is now the one inner surface; the file label, plan chips and stats sit straight on the card.
- **A5.** Dark `--blobOp` goes from 0.5 to 0.35, about 30% softer. Light mode is unchanged.

**Reference deviation.** Both differ from `KlipKit_UI.html`; the user approved them. The home visual compare will move on the bento (state c) and dark hero states. The v2 baseline is saved after the Hallmark pass.

**Tests first.** Both failed before the change and pass after.
- `redesign-ui.spec.ts › A4`: `.bdemo` is transparent with no border, and the composer keeps its 1 px border.
- `redesign-ui.spec.ts › A5`: dark blob opacity is in (0.2, 0.35].

The rest of `redesign-ui.spec.ts` (37) passes. Screenshots were checked: bento (light) and hero (dark).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
