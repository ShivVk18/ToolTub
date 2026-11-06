# fix(panel): opening a live tool left the hero orb and satellites over the panel

## What and why
The reference's `openPanel` sets `state.mode = 'work'`, so the orb flies to the workspace dock and the satellites fade out. The port added the `is-work panel-open` classes but never switched HomeStage's `mode`, which the orb and satellites follow. Opening any live tool (Explore card or `#slug` deep link) left a 189 px orb and orbiting satellites on top of the panel. The visual compare didn't catch it because the orb interior is masked.

## How
HomeStage switches to work mode whenever a panel tool is set (closing the panel keeps the workspace, as in the reference).

## Evidence
- New e2e "opening a live panel docks the orb and hides the satellites" (`/#base64`): failed (orb 411 px from the dock), passes. `redesign-ui.spec.ts`: 28/28.
- Visual compare state h: 1440 light/dark 0.01%, 390 1.33% / 1.38%.

## Checklist
- [x] One concern only
- [x] Failing test first
