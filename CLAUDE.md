# KlipKit — notes for Claude

@AGENTS.md

## Where things are

- Reference UI: `design/reference/KlipKit_UI.html` (the source of truth for pixels and behaviour).
- Agent prompts and specs (local only, not in git): `docs/agent/` — start with `00_START_HERE.md`; engineering standards in `03_ENGINEERING_STANDARDS.md`.
- Decisions: `docs/adr/`. PR bodies and changelog: `reports/prs/`, `reports/changelog.md`.

## Rules

- One branch + one PR per fix, branched from and squash-merged into `integration/ui-restore`. Never commit to `main`, never force-push, never `git reset --hard`, never delete files without asking.
- Reproduce → root cause → failing test → fix → re-test. Never weaken or delete a test.
- Verify output, not just page load: a tool passes only if its result was checked.
- No third-party APIs, CDNs or AI servers. Fonts via `next/font/local`. Plans: Free and Pro only.
- Ask before adding a dependency over 100 KB or changing server/infra.
- Tool logic lives in pure engines (`src/lib/engines`); one tool registry (`src/registry`); one rAF loop.
- Before shipping a UI change, run the visual compare (and the design audit) against the reference.

## Commands

- `npm run verify` — typecheck, lint, unit tests, build (must be green before every PR)
- `npm run test:e2e` — Playwright on the production build (`npm run test:all` = verify + e2e)
- `npm run visual` — visual compare against the reference (app must be running; see the script)
- `npm run format` — Prettier
