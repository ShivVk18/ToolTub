# style(hallmark F2): page titles inherited the hero's 112 px centred headline

## What and why
The hero headline's CSS was a bare `h1 { text-align:center; font-size:clamp(48px,5.9vw,112px); … }`, unlayered, so it restyled every page title (tool, hub, about, privacy, licences, search, chain): ~85 px, centred above left-aligned content, wrapping to 2–3 lines on phones.

## How
- Hero rules scoped to `#h1` (the hero headline's id).
- New `components/ui/PageTitle`: left-aligned serif, `clamp(36px, 4.2vw, 56px)`, used by all 7 page titles.

## Evidence
- `tool-design.spec.ts` F2 (json-formatter, developer-tools, about: not centred, 36–56 px, KKSerif; home `#h1` still centred): failed, passes. Tools + redesign + tool-design suites: 102 passed, 11 skipped.
- Home hero visual compare unchanged: 1440 0.46% / 0.47%, 390 2.00% / 2.10%.
- Before/after (local): `reports/ui/prs/f2-json-formatter.png`, `reports/ui/prs/f2-developer-tools-mobile.png`.
