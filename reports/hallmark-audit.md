# Design audit ("Hallmark" de-slop pass) — report only

Phase 3, steps 2–3. The Hallmark skill isn't installed in this environment, so the audit was done by hand against `design/design.md` (the design DNA from step 1) and the gates in the master prompt: centred-everything, uniform card grids, nested cards, default shadows, generic icon tiles, stock glows, generic copy, weak hierarchy/spacing, purposeless motion, missing focus/empty/loading/error states, dark-mode issues.

Covered: home (hero, workspace, plan, live panel, palette, Pro sheet, marquee, bento, Explore, pricing, footer) and all tool, hub, about, privacy, licences, search and chain pages — light and dark, 1440×900 and 390×844, plus empty/focus/working/error/success states on JSON Formatter, Image Compressor and Compress PDF (76 screenshots, local).

**Gates that pass:** focus (2 px violet outline on every tab stop), purposeless motion (none found), generic hype copy (no "seamless/unleash/powerful").

## FIX — clear wins, no identity change

| # | Where | Problem | Proposed fix | Sev |
|---|---|---|---|---|
| F1 | All tool pages; every `<Button>` | Unlayered `button{background:none;border:0}` beats Tailwind: ink primary CTAs ("Compress images", "Download", "Run chain") render as faint transparent pills; no clear main action | Move the element reset into `@layer base` | High |
| F2 | Every tool/hub/about/search/chain page | Unlayered hero `h1{text-align:center;font-size:clamp(48px…112px)}` overrides `text-3xl`: every H1 is ~85 px and centred over left-aligned content; long names wrap to 3 lines | Scope to `#hero h1`; tool pages get a left-aligned serif H1 (~48–56 px desktop, 36 px mobile) | High |
| F3 | JSON/JWT output, any `font-mono` | `--font-mono: var(--font-mono), …` refers to itself → invalid → code renders in Inter | Point it at the mono stack | High |
| F4 | JSON output, file-summary bar, progress track, dropzone drag state | shadcn `bg-muted` maps to the **text** grey `--muted` → heavy grey slabs (ink on #7C7870 ≈ 4:1; dark ≈ 3:1) | Map the `muted` surface colour to `--soft` / `--bg2`; keep `text-muted` for text; accent progress fill | High |
| F5 | Explore grid, palette | Unbuilt tools are tagged "On device" and open a workspace that fakes results | Tag and treat them as **Coming soon** (ties into Phase 4) | High |
| F6 | Bento "Private by design" card | The lock ring overlaps its own "PRIVATE BY DESIGN" label | Reserve space for the ring | Med |
| F7 | Image Compressor, Compress PDF | Wrong file type accepted silently (error only after clicking Compress); picked file shows as tiny hint text; error has no fix/retry; success is a bare text line | Validate on selection; file chip (name, size, remove); error + "choose another"; result row with before/after size and an ink Download pill | Med |
| F8 | Sliders, checkboxes, selects on tool pages | Browser-blue native controls clash with the violet accent; white track in dark | `accent-color: var(--accent)`; style selects/inputs like home chips | Med |
| F9 | Hub pages (/developer-tools 24 cards, /pdf-tools 9) | Uniform grid of identical "Coming soon" cards outweighs the 2 live tools | Live tools as large cards; backlog as a compact muted chip list | Med |
| F10 | Related tools on tool pages | Lone white card, misaligned with the SEO column | One column width; related tools as home-style chips | Med |
| F11 | Explore grid | Generic icon tiles: the same `<>` glyph on ~15 developer tools, the same doc icon on every PDF tool, a padlock on both JWT and Hash | Per-tool mono glyphs in the satellites' style (`{ }`, `JWT`, `#`, `B64`, `UUID`, `SQL`, `CRON`…) | Med |
| F12 | Bento stat "0.8 ms typical dev-tool run" | Unverified claim; the live panel itself reports 1–2 ms | Use a measured figure ("~2 ms") or drop the stat | Med |
| F13 | Tool pages | "Send to next tool" is rounded-md while neighbours are pills; ☆ favourite floats alone with no label | Pills everywhere; "☆ Save" chip next to the badges | Low |
| F14 | /search | Underlined link list; rectangular input | Pill input, rows with category tags, muted coming-soon | Low |
| F15 | JSON Formatter content block | "About json formatter" (raw lowercase keyword); "Guide (coming soon)" filler items | Use the display name; hide guides that don't exist | Low |
| F16 | Chain/image-tools footer, phone, dark | Tagline wraps into a 4-line column | Hide the tagline under 400 px | Low |

## KEEP — identity (and why)

| # | Element | Why keep |
|---|---|---|
| K1 | Warm paper/ink palette, violet accent, dark theme | Core identity (guardrail) |
| K2 | Serif display with italic muted second phrase | Signature typographic voice |
| K3 | Orb as the only glowing object; satellites; squiggle | Signature; the glow has a job (drop target, energy while dragging) |
| K4 | Drop / paste / ask, live-highlight composer | The product idea |
| K5 | Marquee, bento demos, giant wordmark | Identity sections; the demos *explain* the product |
| K6 | Soft warm shadows, grain, aurora | Part of the warm "desk" look; one elevation level only |
| K7 | `--ink2` instead of muted grey for small text; shaded file tiles | Needed for WCAG AA (muted on white is 4.39:1) |
| K8 | Phone nav shows a search icon (reference overflows) | Better than the reference on small screens |

## ASK ME — changes identity or product, needs your call

| # | Question | Options / recommendation |
|---|---|---|
| A1 | **Unbuilt tools (50 of 76).** Home says "76 tools" and the grid lists all of them. | Recommend: keep the 76-card grid but mark 50 **Coming soon** and make the eyebrow honest ("26 tools live · 50 on the way"), or show only live tools. |
| A2 | **Inter → a more distinctive sans** for UI text | Recommend trying a humanist grotesk with more character (self-hosted, OFL), e.g. "Instrument Sans" or "Geist"; Inter is the default AI-site look. |
| A3 | **Every section uses the same centred kicker + serif H2 + centred subline** (reference rhythm) | Recommend left-aligning one or two sections (Explore, Pricing) for rhythm, or keep the reference's symmetry. |
| A4 | **Bento typing demo nests 3 cards** (card → demo card → input card) | Recommend flattening to one inner surface. Bento is identity, hence ask. |
| A5 | **Dark-mode aurora** — strong magenta/violet blooms in the corners read as stock glow | Recommend ~30% lower blob opacity in dark only. |
| A6 | **Tool pages adopt home devices** — serif section heads with numbered kickers, FAQ as `<details>`, an orb-tinted drop target instead of the lucide upload box | Recommend yes, using existing tokens/components. Touches the orb/drop model, hence ask. |
| A7 | **"MOST LOVED" badge** on the Pro plan (no users yet) and "feels like magic" copy | Recommend "Most capable" / dropping the badge, and concrete copy. |

## Order of work after approval

F1–F4 first (one PR each; they change every tool page at once), then F5 with Phase 4, then F6–F16, then approved ASK items. Each as `style/hallmark-<item>` with before/after screenshots, re-running the audit, visual compare (home must stay within 2%), axe and Lighthouse.

## Re-audit after the pass (tag `hallmark-pass`)

Every item was done as its own `style/hallmark-*` PR with a failing test first: F1–F16 (#38–#53), A7 (#54), A4+A5 (#55), A6 (#56), A2+A3 (#57). A2+A3 was merged after you reviewed the before/after; you chose "Geist + left-align Explore only". Pricing stays centred because its cards are centred.

Re-checking the original gates on the final build:

| Gate | Result |
|---|---|
| Centred everything | Explore header left-aligned. Tool, hub, search and legal pages use one left-aligned column (F2, F10). |
| Uniform card grids | Hubs lead with large live cards and list the backlog as compact chips (F9). Explore cards have per-tool glyphs (F11). |
| Nested cards | Bento demo flattened (A4). No other card → card → card found. |
| Generic icon tiles | 37 developer/PDF tools have their own glyph; Protect PDF keeps the only padlock (F11). |
| Stock glow | Dark aurora 30% softer (A5). The orb stays the one glowing object (K3). |
| Generic / unearned copy | No "MOST LOVED", "magic" or invented stat (A7, F12). Tool count is honest (F5/A1). |
| States (empty / error / success) | File tools validate on selection; file chip, retry and result row (F7). |
| Dark mode | Native controls dark (F8); AA colours checked in both themes. |
| Focus, motion | Unchanged and passing (2 px violet focus; decorative motion off under reduced motion). |

**Found during the re-run and fixed:**
- #58: /qr-code-generator scored 86 on mobile Lighthouse because the QR was painted only after JavaScript.
- #59: home eyebrow, chip glyphs and dark kickers were below AA. The home axe test hadn't caught them because it ran where axe can't resolve the background.

**Still open:**
- **Explore "● Live" tag.** It keeps the reference's `--ok` green, about 3.4:1 at 12 px. Axe doesn't flag it (bold text in a translucent card), but the hubs already use the AA green `--g-c`. Should Explore match?
- **LCP above the 2 s budget.** All pages measure about 3.4 s on mobile. First paint and Speed Index are 0.9 s; most of the LCP is "render delay", likely the three web fonts arriving late. Investigate in Phase 4/5 rather than guess.
- **Unused fonts.** The Inter files in `src/fonts/` are no longer used. They stay until you OK deleting them.
