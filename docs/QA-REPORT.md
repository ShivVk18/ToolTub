# KlipKit QA Report

Date: 2 November 2026 · Branch: `qa/test-suite` (25 commits on top of the baseline `366cdc2`) · Tested on macOS, Node 26, Next.js 16.4.4.

**Bottom line:** the app builds and runs in development, as a production standalone build and in Docker Compose. Testing found **30 app bugs**: 29 are fixed, each reproduced first and re-tested, with its own commit; 1 is only partly fixed (LCP improved from 3.07 s to 2.6 s but is still above the 2.0 s target). The automated suite now has **77 unit tests and 420 browser tests**. On the final run everything that could run passed: **372 browser tests passed, 0 failed** (48 skipped by design) on Chromium, WebKit/Safari, Pixel 7 and iPhone 14, plus 77/77 unit tests, lint and type checks. Firefox could not be launched in this session's sandbox; the tests are written for it and will run in CI and on a normal machine (§5).

---

## 1. Triage: why it wasn't working

| Step | Result before | Blocker / root cause | Fix |
|---|---|---|---|
| `npm ci` | OK | — | — |
| `npx tsc --noEmit` | OK, 0 errors | — | — |
| `npm run lint` | **Failed: 2 errors, 1,224 warnings** | ESLint scanned the minified onnxruntime/libheif bundles copied into `public/vendor` at install time | Ignore `public/vendor` (`dfcf844`) |
| `npm run build` | OK (68 pages) | — | — |
| `npm run start` | **Warned "next start does not work with output: standalone"** | Local production runs differed from Docker | `start` now runs the standalone server (`e437031`) |
| Browser console on home + 3 tools | Clean on Chromium | Other browsers and devices had real bugs (§4) | — |
| `docker compose up` | **Not runnable as documented** | `.env.example` was excluded by the default `.env*` gitignore pattern, so the documented `cp .env.example .env` step had no file | Committed and completed `.env.example` (`fd58ee8`) |
| Server tools after an outage | **Broken until restart** | After Valkey had been down once, the shared Redis client stayed closed, so every server-tool request returned 503 | Clients rebuilt when ended (`e00bd5f`) |
| Env variables | 4 of 13 documented | — | `.env.example` lists every variable the code reads |

The project-specific risks from your checklist were each checked in code and by tests:

| Risk from the brief | Finding |
|---|---|
| `"use client"` missing / browser libs imported on the server | None. pdf-lib, libheif and ONNX load only inside Web Workers or via dynamic `import()`. |
| WASM / worker / model files not served | Served from `/vendor` with correct types (`application/wasm`) and immutable caching (test `api.spec`). The ONNX model file is **not in the repo** by design (see `public/models/README.md`). |
| pdf.js worker path | Not applicable: pdf.js isn't used by any built tool yet. |
| ffmpeg.wasm / COOP-COEP | Not applicable: no media tools are built. COEP is deliberately off; a test asserts it's absent. |
| Workers not bundling | Bundled correctly by Turbopack; verified in Chromium and WebKit. |
| `localStorage` during server render | No crash; the private-mode test passes with `localStorage` throwing. |
| `[slug]` route / `generateStaticParams` | Correct for all 21 routed pages; unknown slugs return a real 404. |
| Object URL leaks | `download()` revokes its URLs; the Background Remover preview URL was never revoked (fixed, bug 30). |
| Files deleted after 1 hour | Verified with a 6-second retention in tests and the real sweeper in Docker. |

---

## 2. Feature inventory (from the code, not the plan)

Registry: 78 tools. **10 have a page** (5 live and indexed, 5 beta and noindex); **68 are "planned"**. Planned tools have no route, show as "Coming soon" in search and on hubs, and are never linked as working tools (tested).

| # | Tool / feature | Route | Category | Build | Status | Notes |
|---|---|---|---|---|---|---|
| 1 | Image Compressor | /image-compressor, /compress-image-to-50kb | Productivity | own | **complete (live)** | batch, target KB, ZIP |
| 2 | HEIC to JPG | /heic-to-jpg, /heic-to-jpg-on-windows | Productivity | lib (libheif, LGPL file) | **complete (live)** | |
| 3 | JSON Formatter | /json-formatter | Developer | own | **complete (live)** | worker above 1 MB, 200 KB preview |
| 4 | JWT Decoder | /jwt-decoder | Developer | own | **complete (live)** | decode only, says so |
| 5 | QR Code Generator | /qr-code-generator, /wifi-qr-code-generator | Productivity | lib (qrcode) | **complete (live)** | logo option not built (copy says "planned") |
| 6 | Compress PDF | /compress-pdf, /compress-pdf-to-100kb | Productivity | own + lib (pdf-lib) | complete (beta) | JPEG images only; noindex until benchmarked |
| 7 | Image Resizer | /image-resizer | Productivity | own | partial (beta) | max width/height only; no %, presets or explicit aspect-ratio toggle; no ToolSEO |
| 8 | Image Converter | /image-converter | Productivity | own | partial (beta) | JPG/PNG/WebP out; no AVIF output; Safari can't save WebP (says so) |
| 9 | Background Remover | /background-remover | Creator | model (ISNet) | partial (beta) | works in Chromium with the model; **model file not shipped**; WebKit crashed with the full-size test model |
| 10 | PDF to Word | /pdf-to-word | Productivity | srv (LibreOffice) | complete (beta) | text PDFs; no ToolSEO |
| — | Homepage | / | Platform | — | complete | |
| — | Universal search + Cmd/Ctrl+K | all pages, /search | Platform | — | complete | synonyms, keyboard |
| — | Category hubs (7) | /pdf-tools … | Platform | — | complete | |
| — | Recents + favourites | localStorage | Platform | — | complete | survives private mode |
| — | Dark/light theme | toggle | Platform | — | complete | no flash |
| — | Tool Chains (3 presets) | /chain/* | Platform | — | complete | visual builder **missing** |
| — | Send to next tool | result actions | Platform | — | complete | |
| — | PWA / offline | sw.js | Platform | — | complete | |
| — | Privacy badges, related tools | every tool | Platform | — | complete | |
| — | SEO files | sitemaps, robots, llms, OG, manifest | Platform | — | complete | |
| — | Guides, compare pages, changelog | — | Platform | — | **missing** | in the plan only |

---

## 3. Test results

How each column was measured: **Unit** = Vitest. **E2E** = Playwright; output files were opened and checked, not just "button appeared". **Privacy** = every request recorded during processing; the test fails on any third-party origin or any request carrying a body. **a11y** = axe, zero serious/critical in light and dark. **SEO** = raw HTML without JavaScript.

| Tool | Unit | Chrome | Safari (WebKit) | Pixel 7 | iPhone 14 | Firefox | Privacy (no upload / no 3rd party) | a11y | SEO | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Image Compressor | ✅ (fit, names) | ✅ 14/14 | ✅ 14/14 | ✅ 14/14 | ✅ 14/14 | not run | ✅ | ✅ | ✅ | **Working** | Output dims/format/size checked; target 50 KB met in every browser; PNG alpha kept; ZIP |
| Image Resizer | ✅ (fit) | ✅ 6/6 | ✅ 6/6 | ✅ 6/6 | ✅ 6/6 | not run | ✅ | ✅ | noindex (beta) | **Working** (partial features) | Exact 600×400 and 1600×1067 verified |
| Image Converter | — | ✅ 7/7 | ✅ 7/7 | ✅ 7/7 | ✅ 7/7 | not run | ✅ | ✅ | noindex (beta) | **Working** | JPG/PNG/WebP/GIF/AVIF in; Safari can't encode WebP and says so |
| HEIC to JPG | — | ✅ 6/6 | ✅ 6/6 | ✅ 6/6 | ✅ 6/6 | not run | ✅ | ✅ | ✅ | **Working** | Real HEIC → valid 900×600 JPG; slow-3G run passes |
| Compress PDF | — | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | ✅ 9/9 | not run | ✅ | ✅ | noindex (beta) | **Working** | 10.8 MB → <50 %, 6 pages kept; 20-page and encrypted/fake PDFs handled |
| PDF to Word | — | ✅ 4/4 | ✅ 4/4 | ✅ 4/4 | ✅ 4/4 | not run | ✅ own server only | ✅ | noindex (beta) | **Working** | 8/8 server tests: DOCX text checked, outages, restart, expiry, rate limit; also in Docker |
| JSON Formatter | ✅ 22 | ✅ 8/8 | ✅ 7/7 | ✅ 8/8 | ✅ 7/7 | not run | ✅ | ✅ | ✅ | **Working** | Line 7 in all engines; 5 MB without frame gaps > 500 ms; clipboard checked in Chromium |
| JWT Decoder | ✅ 9 | ✅ 7/7 | ✅ 7/7 | ✅ 7/7 | ✅ 7/7 | not run | ✅ | ✅ | ✅ | **Working** | Expired/valid/malformed; "not verified" shown |
| QR Code Generator | ✅ 5 | ✅ 6/6 | ✅ 6/6 | ✅ 6/6 | ✅ 6/6 | not run | ✅ | ✅ | ✅ | **Working** | PNG decoded at 1024×1024 + SVG; Wi-Fi escaping fixed |
| Background Remover | — | ✅ 5/5 | ✅ 5/5 | ✅ 5/5 | ✅ 5/5 | not run | ✅ | ✅ | noindex (beta) | **Partly verified** | With the model: Chromium ✅ (transparent PNG, cached second run); WebKit crashed with the 178 MB test model. Model file not shipped. |
| Platform: home, search, recents/favourites, theme, chains, hubs, 404 | ✅ search 11 | ✅ 17/17 | ✅ 17/17 | ✅ 16/16 | ✅ 16/16 | not run | ✅ | ✅ | ✅ | **Working** | Private mode, no theme flash, all 3 chains verified by output |
| SEO/AEO/GEO (all sitemap URLs + beta) | ✅ 9 | ✅ 6/6 (raw HTML) | — | — | — | — | — | — | ✅ | **Working** | Titles, descriptions, canonical, OG 1200×630, JSON-LD types, visible FAQs, robots, llms.txt links, hreflang |
| Links, PWA/offline, security headers | — | ✅ 6/6 | — | — | — | — | ✅ | — | ✅ | **Working** | No broken internal links; offline after first visit |

Counts are tests run per project; skipped tests (mobile-only on desktop, clipboard outside Chromium, the model test when no model file exists) aren't counted.

Firefox column: the tests exist and run in CI. Here Firefox exited at launch with "Could not find profile folder", even after a clean reinstall, and running it outside the sandbox was not permitted. **Not verified on Firefox.**

---

## 4. Bug table

Severity: **C** critical · **H** high · **M** medium · **L** low. Every fix was re-tested by the test that first failed and by the full suite.

| ID | Sev | Tool / area | Problem | Root cause | Fix | Commit | Re-tested |
|---|---|---|---|---|---|---|---|
| 1 | H | Build | `npm run lint` failed | Linted minified vendor bundles | Ignore `public/vendor` | dfcf844 | ✅ |
| 2 | M | Build | `npm start` warned, didn't match Docker | `next start` unsupported with standalone | Start script for the standalone server | e437031 | ✅ |
| 3 | H | QR Code | Wi-Fi codes with `\` in the SSID/password joined the wrong network | Regex `[\;,:"]` never escaped backslash | Correct escaping + unit tests | 5674dc6 | ✅ |
| 4 | L | Registry | Related link to a tool that doesn't exist | `curl-to-code` removed earlier, link left | Link and doc row fixed | f3ecd1c | ✅ |
| 5 | M | Content (AEO) | All 7 explainers 105–133 words (spec 150–300) | Under-written | Practical paragraph added | 72ebc63 | ✅ |
| 6 | **C** | Docker | Documented setup step had no file | `.env.example` ignored by `.env*` | Committed, all 13 vars | fd58ee8 | ✅ |
| 7 | H | Server tools | Worker down → jobs accepted and wait forever | No liveness signal | Worker heartbeat; 503 "temporarily unavailable" | fd58ee8 | ✅ (Docker too) |
| 8 | M | Server tools | Logs flooded with ECONNREFUSED while Valkey down | No error listener on the queue client | Quiet listeners, lazy connect | fd58ee8 | ✅ |
| 9 | M | Server tools | No queue position shown | Not implemented | `position` in status + UI | fd58ee8 | ✅ |
| 10 | H | All file tools | File over the size limit silently ignored | Error passed to an optional callback no tool used | Dropzone shows the message | 2a5dba8 | ✅ |
| 11 | H | All file tools (a11y) | File input had no accessible name (axe serious) | Missing label | `aria-label` | 2a5dba8 | ✅ |
| 12 | M | All file tools | Choosing the same file again did nothing | Input value not reset | Reset after each pick | 2a5dba8 | ✅ |
| 13 | M | Image tools | Output named like the input (`photo.jpg`), can overwrite the original | No suffix | `-compressed` / `-resized` | 66fb2bd | ✅ |
| 14 | H | Image tools | "Download all" saved only the first file in most browsers | N separate downloads get blocked | One ZIP (fflate) | 66fb2bd | ✅ |
| 15 | M | Tool Chains | A failure didn't say which step failed | Raw decoder message | "Step 1 (Image Resizer) failed: …" | 54bb266 | ✅ |
| 16 | H | PWA | Offline reload failed after the first visit | First page load is never seen by the SW | Page sends loaded URLs to the SW | 2e33299 | ✅ |
| 17 | H | SEO | Home/About/Privacy/Licences: no canonical, OG or Twitter tags | Pages didn't use the shared builder | `pageMetadata` + OG images | 3a2b001 | ✅ |
| 18 | M | SEO | 13 pages with descriptions outside 140–160 chars | Short copy | Rewritten + unit guard | 3a2b001 | ✅ |
| 19 | **C** | All tools | Input before the page finished loading was lost (file, text, option) | Server-rendered controls are usable before hydration | `<fieldset disabled>` until interactive | 097ead0 | ✅ |
| 20 | M | Mobile | Logo, search, theme, inputs, selects 28–40 px (< 44) | Desktop sizes | 44 px on phones | ae3aa8d | ✅ |
| 21 | H | a11y | Comparison table not reachable by keyboard (axe serious) | Scroll region not focusable | `tabIndex=0` + label | ae3aa8d | ✅ |
| 22 | H | JSON Formatter | Wrong error line in Safari (8 instead of 7) | Only V8 includes a position in `JSON.parse` errors | Own error locator; matches V8 exhaustively | e0a4114 | ✅ |
| 23 | M | JSON Formatter | 5 MB result froze Safari 0.5–0.8 s | Megabytes rendered into the DOM | 200 KB preview, full copy/download | e0a4114 | ✅ |
| 24 | H | Image Compressor | Safari missed target size (71 KB for a 50 KB target) | Safari's JPEGs are 20–70% larger; loop gave up after 8 fixed shrinks | Measure-and-scale loop | 1b5bdcb | ✅ |
| 25 | **C** | Server tools | After any Valkey outage, server tools failed until the app restarted | Shared client left permanently closed; errors were swallowed | Rebuild ended clients; separate BullMQ connection; fast ping; error logged | e00bd5f | ✅ (Docker too) |
| 26 | M | Mobile | Favourite star squeezed to 36–43 px by long titles | Flex shrink | `shrink-0` | cc19ff0 | ✅ |
| 27 | M | Performance | QR page layout shift 0.082 | Code appeared after load | Reserved space → 0.009 | 5d1e14e | ✅ |
| 28 | M | a11y | Hub "Coming soon" cards fail contrast | `opacity-70` on muted text | Removed; hubs now in axe tests | ebaae91 | ✅ |
| 29 | M | Performance | LCP 3.07 s on tool pages | Second font (71 KB) preloaded everywhere; font swap | One font, `display: optional` → 2.62 s | a25ada9 | partial: still above 2.0 s (§5) |
| 30 | L | Background Remover | Preview PNG kept in memory after each run | Object URL never revoked | Revoke on replace/unmount | 77b21b5 | ✅ |

**Test-suite bugs I fixed (not app bugs, listed for honesty):**
- `getByRole("alert")` also matched Next's hidden route announcer.
- Next keeps the previous page mounted after navigation, so selectors needed `:visible`.
- The mobile file pattern also matched `server-tools.spec`.
- Safari tabs to buttons only with Option+Tab.
- The "coming soon" search test assumed result order.
- `reuseExistingServer` could silently test a stale build; it's now off.

No test was weakened to pass.

---

## 5. Still broken or not verified

| Item | Why | Suggested next step |
|---|---|---|
| **LCP 2.6–2.8 s** (target < 2.0 s) on Lighthouse mobile simulation | Not the font: system fonts gave the same LCP (FCP fell 1.36 → 0.91 s). Lighthouse's model attributes the LCP to a point after the JavaScript loads. Performance scores are still 92–97. | Measure field data (real devices) before more lab tuning: add `web-vitals` reporting to self-hosted Umami. Then try `experimental.inlineCss` and splitting the tool widget out of the first render. |
| **Firefox not run** | Sandbox in this session | Run `npx playwright test --project=firefox` on your Mac; CI runs it on every push. |
| **Background Remover on Safari** | WebKit tab crashed when reloading with the 178 MB full-precision test model | Produce the planned 44 MB int8 model, add it to `public/models/`, and re-run the Background Remover tests on WebKit and iPhone. |
| **HEIC orientation (EXIF rotation)** | No real iPhone photo with a rotation flag among the fixtures | Add one portrait iPhone HEIC to `tests/fixtures` and assert width < height. |
| **Rich Results Test / Schema.org validator** | These are Google's and schema.org's websites; they need a public URL | After deploy, test /image-compressor, /heic-to-jpg, /json-formatter, /jwt-decoder and /qr-code-generator there. JSON-LD already parses and has the right types (automated). |

## 6. Missing or stub features (promised by the plan, not in the code)

- 68 of 78 tools (all "planned": Merge/Split PDF, Word to PDF, OCR, Base64, Regex, UUID, Hash, all video tools, and more).
- Image Resizer: percentage resize, platform presets, explicit "keep aspect ratio" toggle.
- Image Converter: AVIF output.
- QR Code: logo overlay.
- Tool Chains: visual builder and shareable custom chains.
- Guides, comparison pages, changelog, glossary.
- Cancel button for long jobs; recents/favourites "clear" button.
- Web-vitals field reporting.

Tests were written only for what exists. The registry, unit tests and the "no link to a tool that doesn't work" test keep planned tools from appearing as working.

## 7. Lighthouse (mobile simulation, median of 3 runs)

| Page | Perf before → after | A11y | Best practices | SEO | LCP before → after | CLS before → after |
|---|---|---|---|---|---|---|
| / | 94 → 97 | 100 | 100 | 100 | 3.07 → 2.62 s | 0 |
| /image-compressor | 94 → 96 | 100 | 100 | 100 | 3.07 → 2.77 s | 0 |
| /heic-to-jpg | 94 → 97 | 100 | 100 | 100 | 3.07 → 2.63 s | 0 |
| /json-formatter | 94 → 96 | 100 | 100 | 100 | 3.08 → 2.77 s | 0 |
| /jwt-decoder | 94 → 97 | 100 | 100 | 100 | 3.07 → 2.62 s | 0 |
| /qr-code-generator | 87 → 92 | 100 | 100 | 100 | 3.82 → 3.38 s | 0.082 → 0.009 |
| /compress-image-to-50kb | 94 → 97 | 100 | 100 | 100 | 3.07 → 2.62 s | 0 |
| /image-tools | 95 → 97 | 96 → 100 | 100 | 100 | 2.92 → 2.62 s | 0 |
| /developer-tools | 95 → 97 | 96 → 100 | 100 | 100 | 2.92 → 2.62 s | 0 |
| /compress-pdf (beta) | 94 → 96 | 100 | 100 | 66* | 3.07 → 2.77 s | 0 |
| /background-remover (beta) | 94 → 96 | 100 | 100 | 66* | 3.07 → 2.77 s | 0 |
| /pdf-to-word (beta) | 95 → 97 | 100 | 100 | 66* | 2.92 → 2.62 s | 0 |

*Beta pages are `noindex` on purpose, so Lighthouse SEO flags them. Total blocking time is 6–50 ms everywhere (lab proxy for INP < 200 ms). Heavy libraries are not in the homepage bundle: pdf-lib, libheif and ONNX load only inside their tools' workers.

**Security results (all automated, all pass):**
- CSP on every page, `frame-ancestors 'none'`, `nosniff`; no `X-Powered-By`; no COOP/COEP (no media routes).
- Uploads: type checked by content (`%PDF-`), 50 MB limit (413), unknown tool (400); 50 rapid uploads → blocked after 20 (429).
- A `../../../../tmp/klipkit-evil.pdf` file name can't write outside the job folder.
- No secrets or server config strings in client bundles; no `.env` committed.
- Docker worker: no DNS, no outbound network, read-only file system, non-root, zero capabilities.

---

## 8. How to run the tests yourself

One-time setup (macOS):

```bash
cd klipkit
npm ci                                        # also copies browser engines into public/vendor
npx playwright install chromium firefox webkit
brew install redis                            # or valkey; only for the server-tool tests
# LibreOffice.app in /Applications is detected automatically (server-tool tests)
```

Everyday commands:

| Command | What it runs | Time |
|---|---|---|
| `npm test` | 77 unit tests | ~1 s |
| `npm run test:e2e` | build + every Playwright project | ~15 min |
| `npx playwright test --project=chromium` | one browser only | ~3 min |
| `npm run test:a11y` | the axe tests across browsers | ~2 min |
| `npm run test:perf` | build + Lighthouse CI (14 pages × 3) | ~6 min |
| `npm run test:all` | lint + types + unit + build + e2e | ~17 min |
| `npx playwright show-report` | open the HTML report of the last run | — |

Server-tool tests start their own Redis and the real worker, and skip with a reason if `redis-server`/`valkey-server` or LibreOffice is missing. The Background Remover "with model" test runs only when `public/models/isnet-general-use-int8.onnx` exists.

Docker smoke test without HTTPS:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d app worker valkey umami umami-db
open http://127.0.0.1:3400
```

## 9. CI

- `.github/workflows/test.yml` runs on every push and pull request: install, LibreOffice, Playwright browsers, lint, types, unit, build, all Playwright projects (Firefox included), Lighthouse CI. Valkey runs as a service container. Reports are uploaded as artifacts.
- Local guard: `ln -sf ../../scripts/pre-push.sh .git/hooks/pre-push` runs `npm run test:all` before every push.
