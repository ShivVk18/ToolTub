# KlipKit: Strategy, Tool List, Architecture and Search Plan (v2: self-owned, no external APIs)

Prepared 2 November 2026. Code referenced here lives in this repository and builds today (`npm run build`).
Search-demand figures are estimates from the author's experience, **not measured**: every one is marked *needs validation*, and §2.5 explains how to check them.

---

## 1. Executive summary

**Positioning:** "Free online tools that run on your device. No sign-up, no uploads, no clutter." KlipKit competes on **trust and finish**, not breadth. iLovePDF, Smallpdf and PDF24 already own "PDF tool". TinyWow already owns "lots of tools". Nobody credible owns **"private: your file never leaves your device"** across PDFs, images, developer utilities and media.

**Wedge:** three clusters where on-device processing is a visible, provable advantage and the market leaders upload files.
1. Developer tools that handle secrets: JSON, JWT, Base64, .env.
2. iPhone and photo tools: HEIC, compression, background removal.
3. Form-limit tools: "compress PDF/image to 100 KB" for job, exam and visa portals, which is huge in India.

**Biggest risks**
1. **Domain authority.** A new domain will not rank for "compress pdf" for 12–18 months. Win long-tail and developer queries first, and earn citations from Hacker News, GitHub and Reddit.
2. **Quality gaps from §0.** Without Ghostscript or a commercial engine, PDF compression only resamples JPEG images (fine for scans and photos, weak for text-heavy PDFs). PDF to Word via LibreOffice is mediocre on complex layouts. The copy must say so.
3. **Browser variance.** WebCodecs, WebGPU and AVIF encoding differ between browsers. Each tool needs a stated fallback.
4. **Thin content at scale.** 78 tools × variants can trip Google's helpful-content and scaled-content systems. The registry enforces "live = full content, otherwise noindex".

---

## 2. Final tool list (78 tools)

### 2.1 Changes to the seed list

| Change | Tool | Why |
|---|---|---|
| Removed | Bulk Image Renamer & Resizer | Duplicate. Batch mode already exists in Compressor, Resizer and Converter, and renaming happens at download. |
| Added | Photo Metadata (EXIF) Remover | Pure [Own], fits the privacy story, real demand ("remove location from photo"). |
| Added | Video Converter (MOV→MP4) | iPhone MOV files are one of the most common "can't upload" problems. WebCodecs + Mediabunny. |
| Split | Unit Converter / Time Zone Converter | Different intents and keywords; one page would rank for neither. |
| Merged | Word / Excel / PowerPoint → PDF | One tool, with route variants `/excel-to-pdf` and `/powerpoint-to-pdf` once validated. |
| Changed | Compress PDF strong mode: browser, not qpdf server | **qpdf cannot downsample images**; it only repacks streams. Real savings come from resampling images, which our own canvas code does in the browser. qpdf stays for Protect/Unlock, as WebAssembly in the browser (Apache-2.0). |
| Changed | Protect / Unlock PDF: browser, not server | qpdf compiles to WASM, so a password-protected document never needs to touch a server. |
| Changed | All video tools: WebCodecs, not ffmpeg.wasm | The default `@ffmpeg/core` build includes x264 (**GPL**), which breaks §0.4. A custom LGPL build loses H.264 encoding. The browser's own WebCodecs encoders plus Mediabunny (MPL-2.0) for containers are smaller, hardware-accelerated and licence-clean. |
| Changed | API Request Tester: no CORS relay | An open relay on your VPS is an SSRF and abuse magnet, and it gets your IP blocklisted. It is browser-only, with the CORS limitation stated. P2. |
| Demoted | Resume Builder: P1 → P2 | L effort, and up against Canva, Zety and Novorésumé. Little SEO upside early. |
| Flagged | Hashtag Finder | Needs a curated dataset that someone must maintain. Scraping platforms breaks their terms of service. Ship only if you commit to curating ~50 niches by hand. |
| Flagged | Extract Audio: M4A first, MP3 later | Browsers encode AAC natively. MP3 needs LAME (LGPL) as a separate WASM file. |
| Flagged | Image Converter AVIF output | Canvas cannot encode AVIF in most browsers. Needs a libavif/Squoosh codec (BSD) as [Lib]. Ship WebP first. |
| Rejected | Infrastructure items in the brief: MinIO, Redis ≥ 7.4, COOP/COEP | MinIO is AGPL-3.0 → use a local volume now, SeaweedFS (Apache-2.0) later. Redis 7.4+ is RSAL/SSPL → Valkey (BSD-3). COOP/COEP stopped Next 16's Web Workers from starting in testing, so it is disabled (see §5.7). |

### 2.2 Legend

- **Freq:** D = daily · W = weekly · O = occasional.
- **Demand:** an estimated tier of global monthly searches for the primary keyword: **VH** > 1M, **H** 100k–1M, **M** 10k–100k, **L** < 10k. *All tiers need validation.*
- **Intent:** do / know / compare.
- **Diff:** S / M / L.
- **Build:** [Own], [Lib], [Model] or [Srv], with library and licence.
- **Limit:** what works smoothly on a mid-range phone (about a 2022 Android with 6 GB RAM).

### 2.3 Productivity (29)

| # | Tool | Problem → user | Freq | Primary kw (demand) · secondary | Intent | #1–3 competitors → weakness | Diff | Build · licence | Limit | KlipKit advantage | Chains to |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Compress PDF **P0** | PDF too big for email or portal → students, job seekers | W | compress pdf (VH) · reduce pdf size, compress pdf to 100kb, pdf compressor | do | iLovePDF, Smallpdf, Adobe → upload; Smallpdf limits free use | M | [Own]+[Lib] pdf-lib MIT | 100 MB | Target-KB mode without uploading the document | Merge, Split, PDF→JPG |
| 2 | Merge PDF **P0** | Combine scans or forms → office, students | W | merge pdf (VH) · combine pdf, join pdf | do | iLovePDF, Smallpdf, Adobe → upload, sign-up nags | S | [Lib] pdf-lib MIT | 300 MB total | Instant, offline-capable, drag to reorder thumbnails | Compress PDF, Organize |
| 3 | Split PDF **P0** | Extract pages → office | W | split pdf (H) · extract pages from pdf | do | iLovePDF, Smallpdf, Adobe → upload | S | [Lib] pdf-lib + fflate MIT | 300 MB | Page thumbnails, ZIP out, no upload | Merge, Compress |
| 4 | PDF to Word **P0** | Edit a PDF → office | W | pdf to word (VH) · pdf to docx | do | iLovePDF, Smallpdf, Adobe → better layout fidelity | M | [Srv] LibreOffice MPL-2.0 | 50 MB, text PDFs | Own server, deleted after 1 h, no third party; honest about scans | OCR, Word→PDF |
| 5 | Word/Excel/PPT → PDF **P0** | Submit as PDF → students, office | W | word to pdf (VH) · docx to pdf, excel to pdf | do | iLovePDF, Smallpdf, Adobe → upload, queue waits | S | [Srv] LibreOffice MPL-2.0 | 50 MB | Faithful LibreOffice output, auto-delete | Compress, Merge |
| 6 | PDF to JPG **P0** | Share one page as an image → everyone | W | pdf to jpg (H) · pdf to png | do | iLovePDF, Smallpdf → upload | S | [Lib] pdf.js Apache-2.0 + [Own] | 200 MB | Choose DPI and pages, ZIP, no upload | Image Compressor |
| 7 | JPG to PDF **P0** | Scans/photos → one PDF | W | jpg to pdf (VH) · image to pdf | do | iLovePDF, Smallpdf → upload | S | [Lib] pdf-lib MIT | 50 MB/image | Page size A4/Letter by locale, no upload | Compress PDF |
| 8 | Organize PDF P1 | Rotate/reorder/delete | O | rotate pdf (H) · delete pages | do | iLovePDF, Smallpdf | M | [Lib] pdf-lib + pdf.js | 200 MB | One screen for all three jobs | Merge, Split |
| 9 | Fill & Sign PDF P1 | Sign a form → everyone | O | sign pdf (H) · fill pdf form | do | Adobe, Smallpdf, DocuSign → accounts | M | [Lib]+[Own] signature pad | 100 MB | Signature stays on device | Compress |
| 10 | Protect/Unlock PDF P1 | Add/remove a known password | O | unlock pdf (H) · password protect pdf | do | iLovePDF, Smallpdf → upload of confidential docs | M | [Lib] qpdf-WASM Apache-2.0 | 200 MB | Confidential file never leaves the device | Compress |
| 11 | Watermark & Page Numbers P2 | Stamp a PDF | O | add page numbers to pdf (M) | do | iLovePDF | S | [Lib] pdf-lib | 200 MB | Live preview | Organize |
| 12 | Image Compressor **P0** | Photo too big → everyone | D | compress image (VH) · compress jpeg, image to 50kb | do | TinyPNG, iLoveIMG, Compressor.io → upload, 5 MB/20-file limits | S | [Own] OffscreenCanvas | 50 MB, 50 files | Batch + target KB, no limits, no upload | Resizer, Converter, EXIF |
| 13 | Image Resizer **P0** | Exact pixel size → forms, social | D | resize image (VH) · resize image to 20kb | do | iLoveIMG, Adobe Express → upload, accounts | S | [Own] | 50 MB | Presets + target KB together | Compressor, Crop |
| 14 | Image Converter **P0** | Wrong format → everyone | W | png to jpg (VH) · webp to png, jpg to png | do | CloudConvert, Convertio → upload, quotas | S | [Own] (+ AVIF codec later, BSD) | 50 MB | Batch and instant; one tool with route variants | Compressor |
| 15 | HEIC to JPG **P0** | iPhone photo won't open → Windows/Android users | W | heic to jpg (H) · heic converter | do | heictojpg.com, CloudConvert, iLoveIMG → upload of personal photos | S | [Lib] libheif-js LGPL-3.0 (separate file) | 50 MB | Private batch conversion; strips GPS | Compressor, JPG→PDF |
| 16 | Crop/Rotate/Flip P1 | Fix framing | W | crop image (H) | do | iLoveIMG, Canva | S | [Own] | 50 MB | Ratio presets, keyboard nudging | Resizer |
| 17 | Passport Photo Maker P1 | Visa/ID photo at home | O | passport size photo (H, very high in India) | do | PhotoAid (paid), IDPhotoDIY → upload, watermark | M | [Own]+[Model] ISNet Apache-2.0 | 25 MB | Free, no watermark, 30+ country specs, print sheet | BG Remover, Compressor |
| 18 | Image to Text (OCR) P1 | Copy text from an image | W | image to text (H) · ocr online | do | imagetotext.info, Google Lens → ads, upload | M | [Lib] Tesseract.js Apache-2.0 | 20 MB | Private OCR, self-hosted languages | Word Counter, Clean Text |
| 19 | EXIF Remover P1 | Hide location before sharing | O | remove exif data (M) | do | Small single-purpose sites → upload (ironic) | S | [Own] | 50 MB | The privacy tool that is itself private | Compressor |
| 20 | Word Counter **P0** | Hit a word limit → students, writers | D | word counter (VH) · character count | do | wordcounter.net → heavy ads | S | [Own] | — | Social limits + reading time, no ads | Case Converter, Post Formatter |
| 21 | Diff Checker **P0** | What changed? → devs, editors | W | diff checker (H) · compare text | do | diffchecker.com → saves diffs to server, upsell | S | [Own] Myers diff | 10 MB | Never saved to a server | JSON Formatter |
| 22 | Case Converter **P0** | Fix CAPS → everyone | W | case converter (H) | do | convertcase.net → ads | S | [Own] | — | Dev cases included (camel, snake, kebab) | Word Counter |
| 23 | Clean Text P1 | Messy pasted text | W | remove line breaks (M) | do | textfixer → dated | S | [Own] | — | All fixes in one pass | Case Converter |
| 24 | Resume Builder P2 | Make a CV → job seekers | O | resume builder (VH) | do | Canva, Zety, Resume.io → paywall at download | L | [Own]+[Lib] pdf-lib | — | Free ATS-safe PDF export | Word→PDF, Passport Photo |
| 25 | Lorem Ipsum P2 | Placeholder text | O | lorem ipsum (H) | do | lipsum.com | S | [Own] | — | Clean copy button | — |
| 26 | QR Code Generator **P0** | Link/Wi-Fi to QR → shops, events | W | qr code generator (VH) · wifi qr code | do | QR Code Generator, QR Code Monkey → dynamic codes that expire behind a paywall | S | [Lib] qrcode MIT | — | Static codes that never expire, no tracking, SVG | Barcode |
| 27 | Barcode Generator P1 | EAN/UPC labels | O | barcode generator (H) | do | barcode.tec-it.com | S | [Own] | — | SVG for print | QR |
| 28 | Unit Converter P2 | Convert units | D | unit converter (H) | do | Google's own answer box (hard to beat) | S | [Own] | — | Low SEO value; build for retention only | — |
| 29 | Time Zone Converter P2 | Plan a meeting | W | time zone converter (H) | do | timeanddate, worldtimebuddy | S | [Own] Intl | — | Clean meeting planner | Timestamp |

### 2.4 Developer (26)

These are almost all [Own], need no server, carry no licence risk, and are where the privacy advantage is easiest to prove ("open the network tab").

| # | Tool | Freq | Primary kw (demand) | Intent | Competitor → weakness | Diff | Build | KlipKit advantage | Chains to |
|---|---|---|---|---|---|---|---|---|---|
| 30 | JSON Formatter **P0** | D | json formatter (H) · json validator | do | jsonformatter.org, JSONLint, Code Beautify → ads; some sites post data to a server | S | [Own] + worker | Exact line/column + fix hint; 50 MB in a worker | YAML, CSV, TS, Diff |
| 31 | JWT Decoder **P0** | D | jwt decoder (M) · decode jwt | do | jwt.io (now Auth0/Okta-branded), token.dev | S | [Own] | Claims explained, expiry badge, decode-only warning | Base64, Timestamp |
| 32 | Base64 **P0** | D | base64 decode (H) | do | base64decode.org → ads | S | [Own] | Text and files, image preview | URL, Hash |
| 33 | Regex Tester **P0** | W | regex tester (M) | do | regex101 (strong) → heavy UI | M | [Own] | Plain-English explanation, simpler UI | Diff |
| 34 | UUID/ULID **P0** | D | uuid generator (M) | do | uuidgenerator.net | S | [Own] crypto.randomUUID | v7 + ULID + bulk | Hash |
| 35 | URL Encode/Decode **P0** | W | url decode (M) | do | urldecoder.org | S | [Own] | Query-string table view | Base64 |
| 36 | Timestamp Converter **P0** | D | epoch converter (M) | do | epochconverter.com | S | [Own] | Auto-detect s/ms/µs | JWT, Cron |
| 37 | Hash Generator **P0** | W | sha256 generator (M) | do | md5hashgenerator, emn178 | S | [Own] Web Crypto + own MD5 | Files up to 500 MB, streamed | Base64 |
| 38 | SQL Formatter P1 | W | sql formatter (M) | do | sqlformat.org, Code Beautify | S | [Lib] sql-formatter MIT | Dialects | JSON |
| 39 | JSON ↔ YAML P1 | W | json to yaml (M) | do | json2yaml | S | [Lib] yaml ISC | Bidirectional | JSON |
| 40 | JSON ↔ CSV P1 | W | json to csv (M) | do | ConvertCSV | S | [Own] | Nested flattening options | JSON |
| 41 | JSON → TS/Zod P1 | W | json to typescript (L–M) | do | quicktype (strong) | M | [Own] | Zod output | JSON |
| 42 | Cron Generator P1 | W | crontab guru-type queries (M) | know | crontab.guru (strong) | M | [Own] | Builder + next 5 runs in local timezone | Timestamp |
| 43 | API Tester P2 | W | online api tester (L–M) | do | Hoppscotch (strong, open source) | M | [Own], no relay | Simple; honest CORS note | JSON, URL Encode |
| 44 | HTML/CSS/JS Playground P1 | W | html editor online (H) | do | CodePen, JSFiddle | M | [Own] sandboxed iframe + CodeMirror MIT | No account needed to share (URL-encoded) | Minifier |
| 45 | Color Converter P1 | W | hex to rgb (H) · contrast checker | do | WebAIM (strong) | S | [Own] | OKLCH + WCAG in one place | Palette |
| 46 | Minifier/Beautifier P1 | W | js minifier (M) | do | Toptal, Code Beautify | S | [Lib] Terser BSD-2, Prettier MIT | Source maps | Playground |
| 47 | Markdown Editor P1 | W | markdown editor (M) | do | StackEdit, Dillinger | M | [Lib] marked MIT | PDF export | Word Counter |
| 48 | Password Generator P1 | O | password generator (H) | do | LastPass, Bitwarden (strong brands) | S | [Own] | Passphrases + entropy shown | Hash |
| 49 | .env Redactor P2 | O | redact secrets (L) | do | none good | S | [Own] | Original idea, very citable | Diff |
| 50 | Meta Tag/OG Generator P2 | O | open graph preview (M) | do | metatags.io | S | [Own] | Previews for every platform | Schema |
| 51 | Schema/JSON-LD Generator P2 | O | schema markup generator (M) | do | technicalseo.com | M | [Own] | Validates as you type | Meta |
| 52 | Chmod Calculator P2 | O | chmod calculator (M) | do | chmod-calculator.com | S | [Own] | Symbolic + octal | — |
| 53 | HTML Entities P2 | O | html escape (L–M) | do | freeformatter | S | [Own] | — | URL |
| 54 | Number Base P2 | O | binary to decimal (H, students) | do | RapidTables | S | [Own] | Shows the working | — |
| 55 | CSS Gradient/Shadow P2 | O | css gradient generator (M) | do | cssgradient.io (strong) | S | [Own] | OKLCH gradients | Color |

### 2.5 Creator (22)

| # | Tool | Freq | Primary kw (demand) | Intent | Competitor → weakness | Diff | Build · licence | Limit | KlipKit advantage | Chains to |
|---|---|---|---|---|---|---|---|---|---|---|
| 57 | Background Remover **P0** | W | remove background (VH) | do | remove.bg, Adobe Express, Canva → paid HD, upload | M | [Model] ISNet int8 Apache-2.0 + onnxruntime-web MIT | 25 MB; ≈ 44 MB model once | Free full resolution, on device (tested: 2.1 s with WebGPU) | Passport, Social Resizer |
| 58 | Social Image Resizer **P0** | W | instagram image size (H) | do/know | Canva, Adobe Express → accounts | S | [Own] + fflate | 50 MB | Every platform in one ZIP | Thumbnail Preview |
| 59 | Thumbnail Preview **P0** | W | youtube thumbnail checker (L–M) | do | thumbsup.tv | S | [Own] | Mobile, dark mode and duration overlay | Title Builder |
| 60 | Social Post Formatter **P0** | D | linkedin bold text (M) · bold text generator | do | yaytext, LingoJam → ads | S | [Own] | Per-platform limits + preview | Word Counter |
| 61 | Title & Caption Builder P1 | W | youtube title generator (H) | do | AI generators (need an LLM) | M | [Own] templates | — | Proven formulas, no AI server; honest about it | Thumbnail, Hashtags |
| 62 | Hashtag Finder P1 ⚠ | W | instagram hashtags (H) | do | all-hashtag, AI tools | M | [Own] curated data | — | Only if curated by hand | Post Formatter |
| 63 | Bio Formatter P2 | O | instagram bio (M) | do | AI tools | S | [Own] | Limits per platform | Post Formatter |
| 64 | Image Upscaler P2 | O | image upscaler (H) | do | Upscayl (desktop), Let's Enhance (paid) | L | [Model], model TBD (needs MIT/Apache SR model) | ≤ 1024 px in | Private; quality is the risk | Compressor |
| 65 | Video Compressor P1 | W | compress video (H) · discord 10mb | do | FreeConvert, Clideo → upload of large files, watermarks | L | [Own] WebCodecs + Mediabunny MPL-2.0 | 500 MB, 10 min | No upload of big files; hardware encode | Trimmer, Converter |
| 66 | Video Converter P1 | W | mov to mp4 (H) | do | CloudConvert, FreeConvert → quotas | M | same | 500 MB | Instant remux when codecs allow | Compressor |
| 67 | Video Trimmer P1 | W | trim video (H) | do | Clideo, Kapwing → watermark/sign-up | M | same | 1 GB | Keyframe cuts are instant | GIF, Compressor |
| 68 | Video to GIF P1 | W | video to gif (H) | do | EZGIF (strong but dated) | M | same + [Own] GIF encoder | 30 s | Modern UI, no upload | Compressor |
| 69 | Extract Audio P1 | O | mp4 to mp3 (VH) | do | many ad-heavy sites | M | same (M4A); MP3 = LAME LGPL later | 1 GB | Private; no "fake download" buttons | Transcription |
| 70 | Audio Converter & Trimmer P2 | O | mp3 converter (H) | do | Online Audio Converter | M | same | 200 MB | — | Transcription |
| 71 | Screen Recorder P1 | W | screen recorder online (H) | do | Loom (account), screenapp | S | [Own] MediaRecorder | desktop only | No account, never uploaded | Trimmer, Compressor |
| 72 | Transcription (≤ 10 min) P1 | W | transcribe audio to text (H) | do | TurboScribe, Otter → upload, limits | L | [Model] Whisper base MIT + Transformers.js Apache-2.0 | 10 min; ≈ 80 MB model | Private, free; slow on CPU (state it) | Subtitles, Word Counter |
| 73 | Subtitle Generator & Editor P1 | W | srt generator (M) · auto subtitles | do | Kapwing, VEED → watermark | L | [Model] + [Own] editor | 10 min | Free SRT/VTT, timing editor | Video Compressor |
| 74 | Text to Speech P2 | O | text to speech (VH) | do | ttsmaker, NaturalReader | S | [Own] Web Speech | device voices | Honest: quality varies by device | — |
| 75 | Meme Generator P2 | O | meme generator (H) | do | Imgflip (dominant) | S | [Own] own templates only | — | Weak SEO case; low priority | Watermark |
| 76 | Image Watermark P2 | O | add watermark to photo (M) | do | watermarkly | S | [Own] | batch | Batch + private | Compressor |
| 77 | Colour Palette from Image P2 | O | color palette from image (M) | do | Coolors, Adobe Color | S | [Own] k-means | 25 MB | Exports CSS variables | Color Converter |
| 78 | Image Colour Picker + Collage Maker P2 | O | color picker from image (M), photo collage (H) | do | imagecolorpicker.com, Canva | S | [Own] | — | Simple | Palette |

> Rows 78a/78b (Colour Picker, Collage) are separate registry entries; they share a table row here for space. The registry in `src/registry/tools.ts` has all 78 tools as individual entries with `buildType`, `dependencies` (with licence) and `limits`.

**How to validate demand (do this before any P1 build):**
1. **Google Keyword Planner** (free with any Ads account; no spend needed): enter the primary + secondary keywords and set location to *All* plus India, US, Brazil and Indonesia. Read the ranges.
2. **Ahrefs Free Keyword Generator / Semrush free (10 queries/day)**: keyword difficulty, plus the current top 10 pages with their Domain Rating. If the top 10 are all DR 80+, target the long-tail variant instead.
3. **Google Trends**: compare `heic to jpg` vs `compress pdf` vs `jwt decoder` over 5 years; check seasonality (exam months in India).
4. **Search Console** after launch: the only real numbers. Promote tools whose impressions grow without effort.
5. Record the results in the registry (`seo.secondaryKeywords`) and in a `demand` note per tool.

---

## 3. Top 10 launch tools

| Rank | Tool | Why it is in the launch set |
|---|---|---|
| 1 | Image Compressor (+ /compress-image-to-50kb) | Daily use, VH demand, 100% [Own], tested: −39% at default settings and an exact 49 KB on a 50 KB target. The long-tail KB variants are winnable. |
| 2 | HEIC to JPG | Clear privacy win (personal photos), real pain on Windows, tested end to end. |
| 3 | JSON Formatter | Most-used developer tool, [Own], and the best Hacker News and dev.to story ("open your network tab"). |
| 4 | JWT Decoder | A security-sensitive input makes "never leaves your browser" matter. Highly citable for "is it safe to decode a JWT online". |
| 5 | Compress PDF (+ /compress-pdf-to-100kb) | VH demand plus the form-limit long tail. Tested −81% on a scanned-style PDF. Launch as Beta until benchmarked on 500 real PDFs. |
| 6 | QR Code Generator | VH demand, and "never expires, no tracking" is a sharp contrast with the paywalled dynamic-code leaders. |
| 7 | Background Remover | The strongest demo: free full resolution on device. Tested 2.1 s with WebGPU. Ship once the int8 model is self-hosted. |
| 8 | Merge PDF | Must-have for PDF credibility; [Lib], 1–2 days of work. |
| 9 | Word Counter | Daily habit tool that drives return visits; [Own], 1 day. |
| 10 | Image Resizer | Pairs with the Compressor in chains; presets feed the Instagram chain. |

PDF to Word and Word to PDF launch in week 6, once the queue and auto-delete have run on production for a week (§8).

---

## 4. UX: wireframes and Tool Chains

### 4.1 Homepage (`src/app/page.tsx`)

1. **Header (sticky, 56 px):** logo · category links (PDF, Image, Developer, Video, Creator) · search pill with ⌘K hint · theme toggle.
2. **Hero:** H1 "Free online tools that run on your device." · one-line subhead · a large search field (opens the command palette with fuzzy search and synonyms) · trust strip "No sign-up · Runs on your device · Free forever · N tools live". **No tool count in the H1** until the number is true for live tools.
3. **Favourites / Recently used** (client-only, rendered only if non-empty, so there is no layout shift for first-time visitors).
4. **Three category cards:** Productivity (sky), Developer (emerald), Creator (fuchsia). Each has an icon, a one-line job and "N live · M planned".
5. **Popular tools:** 8 curated cards.
6. **Tool Chains:** 3 preset cards.
7. **FAQ:** 4 questions, rendered visibly and as FAQPage JSON-LD.
8. **Footer:** the entity definition sentence (used word for word everywhere), hubs, About/Privacy/Licences, llms.txt.

### 4.2 Tool workspace (one template: `ToolWorkspace` + server page)

Server-rendered (in the HTML without JS) → client island → server-rendered:

```
Breadcrumbs: Home › Image Tools › Image Compressor
H1  Image Compressor                                   ☆ favourite
    Shrink JPG, PNG and WebP without visible quality loss.
    [● Runs on your device — nothing uploaded]  [Beta]?
┌─ ToolWorkspace (client) ─────────────────────────────────┐
│ Input: drop zone · Choose files · paste (Ctrl+V) · sample│
│ Settings: Quality ▭▭▭▭▭ 80   Target size (KB) [   ]     │
│ ▸ Advanced options (format, max width)                   │
│ [ Compress images ]  ← the one primary action            │
│ aria-live: progress bar / "689 KB → 421 KB −39%"         │
│ [Download] [Copy] [Send to next tool →]                  │
└──────────────────────────────────────────────────────────┘
Related tools (3–6 cards)
── AEO block (server) ── H2 question + 40–60-word answer · key facts · steps ·
   comparison table · FAQs · explainer · chains/guides · Last updated + Reviewed by
```

Error states always give a cause and a fix ("This PDF is password-protected. Unlock it first, then compress it."). Tools whose output updates live (JSON, JWT, QR) have no primary button: the result is the action.

### 4.3 Tool Chains (`src/registry/chains.ts`, `/chain/[slug]`)

**Data contract:** every tool declares `inputs: IOType[]` and `outputs: IOType[]` (MIME patterns: `image/*`, `application/pdf`, `text/plain`, `application/json`, `video/*`, `audio/*`, …). `canChain(a, b)` is true when an output of `a` matches an input of `b`. Between steps, data travels as an in-memory `Artifact { name, type, blob?, text? }`. It is never persisted and never uploaded.

**Two UX paths, one engine:**
1. **"Send to next tool →"** on every result lists only compatible tools (computed on the server from the contract). It stores the artifacts in Zustand (memory only) and navigates; the next tool picks them up via `useHandoff()`.
2. **Preset chain pages** (`/chain/optimize-image-for-web`) run headless worker ops in sequence: Resize 1600 px → Compress q80 → WebP. Tested: 689 KB → 62 KB. These pages are indexable landing pages with their own answer block and HowTo schema.

**Later:** a visual chain builder (drag steps, validated live by `canChain`), shareable as `/chain/custom?steps=…` (noindex).

---

## 5. Technical architecture

### 5.1 Stack (all self-hosted, licences in §5.6)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.4 App Router, TypeScript, `output: "standalone"` | SSG for every keyword page; standalone Node server in Docker; no Vercel features. |
| UI | Tailwind 4, shadcn/ui-style components (copied, MIT), Lucide (ISC), Geist font (OFL, bundled) | Fonts and icons ship from our domain; no CDN. |
| State | Zustand + `persist` (recents and favourites only) | Hand-off between tools stays in memory, never persisted. |
| Search | Fuse.js over a small search index | The full SEO registry stays out of the client bundle. |
| Browser engines | OffscreenCanvas [Own], pdf-lib, libheif-js (separate file), qrcode, onnxruntime-web, all in Web Workers | Lazy-loaded per tool; `/json-formatter` never downloads pdf-lib. |
| On-device models | `/models/*.onnx` on our server, Cache Storage on the device | The size is shown before download. |
| Server tools | Worker container: LibreOffice headless, no network, read-only file system, dropped capabilities | Untrusted documents can't call home or escalate. |
| Queue | BullMQ (MIT) on **Valkey** (BSD-3) | Redis-compatible without Redis ≥ 7.4 licence issues. |
| Temp storage | Shared Docker volume + 1-hour sweeper | Simplest correct option on one VPS. MinIO is AGPL; SeaweedFS (Apache-2.0) if you go multi-host. |
| Rate limiting | Own fixed-window limiter on Valkey (salted IP hash, TTL = window) | No IP is ever stored. |
| Edge | Caddy 2 (Apache-2.0) | Automatic HTTPS, zstd/gzip, body-size limits. |
| Analytics | Umami (MIT) + Search Console + Bing Webmaster Tools | Cookieless, so no consent banner. |
| Monitoring | Uptime Kuma (MIT), GlitchTip (MIT) | Self-hosted; add to compose when needed. |

### 5.2 Folder structure

```
klipkit/
├─ src/
│  ├─ app/
│  │  ├─ [slug]/page.tsx          # tool | long-tail variant | category hub (one flat route, SSG)
│  │  ├─ chain/[slug]/            # preset chains (page + ChainRunner)
│  │  ├─ api/jobs/…               # upload → queue → status → download (server tools)
│  │  ├─ og/[file]/route.tsx      # OG images, prerendered at build
│  │  ├─ sitemap.xml/ sitemaps/[file]/  # sitemap index + one per category
│  │  ├─ llms.txt/ llms-full.txt/ robots.ts manifest.ts
│  │  ├─ icon-192.png/ icon-512.png/ logo.png/   # generated brand icons
│  │  └─ about/ privacy/ licences/ search/ page.tsx layout.tsx
│  ├─ registry/                   # SINGLE SOURCE OF TRUTH
│  │  ├─ types.ts tools.ts seo/*.ts dependencies.ts chains.ts categories.ts people.ts search-index.ts
│  ├─ components/{workspace,seo,search,layout,home,ui}/
│  ├─ tools/                      # one client component per tool + lazy map (index.tsx)
│  ├─ workers/                    # image | pdf | json | bg workers + pure *-ops.ts engines
│  ├─ server/                     # queue.ts, rate-limit.ts (server-only)
│  ├─ lib/                        # schema.ts metadata.ts sitemap.ts llms.ts worker-rpc.ts store.ts
│  └─ proxy.ts                    # hard 404 for unknown keyword URLs
├─ worker/                        # LibreOffice + BullMQ worker (Dockerfile, src/index.mjs)
├─ public/ (sw.js, humans.txt, vendor/ ← copied engines, models/ ← self-hosted ONNX)
├─ scripts/ (copy-vendor.mjs, indexnow.mjs)
├─ Dockerfile  docker-compose.yml  Caddyfile  .env.example
└─ docs/STRATEGY.md
```

### 5.3 Registry interface (excerpt from `src/registry/types.ts`)

```ts
interface ToolDefinition {
  slug: string; name: string; tagline: string;
  category: "productivity" | "developer" | "creator"; hub: HubId; priority: "P0" | "P1" | "P2";
  status: "live" | "beta" | "planned";   // live = indexed; beta = routed + noindex; planned = not routed
  buildType: ("own" | "lib" | "model" | "srv")[];
  processing: { where: "device" } | { where: "own-server"; retentionMinutes: number };
  dependencies: { name: string; licence: Licence; sizeKb: number; url: string }[];
  limits: { maxFileMb?: number; maxDurationSec?: number; notes?: string };
  inputs: IOType[]; outputs: IOType[];   // Tool Chain contract
  synonyms: string[]; relatedTools: string[];
  seo?: ToolSEO;                          // required for "live"
}
```

`ToolSEO` matches the brief (§8.5) plus `totalTime`, `featureList` and a `caption` on the comparison table. Variants carry `title`, `description`, `h1` and a `preset` (e.g. `{ targetKB: 100 }`) that pre-fills the tool.

### 5.4 Shared components and the Web Worker pattern

- `ToolWorkspace` props: `input`, `settings`, `advanced` (collapsed), `action` ({label, onClick}), `status`, `progress`, `error` ({cause, fix}), `result`. A `useToolRun()` hook drives the state machine idle → working → done | error, and progress is announced in an `aria-live` region.
- `Dropzone` (drag, paste anywhere, picker, sample), `PrivacyBadge` (two fixed sentences), `ResultActions` (Download / Copy / Send to next tool), `useHandoff()`.
- **Workers:** `createWorkerClient<Ops>()` on the page and `serveWorker({...ops})` in the worker. Each call carries `{id, op, args}`, Transferables are passed without copying, progress messages stream back, and the worker is created lazily on first call. Engines are pure functions (`image-ops.ts`, `pdf-ops.ts`, `json-ops.ts`) shared by tools and chains.

### 5.5 The three sample tools (all tested in Chrome on 2 November 2026)

| Sample | Files | Tested result |
|---|---|---|
| [Own] Image Compressor | `src/workers/image-ops.ts`, `src/tools/ImageTool.tsx` | 689 KB → 421 KB (−39%) at q80; target 50 KB → 49 KB; WebP −79%. Returns the original if re-encoding would grow it. |
| [Model] Background Remover | `src/workers/bg.worker.ts`, `src/tools/BackgroundRemover.tsx` | ISNet on onnxruntime-web; WebGPU used; 1200×1200 → transparent PNG in 2.1 s. Model cached in Cache Storage. Missing model → clear error. |
| [Srv] PDF to Word | `src/app/api/jobs/*`, `worker/src/index.mjs` | Text PDF → editable DOCX in ~4 s via BullMQ + LibreOffice; download works in the browser; queue down → 503 in 0.9 s. |

### 5.6 Dependency and licence table

| Dependency | Licence | ≈ Transfer | Used by | Notes |
|---|---|---|---|---|
| pdf-lib | MIT | 180 KB | PDF tools | |
| pdf.js | Apache-2.0 | 420 KB | PDF→JPG, Organize | |
| qpdf (WASM) | Apache-2.0 | 1.2 MB | Protect/Unlock | build from source |
| libheif-js | **LGPL-3.0** | 1.6 MB | HEIC | served as a separate file from `/vendor/libheif` so users can replace it (LGPL relinking); licence shipped next to it |
| qrcode | MIT | 25 KB | QR | |
| fflate | MIT | 10 KB | ZIP downloads | |
| onnxruntime-web | MIT | ≈ 7 MB gz (WASM) | BG remover, Passport | |
| ISNet general-use (int8) | Apache-2.0 | ≈ 44 MB | BG remover, Passport | **verify** the licence file from the exact source you download |
| Tesseract.js + tessdata_fast | Apache-2.0 | ≈ 5 MB | OCR | |
| Transformers.js | Apache-2.0 | ≈ 0.9 MB | Transcription | |
| Whisper base/tiny (ONNX) | MIT | 40–80 MB | Transcription, Subtitles | |
| Mediabunny | MPL-2.0 | 70 KB | Video/audio tools | file-level copyleft: publish only modifications to its own files |
| yaml | ISC | 35 KB | JSON↔YAML | |
| CodeMirror 6 | MIT | 150 KB | Playground | |
| marked | MIT | 12 KB | Markdown | |
| Terser / Prettier | BSD-2 / MIT | 260 / 400 KB | Minifier | |
| sql-formatter | MIT | 90 KB | SQL | |
| LibreOffice | MPL-2.0 | server | Office↔PDF | unmodified, separate process |
| Next.js, React, Tailwind, Zustand | MIT | — | platform | |
| Fuse.js | Apache-2.0 | 7 KB | search | |
| Lucide | ISC | — | icons | |
| Geist font | OFL-1.1 | — | fonts | |
| BullMQ / ioredis | MIT | server | queue | |
| Valkey | BSD-3 | server | queue | |
| Caddy | Apache-2.0 | server | edge | |
| Umami / Uptime Kuma / GlitchTip | MIT | server | ops | |
| PostgreSQL | PostgreSQL licence | server | Umami | |

**Excluded on purpose:** Ghostscript, MuPDF/PyMuPDF, iText, pdf2docx (AGPL/GPL) · the default ffmpeg.wasm core (GPL x264) · MinIO (AGPL) · Redis ≥ 7.4 (RSAL/SSPL) · BRIA RMBG (non-commercial) · heic2any (bundles LGPL libheif inside its own file).

### 5.7 Decisions found during the build

- **Cross-origin isolation is off.** With COEP `require-corp`, Next 16 Turbopack Web Workers failed to start (verified in headless Chrome), so ONNX runs single-threaded on CPU and uses WebGPU where available. Re-test on each Next.js upgrade before enabling it for video tools.
- **Hard 404s via `proxy.ts`.** With Cache Components on, the first request to an unknown slug returned **200** (a streamed `notFound()`), which Google treats as a soft 404. The proxy rejects unknown keyword URLs before rendering.
- **CSP keeps `'unsafe-inline'` for scripts.** Static pages cannot use per-request nonces. All third-party origins are still blocked (`default-src 'self'`).
- **LibreOffice filter names must not be quoted** when passed without a shell, and `soffice` exits 0 on failure. The worker checks that the output file exists.

### 5.8 Monthly server cost (no API costs). Prices are approximate (Hetzner, late 2026): check current pricing

Assumptions: average page weight about 1.2 MB (cached on repeat visits). 5% of visits use a model tool (44–80 MB, first use only). 2% use a server tool.

| Item | 100k visits/month | 1M visits/month |
|---|---|---|
| App + Caddy + Valkey + Umami | 1 × CPX31 (4 vCPU / 8 GB) ≈ €15 | 2 × CCX23 (4 dedicated vCPU / 16 GB) behind Caddy ≈ €60 |
| LibreOffice worker | same box | 1 × CCX33 (8 vCPU / 32 GB), 4 concurrent ≈ €60 |
| Bandwidth (≈ 0.4 TB / ≈ 4 TB) | included (20 TB/server in EU) | included |
| Backups, snapshots, volumes | ≈ €5 | ≈ €20 |
| Monitoring box (Uptime Kuma, GlitchTip) | same box | CX22 ≈ €5 |
| **Total** | **≈ €20–30** | **≈ €140–180** |

Outside the EU, Hetzner's bandwidth allowance is much lower (US ≈ 1 TB). Host in the EU, or add a second EU VPS as an origin mirror. Do not put a third-party CDN in front: that conflicts with §0, so add capacity instead.

### 5.9 Future: KlipKit as a service (brief §6)

Today `/api/jobs` is the internal API for [Srv] tools. Path to a public API without breaking anything:
1. Version it: `/api/v1/jobs` (same handlers), and keep `/api/jobs` for the site.
2. API keys: a `keys` table (Postgres, already present for Umami), with hashed keys and per-key quotas on Valkey using the same limiter with a key-based bucket.
3. Expose [Srv] tools plus the server-runnable [Own] engines (`json-ops`, `pdf-ops` via Node + `@napi-rs/canvas`, MIT).
4. A `/developers` docs page generated from the same registry; paid tiers for batch size and concurrency.
5. Webhooks on job completion, so clients don't need to poll.

---

## 6. SEO / AEO / GEO implementation (in code)

| Asset | Where | Notes |
|---|---|---|
| Metadata | `src/lib/metadata.ts` → `generateMetadata` in `[slug]` and chains | title, description, canonical, hreflang (en + x-default), robots, OG, Twitter, theme-color. **Beta and thin hubs → `noindex, follow`.** |
| JSON-LD | `src/lib/schema.ts`, `components/seo/JsonLd.tsx` | Site: Organization + WebSite/SearchAction. Tool: WebApplication + BreadcrumbList + HowTo + FAQPage (variant FAQs merged). Hub: BreadcrumbList + ItemList. Chain: BreadcrumbList + HowTo. Everything also rendered visibly. |
| AEO block | `components/seo/ToolContent.tsx` | The exact §8.3 order, server-rendered. |
| Sitemaps | `/sitemap.xml` (index) → `/sitemaps/{pages,image,utility,developer,…}.xml` | Indexable URLs only; lastmod = `lastReviewed`. |
| robots.txt | `src/app/robots.ts` | **Decision:** allow search/retrieval bots *and* training bots. For a free-tool brand, being in model knowledge is distribution. `/api/` and `/search` are disallowed for all. |
| llms.txt / llms-full.txt | `src/lib/llms.ts` | Built from the registry: privacy model, every routed tool with a one-liner, chains; the full file adds answers, facts, steps and FAQs. |
| OG images | `/og/{slug}.png` | One template, prerendered at build. |
| manifest, icons, humans.txt, sw.js | `app/manifest.ts`, `app/icon-*.png`, `public/` | The PWA works offline for browser tools. |
| IndexNow | `scripts/indexnow.mjs` | Run from your server after deploys; host the key file in `/public`. |
| Hard 404 | `src/proxy.ts` | Prevents soft 404s. |

**The 7 filled `ToolSEO` objects** are in `src/registry/seo/`: `compress-pdf.ts`, `image-compressor.ts`, `heic-to-jpg.ts`, `json-formatter.ts`, `jwt-decoder.ts`, `background-remover.ts`, `qr-code-generator.ts`. Each has 6 FAQs (40–60 words, direct first word), a 40–60-word answer, key facts with numbers, a comparison table, a 150–300-word explainer and one long-tail variant (`/compress-pdf-to-100kb`, `/compress-image-to-50kb`, `/heic-to-jpg-on-windows`, `/wifi-qr-code-generator`).

**Status at handover:** 5 of the 7 are `live` and indexed (Image Compressor, HEIC to JPG, JSON Formatter, JWT Decoder, QR Code Generator). Compress PDF and Background Remover are `beta` (noindex) until, respectively, the 500-PDF benchmark is published and the int8 model is self-hosted.

**Claims to verify before launch:** "Image-heavy PDFs shrink 40–80%" and the comparison-table sizes are estimates. Replace them with your benchmark numbers (§9). That benchmark also becomes your most citable GEO asset.

**International (§8.6):** `seo.locales` already feeds hreflang. When adding Spanish: create `/es/[slug]` with translated slugs (`/es/comprimir-pdf`), add `es` entries to each tool's `locales`, set `<html lang>` per locale via a `[locale]` root layout, and add `og:locale:alternate`. No IP redirects; show a language banner. No `geo.*` meta tags.

---

## 7. Content plan

### 7.1 Category hubs

Each hub gets an H1, a 40–60-word answer, an ItemList of tools, 3–5 FAQs and links to its guides. A hub becomes indexable only when it lists at least one live tool (enforced in code).

| Hub | Target question |
|---|---|
| /pdf-tools | What can I do with free PDF tools that don't upload my files? |
| /image-tools | How do I compress, resize or convert an image for free? |
| /developer-tools | Are online developer tools safe for tokens and private data? |
| /video-tools | Can I edit video online without uploading it? |
| /creator-tools | What free tools help creators publish faster? |
| /text-tools · /utility-tools | Word counts, text cleanup, QR codes: free and private |

### 7.2 Twenty guides (`/guides/{slug}`, Article + Person schema)

| # | Guide | Target question |
|---|---|---|
| 1 | what-is-a-jwt-and-is-it-safe-to-decode-online | Is it safe to decode a JWT online? |
| 2 | heic-vs-jpg-explained | What is HEIC and should I convert it to JPG? |
| 3 | how-to-make-a-passport-photo-at-home | How do I make a passport photo at home? |
| 4 | how-to-compress-pdf-for-email | How do I make a PDF small enough to email? |
| 5 | pdf-size-limits-for-government-portals | What file size do Indian government/exam portals accept? |
| 6 | common-json-errors-and-how-to-fix-them | Why is my JSON invalid? |
| 7 | how-to-make-images-load-faster | How do I optimize images for a website? |
| 8 | static-vs-dynamic-qr-codes | Do free QR codes expire? |
| 9 | how-to-print-qr-codes-that-scan | What size should a printed QR code be? |
| 10 | how-to-transfer-iphone-photos-to-windows | How do I open iPhone photos on Windows? |
| 11 | how-to-remove-location-from-photos | How do I remove GPS data from a photo? |
| 12 | instagram-image-sizes-2026 | What size should Instagram posts be? |
| 13 | how-to-compress-video-for-discord-and-whatsapp | How do I get a video under Discord's limit? |
| 14 | how-browser-only-tools-work | How can a website process files without uploading them? |
| 15 | how-to-check-if-an-online-tool-uploads-your-files | How can I tell if a site uploads my files? |
| 16 | base64-explained | What is Base64 and when should I use it? |
| 17 | uuid-v4-vs-v7 | Which UUID version should I use? |
| 18 | cron-syntax-cheatsheet | How do I write a cron expression? |
| 19 | how-to-sign-a-pdf-without-printing | How do I sign a PDF for free? |
| 20 | we-compressed-500-pdfs (original data) | How much can you compress a PDF? |

### 7.3 Ten comparison pages (`/compare/{a}-vs-{b}`)

| Page | Target question |
|---|---|
| png-vs-webp-vs-avif | Which image format is smallest? |
| heic-vs-jpg | Is HEIC better than JPG? |
| jpg-vs-png | When should I use JPG or PNG? |
| json-vs-yaml | Should I use JSON or YAML for config? |
| jwt-vs-session-cookies | Are JWTs better than sessions? |
| static-vs-dynamic-qr-codes | What's the difference between static and dynamic QR codes? |
| pdf-vs-docx | Should I send a PDF or a Word file? |
| mp4-vs-mov | Should I convert MOV to MP4? |
| sha256-vs-md5 | Is MD5 still safe to use? |
| browser-based-vs-upload-based-tools | Are browser-based tools more private? |

---

## 8. 90-day roadmap (weekly)

| Week | Milestone | Exit criterion |
|---|---|---|
| 1 | VPS + Docker Compose + Caddy live on klipkit.com; Search Console, Bing and Umami set up | `/` 200 over HTTPS; sitemap submitted |
| 2 | Launch 5 live tools (already built) + legal pages; self-host the int8 ISNet model | Rich Results Test passes on 5 pages |
| 3 | Merge PDF, Split PDF, JPG→PDF, PDF→JPG (pdf-lib, pdf.js) | 4 tools with full ToolSEO |
| 4 | Word Counter, Case Converter, Diff Checker, Base64, URL, UUID, Timestamp, Hash | 8 [Own] tools live |
| 5 | Run the 500-PDF benchmark → publish guide #20; Compress PDF → live; Background Remover → live | Benchmark page indexed |
| 6 | Production queue: worker + Valkey on its own box; PDF↔Word live; load test 50 concurrent jobs | p95 < 20 s; sweeper verified |
| 7 | Regex Tester, Image Resizer → live, Social Image Resizer, Thumbnail Preview, Post Formatter | 30 tools live = MVP |
| 8 | **Launch:** Show HN ("30 tools, built in-house, nothing leaves your browser"), Product Hunt, r/webdev, r/privacy, dev.to post #1 | 1st 10k visits |
| 9 | Fix top issues from launch feedback; first 5 guides; AlternativeTo/awesome-lists submissions | 10 referring domains |
| 10 | Video stack (WebCodecs + Mediabunny): Compressor, Converter, Trimmer | Tested on Chrome, Safari 17+, Edge |
| 11 | OCR, EXIF Remover, Crop, Passport Photo Maker | Passport presets for 10 countries |
| 12 | Browser extension for JSON/JWT/Base64; dev.to post #2; comparison pages 1–5 | Extension in the Chrome Web Store |
| 13 | Review: Search Console, AI-visibility check, funnel data → plan P1 wave 2; start the Spanish/Hindi pilot on the top 5 tools | Decision memo |

---

## 9. KPIs and measurement

| KPI | Definition | Target by day 90 |
|---|---|---|
| **Tasks completed per visit** (north star) | download/copy events ÷ visits | ≥ 0.6 |
| Task completion rate per tool | landing → file added → action → download/copy (Umami events) | ≥ 70% for P0 tools |
| 30-day returning users | Umami returning-visitor share | ≥ 20% |
| Tool-to-tool navigation | "Send to next tool" + related-tool clicks ÷ completions | ≥ 10% |
| Organic clicks | Search Console | 20k/month |
| AI referrals | visits with referrer chatgpt.com, perplexity.ai, gemini.google.com, copilot.microsoft.com, claude.ai | tracked; ≥ 2% of traffic |
| AI crawler hits | Caddy access logs grouped by bot user agent (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot…) | weekly trend |
| Core Web Vitals | CrUX/Search Console, mobile | LCP < 2.0 s, INP < 200 ms, CLS < 0.05 |

Umami events to add: `file_added`, `action_clicked`, `result_downloaded`, `result_copied`, `sent_to_next` (with `tool` and `next` props). No file names, ever.

**Monthly AI-visibility check (30 prompts).** Run each in ChatGPT, Perplexity, Gemini, Claude and Copilot, and record mentioned / cited / linked:

1. best free tool to compress a PDF without uploading
2. compress pdf to 100kb free
3. how to compress an image to 50kb
4. best free image compressor no upload
5. convert heic to jpg on windows free
6. safe way to convert iphone photos to jpg
7. best free json formatter
8. json formatter that doesn't send data to a server
9. how to decode a jwt safely online
10. jwt.io alternative
11. free qr code generator that never expires
12. wifi qr code generator
13. remove background from image free full resolution
14. background remover without uploading
15. free pdf to word converter privacy
16. merge pdf without uploading
17. browser-based file tools privacy
18. tinywow alternative without ads
19. smallpdf free alternative
20. ilovepdf alternative that runs in browser
21. compress image for website webp
22. how to remove location data from a photo
23. passport photo maker free no watermark
24. word counter with reading time
25. regex tester with explanation
26. free online video compressor no watermark no upload
27. mov to mp4 converter browser
28. how to check if an online converter uploads my files
29. base64 decode file online safe
30. free developer tools that run locally in browser

Log the results in a sheet (prompt × engine × {mentioned, cited, linked, competitor named}) and track the month-over-month share.

---

## 10. Open questions for you

1. **Reviewer identity:** confirm "Shivansh Saxena" as the named reviewer, and add LinkedIn/GitHub URLs for the Person `sameAs`. E-E-A-T needs a real, linkable person.
2. **Domain:** do you own klipkit.com? Every URL, the OG images and IndexNow assume it.
3. **Social profiles:** create x.com/klipkit, github.com/klipkit and the others before launch, or remove them from `SAME_AS` (unverifiable `sameAs` links hurt entity trust).
4. **Hosting region:** EU (best bandwidth allowance) is my recommendation. Is your main audience India? If so, also plan a Singapore VPS.
5. **Open-source the worker?** Publishing `worker/` (and maybe the browser engines) is a strong trust and Hacker News asset. Is that OK?
6. **Training crawlers:** I allowed GPTBot, ClaudeBot and Google-Extended. Say if you'd rather block training and allow only retrieval bots.
7. **Hashtag Finder:** will someone curate the dataset by hand? If not, I'd drop it.
8. **Monetization timing:** API (§5.9) before or after Pro? It affects whether Postgres-backed keys come in Q1.
9. **First non-English locale:** Hindi (largest growth) or Spanish (largest volume)?
