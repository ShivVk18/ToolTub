# Task 1 — Fix the broken KlipKit UI (match the reference exactly)

## Role
You are a senior front-end engineer and design-systems specialist. Make the Next.js app **look, move and behave exactly like `design/reference/KlipKit_UI.html`**, in light and dark mode, at every screen size.

---

## 1. Bugs already seen (from a screenshot at 2560 px wide, light mode, at the top of the page)

Fix each one and record its **root cause** in the report.

| # | What's wrong | What it should be (reference) |
|---|---|---|
| B1 | **The hero orb doesn't render at all.** The orb area is empty. | A glossy rotating conic-gradient orb (~252 px) sits centred under the headline, breathing and leaning toward the cursor, with the "Drop here" label. |
| B2 | **The satellites orbit an invisible point on top of the headline** ("MP3", "CSV" sit over "say what" and cover the hint text). | Satellites orbit **the orb's centre** on a tilted ellipse, in front of and behind the orb. They must stay hidden until the orb has been measured. |
| B3 | **The hero layout has collapsed.** Headline line 2 ("Or just say what you need.") overlaps the hint "Drop a file, paste text or code, or just ask:". | Vertical order with spacing: eyebrow → H1 (2 lines) → orb slot (fixed size, `flex:none`) → hint → ask bar → chips → recents. Nothing overlaps. |
| B4 | **The nav items collide.** "Pricing" touches the search pill, and the bar looks squeezed. | Full-width nav at the top (logo, 4 links with 30 px gaps, search pill min 250 px with ⌘K, theme, Log in, Go Pro). It only becomes the floating glass capsule **after scrolling 60 px**. |
| B5 | **The Next.js dev overlay shows "1 Issue".** | Zero errors in the console and the overlay: no hydration mismatch, no `window`/`document`/`localStorage` access during render. |
| B6 | **Duplicated hero chips:** PDF · Photo · Song · Video · JSON · Paste JSON · … | **PDF · Photo · Song**, then a thin divider, then the dashed alt chips **{ } Paste JSON · JWT Paste a token · ✦ Generate UUIDs**. Remove the Video and JSON file chips. |
| B7 | **Large empty area below the chips;** the hero isn't vertically balanced. | Hero stage height `max(100vh, 780px)`, top padding `clamp(120px,13vh,150px)`. The orb fills the middle. Compare at 1920×1080 and 2560×1440. |
| B8 | **The "Recent:" row shows long file names without limits.** | Show at most 3 recents, each truncated with an ellipsis (`max-width: 220px`), rendered **only after mount** (client-only, from localStorage with try/catch). |
| B9 | A dark 4 px bar shows at the very top. | The scroll progress line is **2 px**, gradient `#7C6BFF → #FF9C82 → #FFD27A`, `scaleX(0)` at the top of the page. Check it isn't a leftover border or element. |

> **Assume more is broken than the screenshot shows.** Audit every section in step 3.

---

## 2. Most likely root causes in Next.js (check each one)

- **The orb's coordinate system.**
  - The orb must be an `absolute` child of the **stage** container (`position: relative`, the hero viewport). Its position comes from the **slot element's** `getBoundingClientRect()` minus the stage's rect, **measured every frame in a single rAF loop**, started in `useEffect` after mount.
  - Re-measure after `document.fonts.ready` and on resize (ResizeObserver).
  - If it's measured during render or before layout, the result is 0×0 at (0,0) and you get exactly B1–B3.
- **The orb slot has no size.** It needs explicit `width/height: clamp(170px, 13.2vw, 252px)` and `flex: none`. A Tailwind class purge or a missing arbitrary value collapses it.
- **CSS that Tailwind or CSS Modules break.**
  - The orb uses `conic-gradient(from calc(var(--r)*1deg), …)`, `filter: blur()`, `mix-blend-mode: soft-light` and nested layers (`.o-glow`, `.o-ball`, `.o-core`, `.o-swirl`, `.o-rim`, `.o-gloss`, `.o-label`).
  - Put this CSS in `globals.css` (or a non-hashed CSS file) **verbatim from the reference**, and make sure the class names actually match the JSX.
  - Check the CSS variables `--r`, `--r2`, `--hx`, `--hy`, `--lab` are set with `style.setProperty` in the loop.
- **Stacking.** The orb is `z-index: 5` inside the stage. Satellites are 4 (behind) or 6 (in front) and must be **siblings in the same stacking context**: no `opacity`, `transform` or `filter` on their wrapper.
- **Hydration (B5).**
  - Anything using `localStorage` (theme, recents), `Math.random` (grain noise, confetti), the date or time (typewriter, timestamps) or `window` sizes must run in `useEffect` or a client-only component.
  - Set the theme **before paint** with a tiny inline script in `<head>`, and put `suppressHydrationWarning` on `<html>`.
- **The nav (B4).**
  - The structure must be `#nav > .navin > (brand, links, navr)`, with `.navin` as a flex container with `gap: 28px` and the links pushed by `margin-left: auto` on the right group.
  - The `scrolled` class is only added when `scrollY > 60`. If it's on at load, the capsule width `min(1280px,100%)` squeezes the items.
- **Fonts.** Lora and Inter come from `next/font/local` with the same weights as the reference. A different font changes line heights and causes overlaps.

---

## 3. Process

1. **Branch and safety:** follow the ground rules in `00_START_HERE.md`.
2. **Reproduce:**
   - Run `npm run dev` and `npm run build && npm start`.
   - Record every console error, every Next.js overlay issue (copy its full text) and every failed network request.
3. **Visual audit with Playwright.** Write `scripts/visual-compare.ts`:
   - It opens **the reference HTML** and **the app** in the same states and takes screenshots of both.
   - For deterministic frames, use `page.clock.install({time:0})` then `page.clock.pauseAt(20000)`, and step time with `page.clock.runFor(ms)`. Freeze CSS animations each frame with `document.getAnimations().forEach(a => { a.pause(); a.currentTime = … })`.
   - **Viewports:** 2560×1440, 1920×1080, 1440×900, 768×1024, 390×844.
   - **Themes:** light and dark.
   - **States:**
     - (a) hero at rest
     - (b) cursor near the orb
     - (c) file dragged over the page (veil + energised orb + satellites pulled in)
     - (d) workspace after dropping the sample PDF
     - (e) typing "compress to under 2 mb and split pages 1-5" (live highlight + plan preview)
     - (f) plan running and done (confetti and results)
     - (g) pasted JSON flow
     - (h) live panel `#json-formatter` and `#regex-tester`
     - (i) ⌘K palette
     - (j) Pro voice sheet
     - (k) scrolled 200 px (capsule nav)
     - (l) marquee band
     - (m) bento section
     - (n) Explore grid + tab change
     - (o) pricing (monthly/yearly)
     - (p) footer giant wordmark with the cursor over it
   - Save side-by-side images and a **pixel diff** (`pixelmatch`) to `reports/ui/`.
4. **Fix** B1–B9 first, then every other difference the audit finds, **section by section**:
   - hero
   - orb + satellites + squiggle + typewriter
   - nav
   - workspace
   - paste/ask flows
   - live panel
   - palette
   - sheet
   - marquee
   - bento
   - explore
   - pricing
   - wordmark
   - footer
5. **Re-run the comparison** after each section. Target: **at most 2% of pixels differ** per state (ignore the animated orb interior and text-caret regions, using masks). Explain any difference you deliberately keep.
6. **Port the behaviour, not just the look.** The intent parser, paste detector, generators and live tools must use the **same logic** as the reference (`parse()`, `detect()`, `genParse()`, `PANELS`, `ACT`). Move them into `lib/` modules and import them; don't re-invent them.
7. **Performance check:** Lighthouse (mobile) on the home page. Performance ≥ 90, CLS < 0.05, no long tasks over 200 ms while idle. The orb, satellites, marquee and bento loops must pause when off screen.
8. **Accessibility check:** axe has 0 serious or critical issues; keyboard navigation works for the orb, chips, Run, palette and sheet; `prefers-reduced-motion` turns off satellites, marquee, typewriter and magnetic effects.

---

## 4. Acceptance checklist (all must pass before task 2)
- [ ] The orb renders, breathes, leans toward the cursor, energises on drag, flies into the workspace dock and comes back on "New".
- [ ] Satellites orbit the orb (never over the text), have depth, get pulled in while dragging and fade out in the workspace.
- [ ] Nothing overlaps in the hero at any viewport; the hero is balanced at 1920 and 2560 wide.
- [ ] Nav: full width at the top, capsule after 60 px of scroll, nothing collides, and the progress line works.
- [ ] Chips exactly as the reference (B6); recents truncated and client-only.
- [ ] 0 console errors, 0 Next.js overlay issues, 0 hydration warnings, in dev **and** production builds.
- [ ] Every state (a)–(p) matches the reference within 2% pixel difference, in light and dark, at all 5 viewports (or the difference is explained).
- [ ] Lighthouse mobile ≥ 90; axe clean; reduced motion respected.

## 5. Deliverable: `reports/ui-fix-report.md`
1. A summary: what was broken and why (root causes), in plain language.
2. A table: Bug ID → root cause → fix → commit → verified (screenshot link).
3. Before and after screenshots for each state (a)–(p) (light at 1920; dark at 1920; mobile at 390).
4. A pixel-diff table per state and viewport, with the % different.
5. Lighthouse and axe results.
6. Anything left open, with the reason and the next step.
