# feat: 12 image and creator tools (crop, EXIF remover, bulk rename, social resizer, thumbnail preview, meme, watermark, palette, colour picker, collage, passport photo, OCR)

Third batch of "Coming soon" tools. All run on the device. Logic that doesn't need a canvas is in `src/lib/engines/imaging.ts` and unit-tested.

| Tool | What it does | Edge cases covered by tests |
|---|---|---|
| Crop, Rotate & Flip | Drag or type the crop box; aspect presets (1:1, 4:5, 16:9, 9:16, 3:2); rotate and flip | values clamp to the image (W 5000 → 1200), rotation swaps sides, PNG transparency kept, EXIF rotation applied on load |
| EXIF Remover | Removes metadata **without re-encoding** (JPEG APP1/APP13/COM, PNG text/EXIF/time chunks, WebP EXIF/XMP); reports camera and GPS location found | image data byte-for-byte unchanged, ICC colour profile and Adobe marker kept, VP8X flags and RIFF size fixed, damaged files, AVIF/GIF re-encoded with a note |
| Bulk Rename | `{name}`, `{n}`, `{date}`, `{ext}` patterns with padding and start number; optional photo resize | extension always kept, duplicates get " (2)", illegal characters replaced, empty results get a name, non-images pass through unchanged |
| Social Image Resizer | 10 platform sizes in one go: fill (crop, keep top/centre/bottom), whole image on blurred or colour background | exact pixel sizes per platform, nothing selected disables the button |
| YouTube Thumbnail Preview | Shows the image in the home feed, sidebar and search, light or dark, with your title; exports 1280×720 under 2 MB | aspect, size, file-size and format checks |
| Meme Generator | Top and bottom text in the classic style; shrinks and wraps to fit (up to 3 lines) | over-long words split, export at the photo's size, no text disables export |
| Image Watermark | Text or logo, in 9 positions or tiled, on many photos | sizes kept, mark present in the corner and absent elsewhere, logo required in logo mode |
| Colour Palette | k-means (deterministic) on a downsample; shares and hex; copy as CSS variables | transparent pixels ignored, more colours asked than exist, anti-aliased edges |
| Colour Picker | Click a pixel for HEX/RGB/HSL and contrast on white/black; history; "pick from screen" where the browser supports EyeDropper | exact pixel value |
| Collage Maker | 2–9 photos in balanced rows on square, portrait, story or wide canvases; spacing and background | exact output size, one photo or more than nine refused |
| Passport Photo | ISNet background removal (existing self-hosted model) + head placement from the person's silhouette (crown, neck → chin); 6 country specs at 300 dpi; head size and position tweaks; 6×4 in print sheet | silhouettes with and without shoulders (unit), spec pixel sizes (India 413×531, US 600×600); the e2e checks the clear message when the model isn't installed |
| Image to Text (OCR) | Tesseract on the device, English; images or scanned PDFs (up to 30 pages, rendered with pdf.js); join lines option | text read back from a generated image, blank image says "No text found" |

**New dependencies** (approved): Tesseract.js 7 + core 7 (Apache-2.0) and the English `best_int` model (2.9 MB), self-hosted from `/vendor/tesseract` and fetched only when OCR runs. All three core builds (plain, SIMD, relaxed SIMD) are served, because tesseract.js picks one per browser.

**Bugs found and fixed along the way:**
- **`acceptsFile("*/*")` rejected every file**, because `*/*` was read as the type prefix `*/`. Any "accept anything" dropzone was affected. There's a unit test now.
- **Hydration error on the colour picker:** the page checked `window` during render to decide whether to show the screen picker, so the server and client HTML differed. It now checks after mount.
- **OCR version mismatch:** tesseract.js 7 needs core 7, which I'd first pinned at 6, and asks for the relaxed-SIMD build.

**Tests.**
- Unit: `imaging.test.ts`, 17 tests. JPEG/PNG/WebP metadata stripping on hand-built files, EXIF GPS parsing, rename patterns, palette, layouts, wrapping, head placement.
- e2e: `image-tools.spec.ts`, 17 tests. Outputs are decoded in the browser, so sizes, formats, pixels and text are checked.
- Universal checks for the 12 pages: H1, badge, axe light/dark, phone layout and 44 px targets, keyboard.
- Results: Chromium, WebKit, Pixel 7 and iPhone 14 all pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
