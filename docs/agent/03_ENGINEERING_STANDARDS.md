# KlipKit engineering standards

How code is organised, reviewed and shipped. This file wins on structure and workflow (see `00_START_HERE.md`).

---

## 1. Git workflow — one branch + one PR per fix

```
main ──────────────────────────────────────────────── (release only, never commit directly)
  └─ integration/ui-restore ──●────●────●────●──── (all work lands here, squash-merged)
        ├─ chore/tooling-quality-gates ──┘
        ├─ fix/hero-orb-not-rendering ────────┘
        └─ fix/tools-pdf-to-word-retry ────────────┘
```

- **Base branch:** `integration/ui-restore`. Every change branches from it and is squash-merged back into it. `main` only receives the final reviewed PR from `integration/ui-restore`.
- **One concern per branch.** A branch fixes one bug, one section or one refactor step. If you find a second problem, open a second branch.
- **Branch names:** `<type>/<area>-<short-desc>`, lower-case kebab.
  - `fix/` bug fix · `feat/` new behaviour · `refactor/` no behaviour change · `style/` visual only · `test/` tests only · `chore/` tooling · `docs/` docs only · `perf/` performance
  - Examples: `fix/hero-orb-not-rendering`, `refactor/registry-single-source`, `fix/tools-image-compressor-target-size`, `style/hallmark-explore-grid`.
- **Commits:** Conventional Commits (`fix(hero): measure orb slot after fonts load`). The squash commit title equals the PR title.
- **PR flow:** failing test → fix → `npm run verify` green → PR with the template (§7) → CI green → squash merge → delete the branch.
- **No remote?** Do the same locally: `git merge --squash <branch>` into `integration/ui-restore`, commit with the PR title and body, and save the body to `reports/prs/<branch>.md`. Record every PR in `reports/changelog.md`.
- **Forbidden:** committing to `main`, `git reset --hard`, force-push, rewriting merged history, deleting files without asking, skipping hooks (`--no-verify`).
- **Safety branch:** before any work, commit the current state to `backup/before-<agent>-fix`.

## 2. Architecture

### 2.1 Folder structure (target)

```
src/
├─ app/                    # routes only: thin pages that compose components; no business logic
├─ registry/               # SINGLE SOURCE OF TRUTH for tools (ToolDef), categories, chains, SEO copy
├─ lib/
│  ├─ engines/             # PURE logic: intent, detect, generators, json, jwt, csv, cron, color, hash,
│  │                       #   regex, sql, case, words, timestamp, … (no React, no DOM, no fetch)
│  ├─ motion/              # the one rAF loop, useFrame, useSpring, tween, ease, reduced-motion
│  ├─ seo/                 # metadata, JSON-LD schema, sitemap, llms.txt builders
│  ├─ store/               # Zustand stores (UI state, recents/favourites, hand-off)
│  └─ utils/               # tiny generic helpers (cn, format bytes, clamp…)
├─ components/
│  ├─ ui/                  # primitives (Button, Chip, Pill, Sheet, Toast…), token-driven
│  ├─ layout/              # Nav, Footer, ThemeToggle, AuroraBackground, ProgressLine
│  ├─ home/                # Hero, Orb, Satellites, Workspace, LivePanel, Marquee, Bento, Explore, Pricing, Wordmark
│  ├─ tool/                # tool-page chrome: ToolWorkspace, Dropzone, PrivacyBadge, ResultActions
│  ├─ search/              # command palette
│  └─ seo/                 # JsonLd, Breadcrumbs, ToolContent
├─ tools/                  # one client component per routed tool + lazy map (index.tsx)
├─ workers/                # Web Worker entry points; they call lib/engines
├─ server/                 # server-only (queue, rate limit); imports `server-only`
└─ styles/                 # tokens.css (design tokens), reference.css (verbatim reference CSS), globals.css
worker/                    # LibreOffice + BullMQ conversion worker (separate container)
tests/{unit,e2e,fixtures}/ # Vitest + Playwright
scripts/                   # build helpers, visual-compare.ts
docs/{agent,adr}/          # agent prompts, architecture decision records
reports/                   # generated reports, screenshots, PR bodies, changelog
```

### 2.2 Layering (enforced by `eslint-plugin-boundaries`)

| Layer | May import | Must not import |
|---|---|---|
| `app/` | everything below | — |
| `components/`, `tools/` | `components/`, `lib/`, `registry/` | `server/`, `app/` |
| `workers/` | `lib/engines`, `lib/utils` | React, `components/`, `server/` |
| `registry/` | `registry/`, `lib/utils` | React components, `server/` |
| `lib/engines/` | `lib/engines`, `lib/utils` | React, DOM globals, `fetch`, `components/`, `registry/`, `server/` |
| `lib/*` (other) | `lib/`, `registry/` | `components/`, `server/` |
| `server/` | `lib/`, `registry/` | `components/`, `tools/` |

No import cycles (`import/no-cycle`).

### 2.3 Registry: one `ToolDef` drives everything (ADR 0002)

- Exactly one list of tools: `src/registry/tools.ts`, typed `ToolDef`.
- It feeds routes (`generateStaticParams`), the command palette, the Explore grid, live panels, the sitemap, `llms.txt`, OG images, JSON-LD and related tools. **Never** keep a second list (e.g. a separate grid or panel list keyed by display name).
- `ToolDef` minimum: `slug`, `name`, `category`, `status` (`live` | `beta` | `planned`), `surface` (`page` | `panel` | `both`), `processing`, `inputs`/`outputs`, `synonyms`, `icon`, `blurb`, optional `panel` config, optional `seo`.
- A tool with `status: "planned"` is never presented as working: the UI shows **Coming soon** and does not fake output.
- Unit test: every routed slug has a component; every `panel` tool has a panel engine; no duplicate slugs or names.

### 2.4 Pure engines (ADR 0003)

- All tool logic lives in `lib/engines/*` as **pure, typed functions**: input → output, no side effects, no DOM, no time or randomness unless injected (`now`, `rng` parameters).
- The reference HTML's `parse`, `detect`, `genParse`, `PANELS`, `ACT`, `cronExplain`, `hashAll`, `fmtSQL`, `decodeJWT`, `parseCSV`, `toCSV`, `parseColor`, `wordStats` are ported here **as behaviour**, not reinvented.
- Every engine has Vitest tests that use the exact expected values from `02` §4.
- UI components and workers call engines; they never re-implement logic.

### 2.5 Motion: a single rAF loop (ADR 0001)

- One `requestAnimationFrame` loop for the whole app (`lib/motion/loop.ts`). Components subscribe with `useFrame(cb)`; springs use `useSpring`.
- Loops for off-screen elements pause (IntersectionObserver) and the loop stops when the tab is hidden.
- `prefers-reduced-motion: reduce` turns off satellites, marquee, typewriter, magnetic effects and continuous orb motion.
- No layout reads during render. Measurement happens in effects and in the frame callback, re-measured after `document.fonts.ready` and on resize (ResizeObserver).

### 2.6 Workers

- Heavy work (images, PDF, big JSON, models) runs in Web Workers via `createWorkerClient` / `serveWorker`. Workers are created lazily and call `lib/engines`.
- Server conversions (LibreOffice) run only in `worker/` behind the queue. Files are deleted after the retention time.

### 2.7 Stores

- Zustand only. One store per concern: `uiStore` (mode, panel, palette, sheet), `klipStore` (recents, favourites — persisted), hand-off (in memory, never persisted).
- `localStorage` access is wrapped in try/catch and only runs after mount.

### 2.8 Rendering rules

- No `window`, `document`, `localStorage`, `Math.random()` or `Date.now()` during render. Use effects or client-only components.
- Theme is set before paint by an inline `<head>` script; `<html suppressHydrationWarning>`.
- The service worker is registered in production only.

## 3. Reusability

- Before writing a component, search `components/ui` and `components/*`. Extend with props or variants instead of copying.
- Design values come from tokens (`styles/tokens.css`). No hard-coded colours, radii or shadows in components except where the reference uses a one-off value (comment it).
- A component file does one thing and stays under ~300 lines; split larger ones.
- Shared behaviour goes in hooks (`useFrame`, `useHandoff`, `useToolRun`, `useClientOnly`).

## 4. Quality gates

| Script | What it runs |
|---|---|
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint: Next, TypeScript, `import/no-cycle`, `boundaries`, `jsx-a11y` |
| `npm run format:check` | Prettier check |
| `npm run test:unit` | Vitest |
| `npm run verify` | typecheck + lint + format:check + test:unit + build. **Must be green before every PR.** |
| `npm run test:e2e` | Playwright on the production build |
| `npm run test:all` | verify + e2e |
| `npm run visual` | `scripts/visual-compare.ts` against the reference |

- Pre-commit (husky + lint-staged): ESLint and Prettier on staged files.
- CI (`.github/workflows/`): `verify` and `test:e2e` on every push and PR; reports uploaded as artifacts.
- Thresholds: 0 type errors, 0 lint errors, 0 console errors and hydration warnings, axe 0 serious, Lighthouse mobile ≥ 90, visual diff ≤ 2% per state.

## 5. Testing rules

- Every bug fix starts with a failing test that reproduces it.
- Engines: Vitest with exact values. Flows: Playwright with frozen clock (`Asia/Kolkata`), the network privacy guard and axe.
- Never weaken, skip or delete a test to make it pass. A skip needs a reason in the test.

## 6. Foundation migration (do these first, in order, one PR each)

1. `chore/tooling-quality-gates` — strict TS, ESLint plugins, Prettier, husky + lint-staged, `verify`, PR template, CI, `CLAUDE.md`, ADR 0004.
2. `refactor/folder-structure` — move files to §2.1. No behaviour change; build and visual compare unchanged.
3. `refactor/registry-single-source` — one `ToolDef` list (ADR 0002).
4. `refactor/engines-pure-lib` — engines in `lib/engines` with tests (ADR 0003).
5. `refactor/motion-single-loop` — `useFrame`, `useSpring`, pause off screen, reduced motion (ADR 0001).

## 7. PR template (`.github/pull_request_template.md`)

```
## What and why
<one paragraph: the problem, the root cause>

## How
<the change, in a few bullets>

## Evidence
- Failing test before: <test name>
- After: <test/visual/screenshot links>

## Checklist
- [ ] One concern only
- [ ] Failing test written first (or N/A for refactor/docs, with reason)
- [ ] `npm run verify` green
- [ ] No new dependency > 100 KB, no server/infra change (or approved)
- [ ] Layering and registry rules respected
- [ ] Light + dark, mobile checked (UI changes)
- [ ] Docs/ADR updated if a decision changed
```

## 8. Review checklist

- Does it fix the root cause, not the symptom?
- Is there a test that would fail without the change?
- Does it respect layering, the single registry and the single motion loop?
- Any render-time `window`/`localStorage`/random/time access?
- Any hard-coded design values that should be tokens?
- Any fake output (UI claiming success without doing the work)?
- Accessibility: labels, focus, keyboard, contrast, reduced motion.
- Is the report or changelog updated honestly?

## 9. ADRs (`docs/adr/`)

`NNNN-title.md` with Context, Decision, Consequences. Required: 0001 single motion loop, 0002 registry single source, 0003 pure engines, 0004 branch-per-fix workflow.
