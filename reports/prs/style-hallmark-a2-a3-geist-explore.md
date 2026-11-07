# style(hallmark A2 + A3): Geist for UI text; Explore header left-aligned

**Decision.** You reviewed the before/after in `reports/ui/a2-a3/` and chose "Geist + left-align Explore only".

**Change.**
- **A2 font.** UI text uses Geist, self-hosted with `next/font/local` under the OFL licence. It's one variable woff2 copied from the existing `geist` dependency, 70 KB, replacing three Inter files (129 KB). No new dependency.
- **A3 alignment.** Explore's kicker, H2 and subline are left-aligned over its full-width grid, for rhythm against the centred hero. Pricing stays centred; its cards and billing toggle are centred, and a left-aligned heading there looked unbalanced in the preview.
- **Bug fixed on the way.** The theme's `--font-sans: var(--font-sans), …` referred to itself, so it computed empty, the same bug class as F3. Inter only showed because `--sans` named "Inter" literally. Swapping the font exposed it: the page fell back to Times. next/font now writes `--kk-sans`, and both `--font-sans` and `--sans` read from it.

**Tests first.** Both failed on the `integration` build and pass after:
- `redesign-ui.spec.ts › A2`: `--font-sans` resolves, the body isn't Times, a Geist woff2 loads from our own origin, and no Inter file loads.
- `redesign-ui.spec.ts › A3`: Explore's `.sh` and `.eyb` are left-aligned, and Pricing's `.sh` is centred.

`redesign-ui` and `tool-design` (50), and `tools`, `platform` and `file-states`, pass on Chromium.

**Not deleted.** `src/fonts/Inter-*.woff2` are now unused. They're left in place; deleting them needs your OK.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
