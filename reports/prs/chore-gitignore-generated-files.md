# chore: stop tracking generated screenshots (~1 GB) and ignore generated output

## What and why
`reports/ui/` held 448 visual-compare PNGs (~1 GB) that `scripts/visual-compare.ts` regenerates on every run. They bloated the repo (.git = 853 MB) and aren't useful in history. The owner asked not to commit files that aren't useful.

## How
- `git rm --cached` on `reports/ui/*.png` (files stay on disk; `reports/ui/results.json` stays tracked).
- `.gitignore`: generated `reports/ui` images/videos, `*.log`, editor folders, local Claude settings.

## Evidence
`reports/ui-fix-report.md` does not link any of the removed PNGs. Files still present locally (449 in reports/ui).

## Note
Older commits still contain the PNGs. Shrinking history needs a history rewrite, which the ground rules forbid without the owner's OK.

## Checklist
- [x] One concern only
- [x] Failing test: N/A (repo hygiene)
- [x] No dependency or infra change
