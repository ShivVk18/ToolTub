# style(hallmark A7): "MOST LOVED" and "feels like magic"

**Problem.** The Pro plan wore a "MOST LOVED" badge although KlipKit has no users yet. The Why KlipKit subline said "KlipKit feels like magic", which is a claim, not information.

**Fix (approved ASK item A7).**
- The badge reads "MOST CAPABLE", which is true: Pro includes every tool as it ships.
- The subline is concrete: "Most tool sites make you hunt through menus. Here you drop a file or say what you need, and it's done." It describes the two things the page then demonstrates, the drop target and the typing bento.

**Reference deviation.** The copy differs from `KlipKit_UI.html`; the user approved this.

**Test first.** `redesign-ui.spec.ts › A7`: no "most loved" or "like magic" anywhere on the home page, the badge says MOST CAPABLE, and the subline has the new copy. It failed before the change and passes after. The pricing tests pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
