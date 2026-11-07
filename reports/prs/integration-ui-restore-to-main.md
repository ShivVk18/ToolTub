# Release candidate v1.0.0-rc1: UI restored, Hallmark pass, every live tool verified end to end

**Draft. Do not merge until reviewed.** `integration/ui-restore` → `main`. 78 squash-merged changes (#2–#79), each with its own notes in `reports/prs/` and a row in `reports/changelog.md`.

## What changed

| Phase | Tag | Summary | Report |
|---|---|---|---|
| 1. Foundations | | Quality gates (`npm run verify`, Prettier, Husky, ESLint layers), one tool registry, pure engines, one motion loop, standard folders, generated test fixtures, ~1 GB of screenshots out of git | ADRs 0001–0004 |
| 2. UI restore | `ui-restored` | The home page and tool pages match `design/reference/KlipKit_UI.html` again: CSS reset layering, grid collisions, Pro sheet, nav blur, squiggle, pricing, line heights, deterministic visual compare | `reports/ui-fix-report.md` |
| 3. Hallmark pass | `hallmark-pass` | Design-quality fixes approved by you: Geist UI text, left-aligned Explore, per-tool glyphs, flatter bento, honest copy, AA contrast, tool pages using the home page's devices, file states | `reports/hallmark-audit.md`, `design/reference/v2/` |
| 4. Tools end to end | `tools-green` | Plans run for real; 18 bugs fixed (B1–B18), each with a failing test first; flows 5.1–5.10 covered | `reports/tools-e2e-report.md` (+ `.html`, `.json`) |
| 5. Handover | `v1.0.0-rc1` | README with architecture diagram and "add a tool in 5 steps", ADRs 0005–0007, CLAUDE.md gotchas | `README.md`, `docs/adr/` |

By type: 29 fixes, 21 style/perf, 11 refactor/chore, 16 test/docs.

## Results at this commit

- `npm run verify`: typecheck, lint (0 errors), Prettier, **232/232 unit tests**, production build.
- Playwright on the production build, 5 projects: **586 passed, 0 failed, 0 flaky**, 48 skipped by design.
- **All 26 live tools pass** with verified output. The other 53 tools are labelled "Coming soon" and do nothing.
- **No third-party requests** in any guarded test. Only PDF to Word uploads, to KlipKit's own server (deleted after 1 hour).
- Lighthouse (mobile, 14 pages): performance 90–92, accessibility 100, best practices 100, SEO 100 on indexable pages, CLS ≤ 0.005.

## Known issues (decisions pending, see the tools report §5)

- **LCP budget (2 s):** Lighthouse's simulated LCP is 3.4 s, so **the CI Lighthouse step fails**. With real throttling it's 1.8–2.1 s. The fix means changing how fonts load.
- A 5 MB paste into a text box blocks the page for about 280 ms (browser layout). Proposed fix: show huge inputs as a file chip.
- Every "resize for X" uses 1080×1350; the Explore "● Live" tag is about 3.4:1 contrast.
- Firefox wasn't run locally (it won't launch on macOS 27); CI runs it.
- Unused Inter font files and the outdated `docs/QA-REPORT.md` are still in the repo, waiting for your OK to delete.

## How to review

1. `npm ci && npm run verify`, then `npm run test:e2e`.
2. `npm start`, then open `/` and a few tools. Compare with `design/reference/KlipKit_UI.html`.
3. Read `reports/tools-e2e-report.md` (or open the `.html`) and `reports/changelog.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
