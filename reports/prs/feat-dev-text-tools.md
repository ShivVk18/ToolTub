# feat: Diff Checker, Code Minifier, HTML Playground, Text to Speech, Résumé Builder; home plans open the new tools

Fifth batch. Everything runs in the browser.

| Tool | How | Edge cases covered by tests |
|---|---|---|
| Text Compare (Diff Checker) | **Own Myers O(ND) diff**: lines, then words inside changed lines; side by side or unified patch; ignore whitespace/case | classic minimal example (D = 5), 200 random round trips, Unicode words, CRLF vs LF, identical inputs; memory bounded (O(D²) trace, falls back to "replaced" past 2,000 edits) |
| Code Minifier & Formatter (live panel) | Detects JS/CSS/HTML/JSON. JS: Terser (minify) and Prettier (format); CSS/HTML: **own safe minifiers**; Prettier for formatting | minified JS still runs, licence comments kept, CSS strings, `url("x y.png")` and `calc()` spacing kept, HTML `<pre>`/`<script>` kept byte-for-byte, conditional comments kept, parse errors explained |
| HTML / CSS / JS Playground | Live preview in a sandboxed iframe (no same-origin access) with a captured console; auto-saved in the browser; download as one HTML file | sandbox can't reach the page, runtime errors reported (WebKit hides details from sandboxed frames, so it says so), clicks in the first half-second keep their logs |
| Text to Speech | The device's voices (Web Speech API): speed, pitch, pause/resume; current word highlighted | stubbed speech engine in tests (headless browsers have no voices) |
| Resume Builder | Form → classic or modern A4 PDF with real text (pdf-lib), wrapping and page breaks; draft saved in the browser | PDF text read back with pdf.js, draft survives a reload, non-Latin text gets a clear message, name required |

**Home page plans now hand off to the new tools.**
- **PDFs:** "merge" → Merge PDF, "sign" → Fill & Sign, "protect" → Protect PDF.
- **Converting to PDF:** images → JPG to PDF, Office files → Word to PDF.
- **Video:** "make a gif" → Video to GIF, "extract the audio" → Extract Audio, "compress", "resize" and "convert" → the video tools.
- **Audio:** "compress" and "convert" → Audio Converter.
- **Video and audio:** "transcribe" → Transcription, "trim" → Video Trimmer.

Each offers "Continue in …" and carries the file over. Steps with no tool (formatting CSV, converting data to PDF, old `.doc` files) still say "Coming soon".

**Dependencies:** Terser 5.51 (BSD-2-Clause, approved) added. Prettier moved from devDependencies to dependencies (same version), because the browser now uses it. Both load only when the Code Minifier panel formats or minifies.

**Bugs fixed along the way:**
- **Playground:** the first auto-run after loading cleared the console even though the code hadn't changed.
- **Résumé:** the "Remove job" button was 40 px tall on phones; it's 44 px now.
- **Early paste (Phase 4 open item "Low"):** a paste in the first instant after loading the home page, before React attached its listener, was lost. An inline script now keeps it and the home page replays it. New e2e test pastes at `DOMContentLoaded`.
- **Tests that assumed unbuilt tools:** the `/image-tools` hub has no "Coming soon" section any more (it uses `/creator-tools` now), and `/search` takes live rows from "image" and coming-soon rows from "hashtag".
- **Test infrastructure:** parallel workers wrote the same media test clip to the same path at once, so one read a half-written file. The path is per worker now.
- **Test:** the live-panel option test waited a fixed 150 ms. It now waits for the new output, since Prettier loads on first use. It still requires every option to give different output.

**Not done (needs your decision):**
- **API Tester.** The site's Content-Security-Policy only allows connections to KlipKit itself (`connect-src 'self'`), so a browser-side API tester can't call other APIs. The fix would relax `connect-src` for the `/api-tester` page only (`https:` plus localhost). That's a security setting, so it's waiting for your OK. The component is written (`DevTools.tsx`, `ApiTester`) but not registered, so the tool stays "Coming soon".

**Full suite before shipping:** 1,267 passed. The 10 failures were the cases above, all fixed and re-run (138 passed across the four browser projects).

**Tests.**
- Unit: `diff.test.ts` (7), `minify.test.ts` (4), Code Minifier panel tests, plan hand-off cases.
- e2e: `dev-tools.spec.ts` (4); `plan.spec.ts` updated (protect now opens Protect PDF; the unbuilt case uses JSON → PDF); the A1/F5 Explore test uses Hashtag Finder, which is still unbuilt, and checks that Merge PDF opens its page.
- Universal checks for the 4 new pages.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
