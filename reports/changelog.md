# Changelog — integration/ui-restore

Every change landed as its own branch, squash-merged into `integration/ui-restore` (no GitHub PR access: PR bodies are in `reports/prs/`). Newest first.

| # | Title | Branch | PR notes |
|---|---|---|---|
| 30 | fix(bento): no layout shift on scroll, content under reduced motion, AA contrast | `fix/bento-initial-frame` | [reports/prs/fix-bento-initial-frame.md](reports/prs/fix-bento-initial-frame.md) |
| 29 | fix(workspace): the composer didn't grow with its text | `fix/composer-autosize` | [reports/prs/fix-composer-autosize.md](reports/prs/fix-composer-autosize.md) |
| 28 | fix(footer): footer brand was nav-sized | `fix/footer-brand-size` | [reports/prs/fix-footer-brand-size.md](reports/prs/fix-footer-brand-size.md) |
| 27 | fix(test): drop an unused @ts-expect-error in the sweeper test | `fix/worker-sweep-test-typecheck` | [reports/prs/fix-worker-sweep-test-typecheck.md](reports/prs/fix-worker-sweep-test-typecheck.md) |
| 26 | fix(worker): never sweep a job that is still converting | `fix/worker-sweeper-skips-active-jobs` | [reports/prs/fix-worker-sweeper-skips-active-jobs.md](reports/prs/fix-worker-sweeper-skips-active-jobs.md) |
| 25 | fix(ui): restore the reference's line heights in the home design | `fix/reference-line-height` | [reports/prs/fix-reference-line-height.md](reports/prs/fix-reference-line-height.md) |
| 24 | fix(pricing): match the reference toggle spacing, copy and colours | `fix/pricing-matches-reference` | [reports/prs/fix-pricing-matches-reference.md](reports/prs/fix-pricing-matches-reference.md) |
| 23 | test(visual): find tabs by their own text | `test/visual-compare-own-text-click` | [reports/prs/test-visual-compare-own-text-click.md](reports/prs/test-visual-compare-own-text-click.md) |
| 22 | test(visual): click tabs without scrolling | `test/visual-compare-no-scroll-clicks` | [reports/prs/test-visual-compare-no-scroll-clicks.md](reports/prs/test-visual-compare-no-scroll-clicks.md) |
| 21 | fix(ui): Tailwind margin/padding utilities were wiped by an unlayered reset | `fix/css-reset-layer` | [reports/prs/fix-css-reset-layer.md](reports/prs/fix-css-reset-layer.md) |
| 20 | fix(palette): show Popular tools when empty and the real category per row | `fix/palette-popular-and-categories` | [reports/prs/fix-palette-popular-and-categories.md](reports/prs/fix-palette-popular-and-categories.md) |
| 19 | fix(hero): squiggle underline placed too low | `fix/hero-squiggle-position` | [reports/prs/fix-hero-squiggle-position.md](reports/prs/fix-hero-squiggle-position.md) |
| 18 | fix(ui): the Pro plan card's animated gradient ring was clipped | `fix/pricing-pro-ring` | [reports/prs/fix-pricing-pro-ring.md](reports/prs/fix-pricing-pro-ring.md) |
| 17 | fix(ui): the scrolled nav capsule had no backdrop blur | `fix/nav-capsule-backdrop-blur` | [reports/prs/fix-nav-capsule-backdrop-blur.md](reports/prs/fix-nav-capsule-backdrop-blur.md) |
| 16 | fix(ui): section headings lost their italic second phrase | `fix/section-heading-italics` | [reports/prs/fix-section-heading-italics.md](reports/prs/fix-section-heading-italics.md) |
| 15 | fix(ui): the Pro voice sheet never became visible | `fix/pro-sheet-invisible` | [reports/prs/fix-pro-sheet-invisible.md](reports/prs/fix-pro-sheet-invisible.md) |
| 14 | fix(ui): scope the Explore grid rule to #grid | `fix/css-grid-class-collision` | [reports/prs/fix-css-grid-class-collision.md](reports/prs/fix-css-grid-class-collision.md) |
| 13 | test: deterministic visual-compare harness | `test/visual-compare-harness` | [reports/prs/test-visual-compare-harness.md](reports/prs/test-visual-compare-harness.md) |
| 12 | refactor: one motion loop that pauses off screen, in hidden tabs and under reduced motion (ADR 0001) | `refactor/motion-single-loop` | [reports/prs/refactor-motion-single-loop.md](reports/prs/refactor-motion-single-loop.md) |
| 11 | refactor: one theme key, recents in the store, no app code on window.__kk | `refactor/stores-single-source` | [reports/prs/refactor-stores-single-source.md](reports/prs/refactor-stores-single-source.md) |
| 10 | refactor: one tool registry drives the home grid, panels and actions (ADR 0002) | `refactor/registry-single-source` | [reports/prs/refactor-registry-single-source.md](reports/prs/refactor-registry-single-source.md) |
| 9 | refactor: move tool logic into pure engines (ADR 0003) | `refactor/engines-pure-lib` | [reports/prs/refactor-engines-pure-lib.md](reports/prs/refactor-engines-pure-lib.md) |
| 8 | refactor: move files to the standard folder structure | `refactor/folder-structure` | [reports/prs/refactor-folder-structure.md](reports/prs/refactor-folder-structure.md) |
| 7 | chore: remove unused KlipKitApp and design CommandPalette | `chore/remove-dead-code` | [reports/prs/chore-remove-dead-code.md](reports/prs/chore-remove-dead-code.md) |
| 6 | chore: format the codebase with Prettier and add format:check to verify | `chore/prettier-format-all` | [reports/prs/chore-prettier-format-all.md](reports/prs/chore-prettier-format-all.md) |
| 5 | chore: tooling and quality gates (verify, Prettier, husky, ESLint layers, PR template, CLAUDE.md, ADR 0004) | `chore/tooling-quality-gates` | [reports/prs/chore-tooling-quality-gates.md](reports/prs/chore-tooling-quality-gates.md) |
| 4 | chore: keep agent prompt docs out of git | `chore/untrack-agent-prompts` | [reports/prs/chore-untrack-agent-prompts.md](reports/prs/chore-untrack-agent-prompts.md) |
| 3 | test: generate PDF fixtures instead of committing them | `test/fixtures-generate-pdfs` | [reports/prs/test-fixtures-generate-pdfs.md](reports/prs/test-fixtures-generate-pdfs.md) |
| 2 | chore: stop tracking generated screenshots (~1 GB) and ignore generated output | `chore/gitignore-generated-files` | [reports/prs/chore-gitignore-generated-files.md](reports/prs/chore-gitignore-generated-files.md) |
| 1 | docs: add agent source docs (start here, engineering standards, design spec) | `docs/agent-sources` | [reports/prs/docs-agent-sources.md](reports/prs/docs-agent-sources.md) |
