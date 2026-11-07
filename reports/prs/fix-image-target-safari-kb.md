# fix(image): PNG + target size failed in Safari; "under 200 kb" could come out at 205 KB

**Severity: High** (a tool fails in one browser). Found by the new §4 expected-value test, "Image Compressor (real): 1600×1200 PNG + 'compress to under 200 kb'", which failed in WebKit with "This browser cannot save WEBP files".

**Bug 1: Safari.** With a target size, the image worker switches PNG to a lossy format and always chose WebP. Safari's canvas can't encode WebP (it silently writes PNG, which `draw()` correctly reports), so every PNG + target size failed in Safari. That covers the Image Compressor page, the "compress to under … kb" plan on the home page, and both phones' Safari.

**Bug 2: units.** The home page parses and displays sizes with KB = 1000 bytes, but the plan runner (#61) passed "200 kb" to the worker as 200 KiB (204,800 bytes). A result could therefore display as "205 KB" after you asked for "under 200 KB". Tool pages use KiB throughout and are consistent.

**Fix.**
- `canEncode(mime)` probes the canvas once (1×1). A PNG that needs a target size becomes WebP where supported, otherwise JPG, and the note says which ("Saved as JPG, because PNG can't be compressed to a target size."). Chromium needs a 2D context before `convertToBlob`.
- The plan runner converts target bytes to whole KiB (`Math.floor(bytes / 1024)`), so the output is never above what you asked for.

**Tests first.**
- `plan.spec.ts › §4 Image Compressor (real)`: at most 200,000 bytes, decodes, still 1600×1200. It failed in WebKit before the fix and passes in Chromium and WebKit after.
- New `tools.spec.ts › PNG with a target size works in every browser`: Image Compressor page, target 150 KB, note says JPG in WebKit and WebP elsewhere, at most 150 KiB, same dimensions. Passes on Chromium, WebKit and iPhone 14.
- Plan suite (12) and the image tool tests (54) pass on Chromium and WebKit.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
