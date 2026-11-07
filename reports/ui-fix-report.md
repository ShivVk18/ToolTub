# KlipKit UI restore — report (Phase 2)

Branch `integration/ui-restore`, PRs #1–#33 (see [changelog](changelog.md); PR notes in [prs/](prs/)). Reference: `design/reference/KlipKit_UI.html`.

## 1. Summary

The home page now matches the reference closely at desktop sizes, and most phone states are within a few percent. **113 of 160** state × viewport × theme frames were within 2% in the last full visual run (baseline before Phase 2: **47 of 160**); #32 and #33 fixed two more state groups after that run (see §4).

What was broken, in plain words:
- **Old JavaScript in dev.** The offline service worker also ran in development and served stale same-name dev chunks, so the app crashed before starting (the orb sat at its default spot over the headline). Root cause of the original screenshot.
- **Reference CSS fought Tailwind.** The reference stylesheet was pasted in unlayered. In Tailwind 4 that beats every utility, so: a `* { margin:0; padding:0 }` reset silently wiped half of all margin/padding classes (tool pages lost their spacing); the reference's `.grid` rule hijacked 29 elements using Tailwind's `grid`; `#sheet` kept the Pro sheet invisible; `.brand/.mark` made the footer logo nav-sized; `.tabs` pushed the billing toggle 40 px down.
- **Metrics drift.** Tailwind's `line-height: 1.5` vs the reference's browser default made every text box a few pixels taller.
- **Timing bugs.** The squiggle was measured mid-animation (crossed the next line on phones); bento demos filled in only when visible (180 px layout shift, empty under reduced motion).
- **Behaviour drift.** Nav "Go Pro" opened the voice sheet (reference: scroll to pricing); the palette showed nothing when empty and labelled every tool "Productivity"; the composer didn't grow.

## 2. Bugs: root cause → fix

| ID | Bug | Root cause | Fix (PR) | Verified |
|---|---|---|---|---|
| B1 | Orb not rendering (stuck top-left) | Service worker served stale dev chunks → app never hydrated | SW only in production; dev unregisters it (backup commit, #2 base) | Orb in slot in dev + prod; probe screenshots |
| B2 | Satellites over the headline | Orbited (0,0) before the orb was measured (fixed in earlier work); stays hidden until measured | — | Visual a/b 10/10 |
| B3 | Headline overlaps hint | Orb slot collapsed (earlier work) | — | Visual a 10/10 |
| B4 | Nav collides / capsule | Capsule had no blur: minifier dropped unprefixed `backdrop-filter` | #17 | e2e capsule blur |
| B5 | Next.js "1 Issue" | Same stale-chunk crash; no remaining overlay issues | backup commit | 0 errors/warnings, no overlay issues in dev and prod (home, 5 tool pages, workspace, panel, palette; 1440 + 390) |
| B6 | Duplicated hero chips | Fixed earlier; layout matches | — | Visual a |
| B7 | Empty space under chips | Matches the reference stage height at 1920/2560 | — | Visual a at 2560: 0.3% |
| B8 | Untruncated recents | Fixed earlier; recents now in the store, client-only | #11 | stores.test.ts |
| B9 | Thick top bar | 2 px progress line (earlier work) | — | Visual k |
| U1 | Workspace/pricing/palette/Explore layout | Reference `.grid` rule overrode Tailwind `grid` on 29 elements | #14 | e2e leak test (29 → 0) |
| U2 | Pro voice sheet invisible | `#sheet{opacity:0}` needs `.open` class | #15 | e2e visible + clickable |
| U3 | Heading italics lost | `not-italic italic` | #16 | e2e |
| U4 | Pro card ring missing | `overflow-hidden` clipped `::before` | #18 | e2e edge pixel |
| U5 | Squiggle too low / crosses line on phones | Measured mid-entrance-animation, wrong constant | #19 | e2e vs reference at 390/1440/1920 (≤1 px) |
| U6 | Empty palette, wrong categories | Category guessed from hub name; no Popular list | #20 | e2e |
| U7 | Tailwind spacing wiped app-wide | Unlayered `*{margin:0;padding:0}` | #21 | e2e (17 zeroed utilities → 0) |
| U8 | Pricing toggle 40 px low, copy/colours | Reference's inline `margin:0` dropped | #24 | e2e |
| U9 | Text boxes taller than reference | Tailwind line-height 1.5 vs browser normal | #25 | e2e heights vs reference (≤1 px) |
| U10 | Footer logo nav-sized | Global `.brand/.mark` beat utilities | #28 | e2e vs reference |
| U11 | Composer didn't grow | Autosize not ported | #29 | e2e |
| U12 | Bento grew 180 px on scroll; empty under reduced motion; AA contrast | Content rendered only while visible | #30 | e2e shift + reduced motion; axe clean |
| U13 | Nav Go Pro opened the sheet | Behaviour drift from reference | #32 | e2e |
| U14 | Footer wrapped to two rows on phones | Mobile override | #33 | e2e |

Infrastructure that made this measurable: deterministic visual harness with frozen clock and frozen CSS animations (#13), two harness fixes that made reference and app frames comparable (#22, #23). Non-UI bugs found on the way: worker sweeper deleted in-progress jobs (#26), PDF-to-Word retry (backup commit).

## 3. Screenshots

- Before/after/reference images for 1440, 1920, 768 and 390 px (light; dark for reference/after): `design/screenshots/`.
- Every state × viewport × theme (`ref-`, `app-`, `diff-`, `side-` PNGs) is regenerated locally by `npm run visual` into `reports/ui/` (git-ignored, ~1 GB).

## 4. Pixel diff per state (pixelmatch, threshold 0.12, orb interior masked)

Average over 5 viewports × 2 themes, baseline (before #14) vs last full run (after #31):

| State | before (avg) | after (avg) | pass before | pass after |
|---|---|---|---|---|
| a hero at rest | 2.4% | 0.6% | 6/10 | 10/10 |
| b cursor near the orb | 2.4% | 0.7% | 6/10 | 10/10 |
| c file dragged over the page | 3.5% | 1.0% | 4/10 | 8/10 |
| d workspace after the sample PDF | 2.7% | 1.9% | 5/10 | 7/10 |
| e typing a multi-step instruction | 4.1% | 1.5% | 4/10 | 8/10 |
| f plan running and done | 3.9% | 4.4% | 3/10 | 3/10 |
| g pasted JSON flow | 2.1% | 1.5% | 7/10 | 8/10 |
| h live panel (JSON Formatter) | 2.6% | 1.3% | 8/10 | 8/10 |
| i ⌘K palette | 22.6% | 0.9% | 0/10 | 8/10 |
| j Pro voice sheet | 6.8% | 40.8% | 0/10 | 0/10 |
| k scrolled 200 px (capsule nav) | 3.2% | 1.7% | 4/10 | 6/10 |
| l marquee band | 4.5% | 1.8% | 0/10 | 7/10 |
| m bento section | 4.4% | 0.9% | 0/10 | 8/10 |
| n Explore grid + tab change | 4.8% | 1.0% | 0/10 | 8/10 |
| o pricing (yearly) | 9.2% | 2.9% | 0/10 | 8/10 |
| p footer wordmark with the cursor over it | 10.6% | 6.8% | 0/10 | 6/10 |

After the full run:
- **j Pro voice sheet** — the harness opened the sheet differently on each page (reference: Pro plan button; app: nav). Fixed in #32: 1440 1.58% / 1.54%, 390 2.36% / 2.34% (light / dark).
- **p footer** — #33: 1440 0.74%, 768 2.11%, 390 12.3% (light).

Per viewport (last full run; **bold** = over 2%):

| State | 2560x1440 L / D | 1920x1080 L / D | 1440x900 L / D | 768x1024 L / D | 390x844 L / D |
|---|---|---|---|---|---|
| a hero at rest | 0.1 / 0.1 | 0.2 / 0.2 | 0.4 / 0.4 | 0.5 / 0.5 | 2.0 / 1.8 |
| b cursor near the orb | 0.2 / 0.2 | 0.3 / 0.3 | 0.5 / 0.4 | 0.5 / 0.5 | 2.0 / 1.8 |
| c file dragged over the page | 0.2 / 0.3 | 0.4 / 0.4 | 0.6 / 0.6 | 0.9 / 0.8 | **3.3** / **2.6** |
| d workspace after the sample PDF | 0.4 / 0.5 | 0.6 / 0.9 | 0.9 / 1.3 | 1.3 / **2.4** | **5.0** / **5.9** |
| e typing a multi-step instruction | 0.3 / 0.2 | 0.5 / 0.4 | 0.8 / 0.8 | 1.1 / 1.1 | **4.7** / **4.9** |
| f plan running and done | 1.5 / 1.3 | **3.3** / **2.6** | **3.1** / 1.8 | **6.3** / **5.2** | **9.5** / **9.1** |
| g pasted JSON flow | 0.4 / 0.2 | 0.6 / 0.4 | 0.9 / 0.7 | 1.5 / 1.1 | **4.8** / **4.7** |
| h live panel (JSON Formatter) | 0.4 / 0.4 | 0.7 / 0.7 | 0.7 / 0.6 | 0.9 / 1.0 | **3.7** / **3.8** |
| i ⌘K palette | 0.1 / 0.1 | 0.2 / 0.2 | 0.3 / 0.3 | 0.5 / 0.5 | **3.4** / **3.5** |
| j Pro voice sheet | **91.8** / **8.4** | **86.5** / **5.5** | **78.7** / **6.8** | **67.7** / **6.3** | **44.3** / **11.6** |
| k scrolled 200 px (capsule nav) | 1.1 / 0.4 | 1.3 / 0.5 | **2.1** / 0.7 | **2.1** / 2.0 | **3.8** / **2.9** |
| l marquee band | 1.6 / 1.3 | 1.0 / 1.1 | 1.1 / **2.0** | 1.5 / 1.9 | **3.2** / **3.4** |
| m bento section | 0.5 / 0.5 | 0.6 / 0.4 | 0.7 / 0.6 | 0.7 / 0.8 | **2.3** / **2.4** |
| n Explore grid + tab change | 0.3 / 0.2 | 0.6 / 0.5 | 0.8 / 1.1 | 0.5 / 0.8 | **2.1** / **2.7** |
| o pricing (yearly) | 0.3 / 0.5 | 0.8 / 0.8 | 0.8 / 0.9 | **11.4** / **10.6** | 1.3 / 1.3 |
| p footer wordmark with the cursor over it | 0.2 / 0.2 | 0.3 / 0.3 | 0.7 / 1.1 | **11.7** / **11.5** | **21.7** / **19.9** |

## 5. Lighthouse and axe

- axe (home, light): 0 violations, including the bento demo content (now present at load). Tool pages: axe runs in the tools e2e suite (light + dark).
- Lighthouse (mobile): see §8 (Phase 3 re-run on an idle machine).

## 6. Still open (with reason)

| Item | Why open | Next step |
|---|---|---|
| f plan running and done (3/10) | The app's plan runner fakes results (one made-up output, button stuck on "Running…"); the reference shows one result per step | Phase 4: run real tools; honest results |
| 390 px states (3/16 in the last full run) | Phone nav differs on purpose (reference overflows the screen with the full search pill; app shows an icon); remaining offsets cascade from it and from wrapped copy | Explained; revisit in Phase 3 |
| Pricing at 768 px (11%) | The reference overlaps the Free plan's button with its last feature row; the app doesn't | Explained, keep |
| Footer text colour, bento detail text, small file tiles | Use `--ink2` / a 28% shade to meet WCAG AA where the reference's muted grey (4.39:1) fails | Explained, keep (ASK in Phase 3 if the palette should change) |
| "queued job survives a worker restart" test | Timing race in the test under heavy load (relies on a still-fresh heartbeat) | Phase 4 |

## 7. How to re-run

```
npm run verify                # typecheck, lint, format, unit tests, build
npm run test:e2e              # Playwright on the production build
npm run visual                # reference vs app, all states/viewports/themes → reports/ui/summary.md
npm run visual -- --states a,h --vp 1440x900 --theme light   # a subset
```
Note: after editing `globals.css`, delete `.next/cache/turbopack` before building — Turbopack's persistent cache can keep serving the old CSS.

## 8. Phase 3 (Hallmark pass) results — tag `hallmark-pass`

**Visual compare against v1, the reference prototype:** 89/160 within 2% (Phase 2 ended at 113/160). The drop is the approved design changes, mainly Geist (A2), which changes every line of text and re-wraps phone layouts, then Explore (A3/F11), bento (A4/A7/F12) and pricing (A7). Every state was compared with the Phase 2 run, and no unexplained regression was found. The new look is saved as **v2** in `design/reference/v2/`, with the table of what moved and why. v1 stays at `design/reference/KlipKit_UI.html`.

**Lighthouse (mobile, 3 runs each, median, load average about 5):**

| Page | Perf | A11y | BP | SEO | LCP |
|---|---|---|---|---|---|
| / | 91 | 100 | 100 | 100 | 3.5 s |
| /image-compressor | 92 | 100 | 100 | 100 | 3.4 s |
| /heic-to-jpg | 91 | 100 | 100 | 100 | 3.6 s |
| /json-formatter | 91 | 100 | 100 | 100 | 3.6 s |
| /jwt-decoder | 92 | 100 | 100 | 100 | 3.4 s |
| /qr-code-generator | 86 → **92** after #58 | 100 | 100 | 100 | 4.2 → 3.4 s |
| /compress-image-to-50kb | 91 | 100 | 100 | 100 | 3.6 s |
| /heic-to-jpg-on-windows | 96 | 100 | 100 | 100 | 2.7 s |
| /wifi-qr-code-generator | 92 | 100 | 100 | 100 | 3.4 s |
| /image-tools, /developer-tools | 92 | 100 | 100 | 100 | 3.4 s |
| /compress-pdf, /background-remover, /pdf-to-word (beta, noindex) | 91–92 | 100 | 100 | 66 (noindex on purpose) | 3.4–3.6 s |

The mobile ≥ 90 gate passes on every page. The stricter LCP ≤ 2 s budget in `lighthouserc.cjs` doesn't pass yet. First paint is 0.9 s, and most of the LCP is "render delay", likely the web fonts on slow 4G. It's open for Phase 4/5.

**axe (WCAG 2.2 AA, serious and critical):** 0 violations across all 23 sitemap and beta pages × light/dark (46 runs), each page settled first. Two home tests are new (#59): one with the satellites settled, and one scrolled, where axe can resolve the hero's background.
