# fix(a11y): the Save chip was a 73×28 px tap target on phones

**Severity: Medium** (accessibility). Found by the Phase 4 baseline run: `tools.spec › mobile: no horizontal scroll, touch targets ≥ 44 px` failed for every tool on Pixel 7 and iPhone 14 (20 tests).

**Root cause.** Introduced by #48 (Hallmark F13). The new "☆ Save" chip was `h-[28px]` at every width, below the 44 px minimum the repo enforces for touch.

**Fix.** On phones the chip is 44 px tall (`h-11`, `px-4`, `text-sm`). From `sm` up it keeps the compact 28 px badge size beside the privacy badge.

**Test.** The existing mobile test was the failing test: 10 of 10 failed on Pixel 7 before the fix, and 20 of 20 pass on Pixel 7 and iPhone 14 after. `tool-design.spec › F13` (desktop, badge row) still passes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
