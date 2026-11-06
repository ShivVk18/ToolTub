# style(hallmark F5 + A1): honest tool count; unbuilt tools say Coming soon

## What and why
Only 26 of the 76 catalogue tools work today (18 live panels + 8 tools with their own page), but the home page claimed "76 tools" everywhere, Explore tagged unbuilt tools "On device", and clicking one opened a workspace that faked results. Approved by the owner (audit A1, F5).

## How
- `TOOL_COUNTS` (live / total) derived from the registry.
- Hero eyebrow: "26 tools live · 50 on the way · Free forever"; Explore subline adds "26 live today, 50 on the way" (heading keeps the catalogue count); bento stat "26 tools live today"; Free plan "Every tool, as it ships".
- Explore: unbuilt tools tagged **Coming soon** with a desaturated icon (text keeps AA contrast); clicking shows "<Tool> is coming soon." Tools with their own page open it (`router.push`); live panels open as before.

## Evidence
- New e2e "A1/F5: unbuilt tools say Coming soon; page tools open their page" (tag, toast, no workspace, Compress PDF → /compress-pdf): failed before, passes. Copy assertions updated to the new counts (regex). Redesign + platform (chromium + platform): 46 passed.
- Before/after (local): `reports/ui/prs/a1-explore.png`, `reports/ui/prs/a1-hero.png`.

## Deliberate difference from the reference
The eyebrow and stat text differ from the reference's "76 tools" by design (honesty rule).
