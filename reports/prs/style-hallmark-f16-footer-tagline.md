# style(hallmark F16): footer tagline wrapped into a 4-line column on phones

**Problem.** Below ~400 px, "Drop anything. Done in seconds." had to share the footer row with the brand and the links, so it wrapped into a narrow 4-line column (seen on /chain and /image-tools, dark theme, phone).

**Fix.** Hide the tagline under 400 px (`max-[399px]:hidden`). The brand and links keep the single row.

**Test first.** `redesign-ui.spec.ts › F16` (375 px, /image-tools): the tagline is hidden and the links span at most two lines. At 1280 px the tagline is visible again. It failed before the fix and passes after. The existing footer single-row tests also pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
