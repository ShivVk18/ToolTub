# fix(nav): Pro and Go Pro open pricing, as in the reference

## What and why
In the reference, the nav's "Pro" link and "Go Pro" button scroll to pricing (`data-go="pricing"`); the voice sheet opens from the Pro plan's "Go Pro" (`#proBtn`) and the composer mic. The app wired both nav controls to the voice sheet instead — a behaviour the reference doesn't have. (The test added in #15 encoded that behaviour; it now asserts the reference behaviour.)

## How
- `Nav`: Pro and Go Pro → `handleNavClick("pricing")` (on other pages: `/#pricing`). Removed the now-unused `onOpenPro` prop; `Header` no longer passes the sheet opener.
- Visual harness state j opens the sheet the reference way (`#proBtn`) on both pages.

## Evidence
- e2e "nav Go Pro scrolls to pricing; the Pro plan's Go Pro opens a visible voice sheet": failed against the old wiring, passes now. `redesign-ui.spec.ts`: 26/26.
- Visual compare state j (light/dark): 1440 → 1.58% / 1.54%, 390 → 2.36% / 2.34% (was 40.8% average, when the two pages showed different things).

## Checklist
- [x] One concern only (nav Pro behaviour)
- [x] Failing test first
