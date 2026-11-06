# fix(footer): keep the reference's single row on phones

## What and why
The reference footer is one row at every width: brand, tagline, and a right-aligned "© 2026 KlipKit · Privacy · Terms". The app put its (longer) link list on a separate full-width row under 640 px, which made the page taller and shifted every bottom-of-page frame (footer 21.7%, pricing 11% at 768/390).

## How
Right-hand part is one "·"-separated line like the reference, keeping the app's links (Privacy, About, Licences, llms.txt — there is no Terms page); no wrapping row.

## Evidence
- New e2e "footer keeps the reference's single row on a phone": failed, passes. `redesign-ui.spec.ts`: 27/27. Mobile projects (Pixel 7, iPhone 14): 175/175 (twice; one earlier run had a single flaky failure).
- Visual compare footer state (light): 390 21.7 → 12.3%, 768 11.7 → 2.1%, 1440 0.74%.

## Explained differences kept
- 390 px: the extra links wrap to three short lines; footer text uses `--ink2` (AA contrast) instead of the reference's muted grey.
- Pricing at 768 px (11.4%): the reference itself overlaps the Free plan's "Start free" button with the last feature row in single-column layout; the app doesn't.

## Checklist
- [x] One concern only
- [x] Failing test first
