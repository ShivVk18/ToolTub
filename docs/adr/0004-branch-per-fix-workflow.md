# 0004 — One branch and one PR per fix

- Status: accepted
- Date: 2026-11-06

## Context
Earlier agent work landed as large mixed commits on one branch. When the UI broke it was hard to see which change caused it, and nothing could be reverted on its own.

## Decision
- All work lands on `integration/ui-restore`. `main` changes only through a reviewed PR from it.
- Each fix, section or refactor step gets its own branch (`<type>/<area>-<desc>`) and PR, squash-merged into `integration/ui-restore`.
- Bug fixes start with a failing test. `npm run verify` must be green before merging.
- Without GitHub PR access, merge with `git merge --squash` locally and save the PR body to `reports/prs/<branch>.md`.
- No commits to `main`, no `git reset --hard`, no force-push, no `--no-verify`.

## Consequences
- Every change is small, reviewable and revertable on its own.
- More branches and merge commits; `reports/changelog.md` lists them all.
