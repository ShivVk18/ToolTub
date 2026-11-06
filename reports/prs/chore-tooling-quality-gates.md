# chore: tooling and quality gates (verify, Prettier, husky, ESLint layers, PR template, CLAUDE.md, ADR 0004)

## What and why
Standards §4 require one `verify` gate, formatting, pre-commit hooks, layering and a11y lint, a PR template, `CLAUDE.md` and ADR 0004. None existed.

## How
- Scripts: `typecheck`, `format`, `format:check`, `verify` (typecheck + lint + unit + build), `visual`, `prepare`; `test:all` = verify + e2e.
- ESLint: `import/no-cycle` (error), `eslint-plugin-boundaries` with the §2.2 layer map (warn during migration), jsx-a11y recommended (warn).
- Prettier config + ignore (reference CSS, generated output, docs excluded). Repo-wide formatting comes in its own PR.
- husky pre-commit → lint-staged (eslint --fix, prettier on staged files).
- `.github/pull_request_template.md`, `CLAUDE.md`, `docs/adr/0004-branch-per-fix-workflow.md`.
- CI runs `npm run verify` instead of separate lint/tsc/unit/build steps.
- Dev deps: prettier, husky, lint-staged, eslint-plugin-boundaries, eslint-plugin-import, eslint-plugin-jsx-a11y, pixelmatch, pngjs, @types/pngjs, @vitest/coverage-v8 (dev only; listed in the master prompt).

## Evidence
- `npm run verify`: exit 0 — 0 type errors, 0 lint errors (34 warnings baseline), 182/182 unit tests, build OK.
- Boundaries rule checked with a throwaway lib → server import: flagged.

## Checklist
- [x] One concern only
- [x] Failing test: N/A (tooling)
- [x] `npm run verify` green
- [x] Dev-only dependencies, no infra change
