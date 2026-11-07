# chore(lint): verify failed whenever an e2e run had left a Playwright trace

**Found** when a gated merge in Phase 4 was refused: `npm run verify` reported 238 ESLint errors. All of them were in `playwright-report/trace/*.js`, Playwright's minified trace viewer, which is written after any failing e2e test.

**Root cause.** ESLint's `globalIgnores` covered `.next`, `reports`, `coverage` and others, but not the generated test output (`playwright-report/`, `test-results/`, `.lighthouseci/`). Those are gitignored, so the gap only showed up locally after a failed run.

**Fix.** Ignore those three folders.

**Test first.** New `tests/unit/lint-config.test.ts` asks ESLint whether these paths are ignored and whether `src/` and `tests/` are still linted. It failed before the fix and passes after.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
