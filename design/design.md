# KlipKit design DNA

Distilled from `design/reference/KlipKit_UI.html` (the source of truth) and the restored app. Use it to judge any new UI: if a change fights one of these, it needs a reason.

## 1. Idea in one line
**A calm, warm desk where one object does the work.** Paper-coloured canvas, ink type, one glossy orb you drop things into; everything else steps back.

## 2. Signature elements (identity — don't change without the owner's OK)
| Element | What makes it KlipKit |
|---|---|
| Warm paper + ink | `--bg #F3F0E8`, `--ink #17161B`; dark theme `#0E0D12` / `#F3F1EC`. Never pure white canvas or pure black. |
| Violet accent | `--accent #6D5DF5`, used sparingly: kickers, focus, active highlights. Peach `#FF8E6E` and mint/ok `#1F9D63` support it. |
| Serif display | KKSerif (Lora), weight 500, tight tracking (−0.025em). Second phrase of every big heading is *italic in muted ink*. |
| The orb | Conic-gradient sphere with gloss, breathes and leans toward the cursor; docks into the workspace. The only "glowy" object on the page. |
| Drop / paste / ask | One input model for everything: drop a file, paste anything, or type in plain words; live highlight turns words into plan steps. |
| Satellites, squiggle | Mono file-type pills orbiting the orb; hand-drawn gradient underline under "just say". |
| Marquee, bento, wordmark | Serif/outline phrase band; "Why KlipKit" bento with live demos; giant outline-to-gradient "KlipKit" wordmark that follows the cursor. |

## 3. Type
- Display: serif 500, `clamp(48px, 5.9vw, 112px)` hero, `clamp(40px, 4.4vw, 84px)` sections, line-height ~1.02–1.04.
- UI: Inter 400/500/600; body 15–19 px; browser-normal line height in the home design.
- Mono: system stack, for satellites, code and pasted content.
- Kickers: 13 px, 600, letter-spacing 2.6 px, uppercase, numbered in violet ("01 Why KlipKit").

## 4. Shape, space, depth
- Pills and chips fully round; cards 22–24 px radius; plans 32 px; panels 24 px.
- Spacing steps used by the reference: 4, 8, 12, 14, 18, 22, 26, 30, 40 px; sections padded `clamp(80px, 12vh, 140px)`.
- Shadows are long, soft and warm (`--shadow`, `--shadow2`); never grey drop shadows. One level of elevation per surface.
- Grain overlay 5% and three slow aurora blobs behind everything.

## 5. Motion
- UI easing `cubic-bezier(.2,.8,.2,1)`; springs for the orb (k 150, ζ 0.78).
- Motion explains something: the orb swallows a file, the plan bars fill, satellites pull in while dragging.
- Reduced motion: no satellites, marquee, typewriter or magnetic effects; the orb only follows its slot.

## 6. Voice
- Short, plain, confident: "Drop it. Paste it. Or just say what you need." "Free forever. Pro when you need more."
- Concrete over hype: name the thing (JSON, JWT, 24-page PDF, under 2 MB). Privacy is stated as fact ("0 bytes uploaded").

## 7. Honesty and accessibility
- Never show success for work that didn't happen; unbuilt tools say **Coming soon**.
- WCAG AA wins over pixel parity: small muted text on white uses `--ink2`; small white labels on colour get a shade.
- 44 px touch targets, visible focus, `aria-live` status.
