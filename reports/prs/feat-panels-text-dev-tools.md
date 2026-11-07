# feat: 15 new live tools (text, developer and creator panels)

The first batch of "Coming soon" tools, now working. All run on the device and open as live panels on the home page (`/#slug`, Explore card, ⌘K).

| Tool | What it does | Edge cases covered by tests |
|---|---|---|
| Unit Converter | "5 km to mi", "100 f in c", "1.5 GB" (no target → every common unit). Length, mass, temperature, volume, data (KB and KiB), time, speed, area | "1,000", "2.5e3", "5km" without a space, several targets, unknown units, mass → length, below absolute zero, empty |
| Time Zone Converter | "10:30 IST to PST, London", "6pm London in Tokyo", "now in Tokyo", dates; DST-aware via Intl | day rollover (±1 day), summer vs winter offsets, 13pm, 25:00, unknown zones, no time given |
| YAML ↔ JSON | Both ways (`yaml` package, ~31 KB gzipped, loaded only when this panel runs) | strings YAML would misread ("yes", "on", "007", "1.0", "0o17", "~", dates) are quoted so the output reads back identically in YAML 1.2 and 1.1; duplicate keys rejected; alias bombs capped; invalid input on both sides |
| .env Redactor | Hide secrets (smart), hide all values, or keys only | `export`, quoted values, `=` inside values, inline comments, multi-line quoted keys, passwords inside connection URLs, comments and blank lines kept |
| Meta Tag Generator | title/description/url/image/site/twitter → `<head>` tags with Open Graph and Twitter | HTML-escaped values, length warnings (60/160), non-URL and bad handle warnings, missing title |
| Schema Generator | JSON-LD for Article, Product, FAQ, Organization | `</script>` in a value can't break out; currency guessed from ₹/€; dangling question; repeated `sameas` |
| Chmod Calculator | 755 ↔ rwxr-xr-x with a table and the command | setuid/setgid/sticky (4755, 1777, rwS, drwxrwxrwt), 0644, invalid digits and lengths |
| HTML Entities | Encode, encode all (non-ASCII too), decode | emoji (astral), surrogates and NUL left alone, unknown names counted, full round-trip |
| Base Converter | binary / octal / decimal / hex, auto-detecting 0x/0b/0o | BigInt (2^64 and beyond), negatives, separators, wrong digits, mismatched prefix, decimals |
| CSS Gradients | Linear, radial, box shadow, with a live swatch | 1 colour, 9 colours, invalid colours, angle not misread as an offset |
| Post Formatter | Unicode bold / italic / bold italic / mono / script, with platform limits | letter gaps (italic h, script B/E/F/H/I/L/M/R/e/g/o), emoji and accents kept, grapheme counting, blank lines preserved |
| Caption Builder | 8 caption or title ideas per platform (YouTube, Instagram, LinkedIn) | title-casing small words, YouTube length warnings, empty and over-long topics |
| Bio Formatter | Fits a bio to TikTok, Instagram, X, LinkedIn and YouTube limits | cuts at word boundaries with "…", single-line platforms join with " \| ", emoji counted once |
| Markdown Editor | Preview and HTML | safe by construction: raw HTML shown as text, `javascript:` / `data:` links neutralised; nested and task lists, tables with alignment, unclosed fences, snake_case not italicised |
| Barcode | Code 128 (sets B and C), EAN-13, UPC-A as SVG | published check digits (5901234123457, 036000291452), wrong check digit, non-ASCII, odd digit runs, escaped label |

**Bugs found and fixed along the way:**
- Switching between live panels could run the new panel once with the previous panel's option (a WebKit page error). The panel now ignores options that aren't its own.
- A live panel without a home card (Time Zone Converter) couldn't be opened by its link; `toolBySlug` now builds one from the registry.

**Tests.**
- Unit: 32 engine tests (`engines-batch1.test.ts`), plus every new panel's sample run through each option, which must all give different, non-error output.
- e2e: `live-panels.spec.ts` runs each new panel automatically in Chromium and WebKit (deep link, sample, every option, copy, full screen, ⌘Enter, clear). `perf-privacy.spec.ts` covers all 33 panels: median ≤ 1.3 ms, nothing uploaded. Its time limit now scales with the panel count.
- Count tests updated to the new totals: 33 panels, 32 with home cards.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
