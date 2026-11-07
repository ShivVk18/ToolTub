# Visual baseline v2 — after the Hallmark pass

Screenshots of the app at tag `hallmark-pass`, taken by `npm run visual` with a frozen clock and paused animations. They show the 16 reference states (a–p) in light and dark, at 1440×900 and 390×844 (64 JPGs, quality 70). The 5 viewports × 2 themes × 16 states as PNGs come to 192 MB, too much for git; regenerate them with `npm run visual` (output in `reports/ui/`, gitignored).

`results-vs-v1.json` holds each state's pixel difference from v1, the reference prototype: 89/160 within 2%. Every larger difference traces back to a change that was approved:

| Change | States it moves |
|---|---|
| Geist instead of Inter (A2): every line of UI text, and narrower text re-wraps on phones | all, most at 390 px (e: composer fits on 2 lines instead of 3) |
| Explore header left-aligned (A3), per-tool glyphs (F11), "Coming soon" tags (F5/A1) | n |
| Flatter bento demo (A4), measured stat (F12), concrete subline (A7) | l, m |
| "MOST CAPABLE" badge (A7) | o |
| Softer dark aurora (A5) | dark variants |
| AA colours for the eyebrow, chip glyphs and dark kickers (#59) | a–k (hero) |

Use v2 as the reference for future visual checks. Compare against v1 only to see what the Hallmark pass changed.
