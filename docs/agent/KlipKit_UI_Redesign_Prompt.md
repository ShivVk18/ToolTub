# KlipKit UI redesign — full design spec

The design for KlipKit's home experience. The living reference is `design/reference/KlipKit_UI.html`; when this spec and the reference disagree on pixels, the reference wins. Values below are taken from the reference.

---

## 1. Product idea

**"Drop it. Paste it. Or just say what you need."** One page, three ways in:

1. **Drop** a file anywhere on the page (or pick one).
2. **Paste** anything: text, code, a JWT, JSON, an image (⌘V anywhere).
3. **Ask** in plain words ("compress to under 2 mb and split pages 1-5", "generate 10 UUIDs").

KlipKit detects what it got, proposes a plan (highlighted as you type), runs it **on the device**, and offers the next step. 76 tools, no accounts, no uploads for most tools. Plans: **Free** and **Pro** only.

## 2. Design tokens

### 2.1 Colour

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F3F0E8` (warm paper) | `#0E0D12` |
| `--bg2` | `#ECE7DC` | `#15141B` |
| `--panel` | `rgba(255,255,255,.66)` | `rgba(28,27,35,.66)` |
| `--solid` | `#FFFFFF` | `#1A1921` |
| `--soft` | `#FAF8F3` | `#211F29` |
| `--ink` | `#17161B` | `#F3F1EC` |
| `--ink2` | `#3B3943` | `#D2CEC6` |
| `--muted` | `#7C7870` | `#8F8B94` |
| `--faint` | `#A9A59C` | `#6A6770` |
| `--line` / `--line2` | `rgba(23,22,27,.08)` / `.14` | `rgba(255,255,255,.07)` / `.13` |
| `--accent` | `#6D5DF5` (violet) | same |
| `--accentSoft` | `rgba(109,93,245,.12)` | `rgba(140,125,255,.16)` |
| `--peach` | `#FF8E6E` | same |
| `--ok` / `--okSoft` | `#1F9D63` / `rgba(31,157,99,.12)` | same / `.18` |
| `--red` | `#E5484D` | same |
| Highlight fills `--h0..h3` | violet, peach, mint, blue at ~.2 alpha | ~.26 alpha |
| Underline inks `--u0..u3` | `#6D5DF5 #F2734F #1F9D63 #2F80ED` | `#9C8FFF #FF9C7E #3CCB8A #69A8FF` |
| Aurora blobs | `#D8CEFF #FFD5BF #CBEBDC`, opacity .6 | darker equivalents |

Category colours: Productivity `#E5484D`, Developer `#6D5DF5`, Creator `#1F9D63`.
Signature gradient (orb, progress line, squiggle, Pro ring, wordmark): `#7C6BFF → #B38BFF → #FF9C82 → #FFD27A → #8FE0BE → #6FB7FF`.

### 2.2 Type

- **Display:** serif `KKSerif` (Lora), weight 500, self-hosted. H1 `clamp(48px, 5.9vw, 112px)`, line-height 1.02, letter-spacing −.025em. Line 2 italic in `--muted`.
- **UI:** `Inter` (400/500/600), self-hosted. Body 15–19 px.
- **Mono:** system monospace stack (satellites, code, panels).
- Section H2: serif, large, with a small numbered kicker ("01 Why KlipKit").

### 2.3 Shape, depth, motion

- Radii: chips and pills 999px; cards 22–24px; plans 32px; panels 24px.
- Shadows: `--shadow` (soft, warm, long) and `--shadow2` (deeper). No harsh black shadows.
- Easing: `cubic-bezier(.2,.8,.2,1)` for UI; springs for the orb (stiffness 150, damping ratio .78).
- Grain overlay at 5% opacity; aurora blobs drift slowly behind everything.

## 3. Layout and sections (top to bottom)

1. **Progress line** — fixed, 2 px, signature gradient, `scaleX(scroll%)`, `scaleX(0)` at the top.
2. **Nav** — fixed, 84 px tall, full width, padding `0 clamp(20px,3.6vw,72px)`, `gap: 28px`. Brand (logo tile + "KlipKit", 22 px/600), links **Tools · Why KlipKit · Pro · Pricing**, right group: search pill (min 250 px, "Search 76 tools…", ⌘K), theme button, **Log in**, **Go Pro** (ink pill). After **60 px** of scroll it becomes a floating glass capsule `min(1280px,100%)`.
3. **Stage / hero** — height `max(100vh, 780px)`, top padding `clamp(120px,13vh,150px)`, centred column:
   - eyebrow pill: "✦ 76 tools · Runs on your device · Free forever"
   - H1: "Drop it. Paste it." / *"Or just say what you need."* — words rise in with blur, staggered 70 ms
   - hand-drawn **squiggle** under "just say", drawn after 1.4 s
   - **orb slot** `clamp(170px,13.2vw,252px)` square, `flex:none`
   - hint "Drop a file, paste text or code, or just ask:"
   - **ask bar** `min(660px,92vw)`, pill, live syntax highlight mirror, typewriter placeholder cycling examples, ↵ button
   - chips: **PDF · Photo · Song** | divider | dashed alt chips **{ } Paste JSON · JWT Paste a token · ✦ Generate UUIDs**
   - recents (max 3, truncated at 220 px, client-only)
4. **Workspace** (replaces the hero after a drop, paste, ask or tool pick) — column `min(880px,92vw)`; header with the orb docked (58 px) and status; a chat-like **thread** (bot bubbles 19 px, user bubbles ink, cards 24 px radius); file card with real metadata; suggestion chips; **plan card** with steps, progress bars and Run; results with sizes, Copy, Download, "What next?"; composer at the bottom with live highlight and plan preview; **New** returns to the hero.
5. **Live panel** — split view for developer tools (18 live tools: JSON Formatter, Base64, URL Encoder, UUID, Password, Hash, JWT, Timestamp, Cron, Color, Regex, Word Counter, Case Converter, SQL, CSV↔JSON, JSON to TypeScript, Lorem Ipsum, Clean Text): input, options, output, status bar, Sample / Clear / Copy, full screen, Esc, ⌘Enter, deep link `#slug`.
6. **Marquee band** — infinite horizontal band of serif and italic phrases, edge-faded mask, borders top and bottom.
7. **Why KlipKit (bento)** — kicker "01 Why KlipKit", H2 "Easy to use. Actually enjoyable." 12-column bento: typing demo ("Say it like you'd say it", caret), stats (76 tools · 0.8 ms · 0 accounts), paste-detection cycle, "Private by design", keyboard ⌘K keycaps, the three-step story (One drop. One tap. Done.), and the "No sign-ups · No pop-ups · No waiting · No uploads · No clutter" strip.
8. **Explore** — H2 "76 tools. One place.", category tabs with a sliding indicator, 4-column grid (2 under 1100 px, 1 under 640 px), cards 168 px min, 3D tilt + cursor spotlight, tag top-right (**● Live**, "On device", "Private server", or **Coming soon**), "See all" toggle.
9. **Pricing** — H2 "Free forever. Pro when you need more.", Monthly/Yearly toggle (yearly "save 30%"). Two plans, max 460 px each:
   - **Free** ₹0, forever, no sign-up: all tools, on device, no watermarks, smart suggestions and Tool Chains. "Start free".
   - **Pro** (dark card, rotating conic ring, "MOST LOVED") ₹299/month (₹208/month yearly): voice commands, batch processing, files up to 2 GB, saved chains and history. "Go Pro".
10. **Giant wordmark** — "KlipKit" at 23vw serif, outlined layer plus a gradient layer revealed by a spotlight under the cursor.
11. **Footer** — muted 14 px, top border, links (About, Privacy, Licences), "No sign-up · Runs on your device".

Overlays: **⌘K palette** (top-anchored at 16vh, blurred backdrop, synonyms, arrow keys, empty state), **Pro voice sheet** (centred, waveform, streaming words with live highlight, auto-send), **drag veil** (fixed, radial vignette following the cursor, dashed inset border), **toast**.

## 4. The orb (signature element)

- 360 px base element, scaled to the slot; `absolute` inside the stage; position = slot centre (measured every frame) with a spring.
- Layers: `.o-glow` (blurred violet/peach halo), `.o-ball` (clip) → `.o-core` (rotating conic gradient, blur 18px), `.o-swirl` (counter-rotating soft-light conic), `.o-rim`, `.o-gloss` (highlight that follows the cursor via `--hx/--hy`), `.o-label` ("Drop here" with arrow, opacity `--lab`).
- Behaviour: breathes (±1.8%), leans toward the cursor within 520 px, speeds up and swells on drag (`energy`), "gulps" when it eats a file, flies to the workspace dock (58 px) and back on New. Click or Enter opens the file picker.

## 5. Satellites

- 9 mono pills (PDF, JPG, MP3, JSON, PNG, MP4, CSV, #HEX, JWT) with category dots.
- They orbit **the orb's centre** on a tilted ellipse; depth sets scale, opacity and z-index (4 behind the orb, 6 in front).
- Hidden until the orb is measured; pulled inward while dragging; fade out in the workspace; off with reduced motion.

## 6. States to design and test

(a) hero at rest · (b) cursor near the orb · (c) file dragged over · (d) workspace after the sample PDF · (e) typing a multi-step instruction (highlight + plan preview) · (f) plan running and done (confetti, results) · (g) pasted JSON flow · (h) live panel (`#json-formatter`, `#regex-tester`) · (i) ⌘K palette · (j) Pro voice sheet · (k) scrolled 200 px (capsule nav) · (l) marquee · (m) bento · (n) Explore + tab change · (o) pricing monthly/yearly · (p) footer wordmark with cursor.
Each in light and dark at 2560×1440, 1920×1080, 1440×900, 768×1024, 390×844.

## 7. Honesty rules

- Never show success for work that did not happen. Results show real sizes, real files and real downloads.
- Tools that aren't built show **Coming soon** and don't pretend to run.
- Server tools say so ("Processed on KlipKit's own server — deleted after 1 hour").

## 8. Accessibility and performance

- WCAG AA contrast in both themes; visible focus; 44 px touch targets; keyboard paths for orb, chips, Run, palette, sheet and panels; `aria-live` status.
- `prefers-reduced-motion` turns off satellites, marquee, typewriter, magnetic effects and continuous orb motion.
- Lighthouse mobile ≥ 90, CLS < 0.05; loops pause off screen; no third-party requests.

## 9. Identity guardrails (do not change without the owner's OK)

- Palette and tokens (warm paper, ink, violet `#6D5DF5`, peach, mint, the dark theme).
- Lora serif display type.
- The orb as the signature element (it may be refined and less "glowy").
- The drop / paste / ask model, the live-highlight composer, satellites, marquee, bento and the giant wordmark.

**Encouraged polish:** fewer centred-everything layouts and uniform card grids, no nested cards or default shadows, distinctive icons instead of generic tiles, specific copy, stronger hierarchy and spacing rhythm, motion with a purpose, complete focus / empty / loading / error states. A more distinctive sans than Inter may be proposed, but only as a question to the owner.
