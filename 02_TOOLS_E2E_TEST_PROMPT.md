# Task 2 — Test every KlipKit tool end to end, fix the bugs, and write the report

## Role
You are a senior QA engineer. Prove that **every tool and every input flow in KlipKit actually produces correct output**, fix what's broken, and produce an honest report. Start only after task 1's checklist passes.

**Rule:** a tool passes only if its **output was checked** (parsed, measured, compared with an expected value). "The page loaded" is not a pass.

---

## 1. Inventory (read it from the code, not from the plan)
List every tool in the tool registry and every flow. Columns:
- Tool / flow
- Route / deep link
- Category
- Build type (own / lib / model / srv)
- Input type (file / paste / ask / none)
- Status in code (complete / partial / stub / missing)

Anything in the UI with no working implementation must be hidden or labelled "Coming soon". List those separately in the report.

## 2. Test setup
- **Vitest** for pure logic in `lib/` (intent parser, paste detector, generators, converters).
- **Playwright** (Chromium, Firefox, WebKit + Pixel 7 and iPhone 14 viewports).
  - Context: `timezoneId: 'Asia/Kolkata'`, `locale: 'en-IN'`, and a frozen clock `page.clock.install({ time: new Date('2026-11-04T10:07:00+05:30') })` so timestamp and cron results are deterministic.
- **axe-core** for accessibility, **Lighthouse CI** for performance.
- **Network guard (privacy):** record every request during each test. **Fail** if any request goes to a third-party domain, or if file or pasted content appears in any request body to a URL that isn't KlipKit's own private-server endpoint.
- **Fixtures** in `tests/fixtures/`:
  - **PDF:** 1-page, 24-page, image-heavy ~10 MB, password-protected, corrupted
  - **Images:** JPG, PNG with transparency, WebP, AVIF, real iPhone HEIC, 6000×4000, 1×1, corrupted
  - **Office:** DOCX, XLSX, PPTX
  - **Media:** MP4 10 s, MP4 2 min, MP3, WAV, short speech clip
  - **Text:** empty, 1 MB, emoji, Hindi, right-to-left
  - **Developer:** valid JSON, invalid JSON, 5 MB JSON, JWTs (valid, expired, malformed), SQL, YAML, CSV with quoted commas
- npm scripts: `test:unit`, `test:e2e`, `test:a11y`, `test:perf`, `test:all`, `test:report`.

## 3. Universal checks (run for every tool)

**Entry points:** open the tool via
- (1) its direct route / deep link
- (2) ⌘K search
- (3) the Explore grid card
- (4) chat ("open X") or the matching suggestion chip
- (5) for text tools, paste detection or "Open in [Tool] ⤢"

**Input:**
- drag-and-drop, file picker, paste (⌘V anywhere), sample button
- empty input, wrong type, too large, corrupted
- each must give a **clear message** and never crash or freeze

**Output:**
- **verify the result itself:**
  - PDF page count via pdf-lib
  - image dimensions and format
  - JSON parses
  - hashes equal the known vectors
  - CSV ↔ JSON round-trips
  - TypeScript output compiles with `tsc --noEmit`
- Copy works (read the clipboard back)
- Download works and has a sensible file name
- "Send to next tool" / "What next?" carries the output forward

**Quality:**
- privacy (network guard)
- keyboard-only use
- axe has 0 serious issues
- mobile layout has no horizontal scroll
- light and dark mode
- time per run recorded (dev tools under 50 ms for normal inputs; the UI never blocks for more than 200 ms)

## 4. Expected values (use exactly these)

| Tool | Input | Expected |
|---|---|---|
| Hash Generator | `abc` | SHA-1 `a9993e364706816aba3e25717850c26c9cd0d89d` · SHA-256 `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` · SHA-512 starts `ddaf35a193617abacc417349ae204131` |
| Hash (chat) | `sha256 of hello world` | `b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9` |
| Base64 encode | `KlipKit ✨` | `S2xpcEtpdCDinKg=` (and decoding it gives the original, emoji intact) |
| Base64 (chat) | `base64 of "hello world"` | `aGVsbG8gd29ybGQ=` |
| URL encode | `compress pdf & split?` | `compress%20pdf%20%26%20split%3F` |
| Timestamp | `1730592000` | ISO `2024-11-03T00:00:00.000Z` · IST `Sunday, 3 November 2024 at 5:30:00 am IST` · 13-digit ms input gives the same date |
| JWT Decoder | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzQyIiwibmFtZSI6IkFzaGEgUmFvIiwiaWF0IjoxNzMwNTAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.c2lnbmF0dXJl` | alg `HS256`, sub `user_42`, name `Asha Rao`, status **Valid** (exp 1900000000), with a "signature not verified" note |
| JWT expired | the same payload with `exp: 1730503600` | status **Expired** |
| JSON Formatter | `{"a":1,"b":[1,2]}` | 2-space pretty output with 8 lines; Minify returns the original compact string |
| JSON errors | `{"a":1,}` | **line 1, column 8**, "Trailing comma" |
| JSON errors | `{'a':1}` | "Use double quotes", line 1 col 2 |
| JSON errors | `{a:1}` | "Keys need double quotes" |
| JSON errors | `{"a":[1,2` | "Unexpected end — something isn't closed" |
| CSV ↔ JSON | `name,city\nRohan,"Delhi, NCR"` | `[{"name":"Rohan","city":"Delhi, NCR"}]`, and the round-trip gives identical CSV |
| JSON to TS | `{"id":1,"tags":["a"],"addr":{"pin":411001}}` | `interface Addr { pin: number }` and `interface Root { id: number; tags: string[]; addr: Addr }`; compiles with `tsc` |
| Cron (clock frozen at 2026-11-04 10:07 IST) | `*/15 9-18 * * 1-5` | "Every 15 minutes, from 09:00 to 18:59, on Monday to Friday"; next runs 10:15, 10:30, 10:45, 11:00, 11:15 (Wed 4 Nov) |
| Color Converter | `#6D5DF5` | `rgb(109, 93, 245)`, `hsl(246, 88%, 66%)`, contrast with white ≈ 4.6:1 (AA) |
| Regex Tester | pattern `[\w.+-]+@[\w-]+\.[\w.]+`, flags `g`, text `asha@klipkit.com or rohan.dev@example.in — not @x` | exactly **2 matches** |
| UUID Generator | count 10 000 | all match the v4 regex `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, **0 duplicates** |
| Password | length 24 | 24 characters, from the allowed set, no repeats across 1 000 runs |
| Word Counter | `Hello world. This is KlipKit.` | 5 words, 2 sentences |
| Case Converter | `drop it paste it` | camelCase `dropItPasteIt` · snake_case `drop_it_paste_it` · kebab-case `drop-it-paste-it` · Title `Drop It Paste It` · UPPER `DROP IT PASTE IT` |
| SQL Formatter | `select a from t where x=1 and y=2` | keywords uppercased; `FROM`, `WHERE` on new lines; `AND` indented |
| Image Compressor (real) | 1600×1200 PNG + "compress to under 200 kb" | output ≤ 200 KB, decodes as a valid image, same dimensions |
| Resize | "resize for instagram" | output fits within 1080×1350, aspect ratio kept |
| PDF Merge / Split / Compress | fixtures | page counts correct (merge = sum; split "pages 1-5" = 5); compressed output is smaller and still opens |
| PDF ↔ Word (server) | DOCX / 24-page PDF | the output opens and contains the fixture text; temp files deleted after expiry (test with a short expiry); the job survives a worker restart |

> If the reference HTML and these expected values disagree, the **expected values win**. Fix the code, and note the difference in the report.

## 5. Flow tests (beyond single tools)

1. **Intent parser** (`lib/intent.ts`, at least 30 cases): each phrase + file type gives the expected **ordered steps, parameters and highlight spans**. Must include:
   - `compress to under 2 mb and split pages 1-5` (pdf) → [compress ≤2 MB, split 1–5]
   - `make a gif and extract the audio` (video) → [gif, extract audio]
   - `remove the background and convert to webp` (image) → [bg, convert webp]
   - `resize for instagram` (image) → resize 1080×1350
   - `trim 0:10 to 0:30` (audio) → trim 0:10 → 0:30
   - `protect it with a password` (pdf) → protect
   - steps that don't apply (`split pages` on an MP3) are marked not-ok and get a kind reply
2. **Paste detection** (`lib/detect.ts`): JWT, valid JSON, invalid JSON, 10- and 13-digit timestamps, `#hex`/`rgb()`/`hsl()`, cron, SQL, URL, Base64, `/regex/flags`, CSV, plain text. Also check that **text that merely contains these** is not mis-detected (e.g. the sentence "select a plan" is text, not SQL).
3. **Generators from chat and from the hero ask bar:** UUIDs (count), password (length), lorem (paragraphs), hash, base64, current timestamp (frozen clock), QR (opens the QR tool).
4. **Global paste:** ⌘V on the page body with (a) an image file, (b) JSON text, (c) a JWT. Each starts the right flow. Pasting a short normal sentence into the composer stays in the composer.
5. **Drop flow:** drag over the page (veil + orb energised + satellites pulled in), drop, fly-in chip, file card with correct metadata (PDF page count, image dimensions, media duration), suggestions for the file type, multi-PDF drop suggests Merge.
6. **Plan → Run → Results:** progress counters, checks, confetti, results with real sizes, Copy and Download, "What next?" continues the chain on the output.
7. **Live panel:** every option button changes the output; Sample / Clear / Copy; status bar; full screen + Esc; ⌘Enter; deep link for every live tool; "Open in [Tool] ⤢" carries the content in.
8. **⌘K palette:** synonyms (shrink → Compress PDF, jwt → JWT Decoder, bg → Background Remover, iphone → HEIC to JPG), arrow keys + Enter, Esc, no results state.
9. **Voice (Pro) demo:** the sheet opens, the demo streams words with live highlighting, then auto-sends.
10. **Theme, recents and localStorage blocked:** private mode / storage throwing must not crash anything.

## 6. Fix loop
For every failure:
1. log it
2. write a failing test
3. find the root cause and fix it
4. re-run that test and then the full suite
5. commit

Severity order: **Critical** (crash, wrong output, privacy leak) → **High** (tool doesn't work) → **Medium** (UX or accessibility) → **Low** (cosmetic).

Ask me before fixing anything that needs a new dependency or a server change.

## 7. Deliverables (final step)

1. **`reports/tools-e2e-report.md`** with:
   - **Summary:** total tools, passed, failed, skipped (not implemented), with pass rate %, and flows passed/failed.
   - **Tool matrix:** one row per tool:

     | Tool | Entry points (5) | Input checks | **Output verified** | Copy/Download | Privacy | a11y | Mobile | Dark | Avg ms | Status |
     |---|---|---|---|---|---|---|---|---|---|---|
   - **Flow results** (sections 5.1–5.10) with the case counts.
   - **Bug table:**

     | ID | Severity | Tool/Flow | Problem | Root cause | Fix | Commit | Re-tested ✅ |
     |---|---|---|---|---|---|---|---|
   - **Still failing / not implemented,** with the reason and the next step.
   - **Privacy results:** requests per tool, and any third-party domain seen (should be none).
   - **Performance:** Lighthouse scores, and the slowest 10 tools with their times.
   - **Screenshots** of every failure (before/after) in `reports/e2e/`.
2. **`reports/tools-e2e-report.html`:** the same report as a single styled page using the KlipKit tokens (cards, pass/fail pills, filterable table). No external resources.
3. **`reports/tools-e2e-results.json`:** machine-readable results for CI.
4. **A CI workflow** (`.github/workflows/test.yml`) that runs `test:all` on every push and uploads the reports as artifacts.
5. **"How to re-run"**: the exact commands, in plain steps, at the end of the markdown report.
