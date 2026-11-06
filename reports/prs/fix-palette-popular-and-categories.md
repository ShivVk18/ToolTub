# fix(palette): empty palette showed nothing; every tool was labelled "Productivity"

## What and why
- With an empty query and no recents, the ⌘K list was empty. The reference shows a "Popular" header and the first 8 home-grid tools.
- The row category was guessed with `hub.startsWith("dev")`, but the index holds hub *names* ("Developer tools"), so every tool showed "Productivity" with a red icon. Icons were guessed from slug text.

## How
- `SearchEntry` now carries the registry `category`, the home card `icon`, `short` name, `blurb` and `homeRank`.
- Empty query: recently used tools if any, otherwise "Popular" (first 8 by home rank).
- Rows use the real category/icon and the short name + blurb (planned tools still say "Coming soon").

## Evidence
- New e2e "empty palette lists Popular tools; rows show the right category" (Popular header, 8 rows, Compress PDF first, JWT → Developer, background → Creator): failed before, passes now. `platform.spec.ts` (chromium + platform): 17/17.
- Screenshot (local, git-ignored): `reports/ui/prs/palette-after.png` — centred, full-page blur, Popular list.
- `npm run verify`: exit 0.

## Checklist
- [x] One concern only
- [x] Failing test first
- [x] `npm run verify` green
