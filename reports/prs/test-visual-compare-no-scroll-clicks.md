# test(visual): click tabs without scrolling so reference and app frames line up

## What and why
States n (Explore tab) and o (pricing Yearly) clicked with Playwright, which scrolls the target into view first. In the reference that click jumped the page up ~570 px (scrollY 3709 → 3139), so the two screenshots showed different parts of the page and pricing scored 15–18% for a reason that had nothing to do with the app.

## How
`clickText(page, scope, text)`: finds the tab by text and calls the DOM `click()`, which doesn't scroll.

## Evidence
Pricing (1440 / 1920 light) 14.6% / 18.3% → 5.4% / 7.2%; Explore 4.95% / 4.82% → 2.44% / 2.83%.

## Checklist
- [x] One concern only (harness)
