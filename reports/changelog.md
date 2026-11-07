# Changelog — integration/ui-restore

Every change landed as its own branch, squash-merged into `integration/ui-restore` (no GitHub PR access: PR bodies are in `reports/prs/`). Newest first.

| # | Title | Branch | PR notes |
|---|---|---|---|
| 87 | feat: tools open as Live Tool Cards inside the chat; /slug renders the chat with the card + SEO below; paste into the active card | `feat/workspace-live-tool-card` | [reports/prs/feat-workspace-live-tool-card.md](reports/prs/feat-workspace-live-tool-card.md) |
| 86 | refactor: registry `panel` → `card` (CardConfig); latest reference with chat-native tools | `refactor/registry-card-config` | [reports/prs/refactor-registry-card-config.md](reports/prs/refactor-registry-card-config.md) |
| 85 | fix: per-platform resize sizes; AA contrast for the Explore "● Live" tag | `feat/decisions-mp3-cleanup` | [reports/prs/feat-decisions-mp3-cleanup.md](reports/prs/feat-decisions-mp3-cleanup.md) |
| 84 | feat: Diff Checker, Code Minifier, HTML Playground, Text to Speech, Résumé Builder; home plans open the new tools; early paste kept | `feat/dev-text-tools` | [reports/prs/feat-dev-text-tools.md](reports/prs/feat-dev-text-tools.md) |
| 83 | feat: 9 video, audio and speech tools (compress, convert, trim, GIF, extract audio, audio converter, screen recorder, transcription, subtitles) | `feat/video-audio-tools` | [reports/prs/feat-video-audio-tools.md](reports/prs/feat-video-audio-tools.md) |
| 82 | feat: 12 image and creator tools (crop, EXIF remover, bulk rename, social resizer, thumbnail preview, meme, watermark, palette, colour picker, collage, passport photo, OCR) | `feat/image-creator-tools` | [reports/prs/feat-image-creator-tools.md](reports/prs/feat-image-creator-tools.md) |
| 81 | feat: 9 PDF tools (merge, split, JPG to PDF, watermark & page numbers, protect/unlock, organize, fill & sign, PDF to JPG, Office to PDF) | `feat/pdf-tools` | [reports/prs/feat-pdf-tools.md](reports/prs/feat-pdf-tools.md) |
| 80 | feat: 15 new live tools (unit/time zone, YAML, .env, meta, schema, chmod, entities, bases, CSS, post/caption/bio, Markdown, barcode) | `feat/panels-text-dev-tools` | [reports/prs/feat-panels-text-dev-tools.md](reports/prs/feat-panels-text-dev-tools.md) |
| 79 | docs: release PR description (integration/ui-restore → main, v1.0.0-rc1) | `docs/release-pr-body` | [reports/prs/integration-ui-restore-to-main.md](reports/prs/integration-ui-restore-to-main.md) |
| 78 | docs: README (architecture diagram, add a tool in 5 steps), ADRs 0005–0007, CLAUDE.md gotchas | `docs/readme-adrs-handover` | [reports/prs/docs-readme-adrs-handover.md](reports/prs/docs-readme-adrs-handover.md) |
| 77 | docs: Phase 4 tools end-to-end report (md, HTML, JSON) and its generator; changelog through #77 | `docs/tools-e2e-report` | [reports/prs/docs-tools-e2e-report.md](reports/prs/docs-tools-e2e-report.md) |
| 76 | test: longer time limit for tests that open the reference page (teardown is slow under load) | `test/reference-page-timeout` | [reports/prs/test-reference-page-timeout.md](reports/prs/test-reference-page-timeout.md) |
| 75 | fix(home): bento cards keep one height while their demos cycle (no layout shift on phones) | `fix/bento-height-cycle` | [reports/prs/fix-bento-height-cycle.md](reports/prs/fix-bento-height-cycle.md) |
| 74 | test: privacy + timing for every live panel; 5 MB JSON stays responsive | `test/privacy-and-perf` | [reports/prs/test-privacy-and-perf.md](reports/prs/test-privacy-and-perf.md) |
| 73 | test: flows 5.4 paste, 5.7 every live panel, 5.8 synonyms, 5.9 voice | `test/flow-coverage` | [reports/prs/test-flow-coverage.md](reports/prs/test-flow-coverage.md) |
| 72 | fix(search): near ties go to the more popular tool (shrink → Compress PDF) | `fix/palette-shrink-ranking` | [reports/prs/fix-palette-shrink-ranking.md](reports/prs/fix-palette-shrink-ranking.md) |
| 71 | fix(home): hero ask bar sent nothing; QR request opens the QR page | `fix/qr-ask-dead-end` | [reports/prs/fix-qr-ask-dead-end.md](reports/prs/fix-qr-ask-dead-end.md) |
| 70 | fix(drop): count pages of PDFs with compressed object streams | `fix/file-card-pdf-pages` | [reports/prs/fix-file-card-pdf-pages.md](reports/prs/fix-file-card-pdf-pages.md) |
| 69 | fix(image): PNG + target size works in Safari (JPG); plan targets never exceed what was asked | `fix/image-target-safari-kb` | [reports/prs/fix-image-target-safari-kb.md](reports/prs/fix-image-target-safari-kb.md) |
| 68 | fix(plan): resize to the size the card shows (1080 × 1350 for Instagram) | `fix/plan-resize-platform` | [reports/prs/fix-plan-resize-platform.md](reports/prs/fix-plan-resize-platform.md) |
| 67 | test: §4 gaps — SQL AND indented, generated TypeScript compiles; 1600×1200 photo fixture | `test/expected-values-gaps` | [reports/prs/test-expected-values-gaps.md](reports/prs/test-expected-values-gaps.md) |
| 66 | fix(worker): sweeper kept only the converting job; queued uploads were deleted | `fix/worker-sweep-keeps-queued-jobs` | [reports/prs/fix-worker-sweep-keeps-queued-jobs.md](reports/prs/fix-worker-sweep-keeps-queued-jobs.md) |
| 65 | test: measure the reference squiggle independent of font-load timing | `test/squiggle-deterministic` | [reports/prs/test-squiggle-deterministic.md](reports/prs/test-squiggle-deterministic.md) |
| 64 | fix(bento): plan chips rebuilt every frame and flickered; no fade at load | `fix/bento-chip-flicker` | [reports/prs/fix-bento-chip-flicker.md](reports/prs/fix-bento-chip-flicker.md) |
| 63 | chore(lint): ignore generated test output so verify doesn't fail after an e2e run | `chore/eslint-ignore-test-output` | [reports/prs/chore-eslint-ignore-test-output.md](reports/prs/chore-eslint-ignore-test-output.md) |
| 62 | fix(a11y): Save chip is a 44 px tap target on phones | `fix/save-chip-touch-target` | [reports/prs/fix-save-chip-touch-target.md](reports/prs/fix-save-chip-touch-target.md) |
| 61 | fix(plan): run plans for real; no invented results; file steps beat generators | `fix/plan-runner-real` | [reports/prs/fix-plan-runner-real.md](reports/prs/fix-plan-runner-real.md) |
| 60 | docs: Hallmark pass results, v2 visual baseline, changelog through #60 | `docs/hallmark-v2-baseline` | [reports/prs/docs-hallmark-v2-baseline.md](reports/prs/docs-hallmark-v2-baseline.md) |
| 59 | fix(a11y): home eyebrow, chip glyphs and dark kickers below AA contrast | `fix/a11y-home-contrast` | [reports/prs/fix-a11y-home-contrast.md](reports/prs/fix-a11y-home-contrast.md) |
| 58 | perf: render the QR code on the server (mobile Lighthouse 86 → 92) | `perf/qr-ssr-code` | [reports/prs/perf-qr-ssr-code.md](reports/prs/perf-qr-ssr-code.md) |
| 57 | style(hallmark A2+A3): Geist for UI text; Explore header left-aligned | `style/hallmark-a2-a3-geist-explore` | [reports/prs/style-hallmark-a2-a3-geist-explore.md](reports/prs/style-hallmark-a2-a3-geist-explore.md) |
| 56 | style(hallmark A6): tool pages adopt home devices (kickers, serif heads, FAQ details, orb drop) | `style/hallmark-a6-tool-pages` | [reports/prs/style-hallmark-a6-tool-pages.md](reports/prs/style-hallmark-a6-tool-pages.md) |
| 55 | style(hallmark A4+A5): flatten the bento demo; softer dark aurora | `style/hallmark-a4-a5-bento-aurora` | [reports/prs/style-hallmark-a4-a5-bento-aurora.md](reports/prs/style-hallmark-a4-a5-bento-aurora.md) |
| 54 | style(hallmark A7): drop the MOST LOVED badge and 'feels like magic' | `style/hallmark-a7-honest-copy` | [reports/prs/style-hallmark-a7-honest-copy.md](reports/prs/style-hallmark-a7-honest-copy.md) |
| 53 | style(hallmark F7): validate files on selection; chip, retry and result row | `style/hallmark-f7-file-states` | [reports/prs/style-hallmark-f7-file-states.md](reports/prs/style-hallmark-f7-file-states.md) |
| 52 | style(hallmark F8): accent-coloured controls, pill fields, dark slider track | `style/hallmark-f8-form-controls` | [reports/prs/style-hallmark-f8-form-controls.md](reports/prs/style-hallmark-f8-form-controls.md) |
| 51 | style(hallmark F9): hubs lead with live tools; backlog as compact chips | `style/hallmark-f9-hub-pages` | [reports/prs/style-hallmark-f9-hub-pages.md](reports/prs/style-hallmark-f9-hub-pages.md) |
| 50 | style(hallmark F10): related tools as chips, in the page's one column | `style/hallmark-f10-related-chips` | [reports/prs/style-hallmark-f10-related-chips.md](reports/prs/style-hallmark-f10-related-chips.md) |
| 49 | style(hallmark F11): per-tool mono glyphs instead of one shared icon | `style/hallmark-f11-tool-glyphs` | [reports/prs/style-hallmark-f11-tool-glyphs.md](reports/prs/style-hallmark-f11-tool-glyphs.md) |
| 48 | style(hallmark F13): pills everywhere, one primary, a labelled Save chip | `style/hallmark-f13-pills` | [reports/prs/style-hallmark-f13-pills.md](reports/prs/style-hallmark-f13-pills.md) |
| 47 | style(hallmark F14): /search gets the pill input and palette-style rows | `style/hallmark-f14-search-page` | [reports/prs/style-hallmark-f14-search-page.md](reports/prs/style-hallmark-f14-search-page.md) |
| 46 | style(hallmark F15): explainer used the raw keyword; placeholder guides listed | `style/hallmark-f15-content-names` | [reports/prs/style-hallmark-f15-content-names.md](reports/prs/style-hallmark-f15-content-names.md) |
| 45 | style(hallmark F16): footer tagline wrapped into a column on phones | `style/hallmark-f16-footer-tagline` | [reports/prs/style-hallmark-f16-footer-tagline.md](reports/prs/style-hallmark-f16-footer-tagline.md) |
| 44 | style(hallmark F12): the speed stat was invented; now measured | `style/hallmark-f12-measured-stat` | [reports/prs/style-hallmark-f12-measured-stat.md](reports/prs/style-hallmark-f12-measured-stat.md) |
| 43 | style(hallmark F6): the privacy card's lock ring covered its label | `style/hallmark-f6-lock-ring` | [reports/prs/style-hallmark-f6-lock-ring.md](reports/prs/style-hallmark-f6-lock-ring.md) |
| 42 | style(hallmark F5 + A1): honest tool count; unbuilt tools say Coming soon | `style/hallmark-f5-a1-honest-tools` | [reports/prs/style-hallmark-f5-a1-honest-tools.md](reports/prs/style-hallmark-f5-a1-honest-tools.md) |
| 41 | style(hallmark F4): grey slabs where tool pages meant a soft surface | `style/hallmark-f4-muted-surfaces` | [reports/prs/style-hallmark-f4-muted-surfaces.md](reports/prs/style-hallmark-f4-muted-surfaces.md) |
| 40 | style(hallmark F3): code rendered in Inter instead of monospace | `style/hallmark-f3-font-mono` | [reports/prs/style-hallmark-f3-font-mono.md](reports/prs/style-hallmark-f3-font-mono.md) |
| 39 | style(hallmark F2): page titles inherited the hero's 112 px centred headline | `style/hallmark-f2-page-h1` | [reports/prs/style-hallmark-f2-page-h1.md](reports/prs/style-hallmark-f2-page-h1.md) |
| 38 | style(hallmark F1): tool-page primary buttons were transparent | `style/hallmark-f1-button-reset` | [reports/prs/style-hallmark-f1-button-reset.md](reports/prs/style-hallmark-f1-button-reset.md) |
| 37 | docs: design audit report (Phase 3, report only) | `docs/hallmark-audit` | [reports/prs/docs-hallmark-audit.md](reports/prs/docs-hallmark-audit.md) |
| 36 | docs: design DNA | `docs/design-dna` | [reports/prs/docs-design-dna.md](reports/prs/docs-design-dna.md) |
| 35 | fix(panel): opening a live tool left the hero orb and satellites over the panel | `fix/panel-docks-orb` | [reports/prs/fix-panel-docks-orb.md](reports/prs/fix-panel-docks-orb.md) |
| 34 | docs: Phase 2 UI fix report and refreshed after-screenshots | `docs/ui-fix-report` | [reports/prs/docs-ui-fix-report.md](reports/prs/docs-ui-fix-report.md) |
| 33 | fix(footer): keep the reference's single row on phones | `fix/footer-mobile-row` | [reports/prs/fix-footer-mobile-row.md](reports/prs/fix-footer-mobile-row.md) |
| 32 | fix(nav): Pro and Go Pro open pricing, as in the reference | `fix/nav-go-pro-to-pricing` | [reports/prs/fix-nav-go-pro-to-pricing.md](reports/prs/fix-nav-go-pro-to-pricing.md) |
| 31 | docs: changelog of every merged PR | `docs/changelog` | — |
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
