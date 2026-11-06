# fix(ui): section headings lost their italic second phrase

## What and why
"Actually enjoyable.", "One place." and "Pro when you need more." render upright. In the reference these `<em>`s only get `color: var(--muted)` and keep the browser's italic. The port added both `not-italic` and `italic`; in Tailwind's generated order `not-italic` wins.

## How
Removed `not-italic` in FeelSection, ExploreSection and PricingSection.

## Evidence
- New e2e "section headings keep their italic second phrase": failed (`normal` ×3), passes now. `redesign-ui.spec.ts`: 14/14.
- `npm run verify`: exit 0.

## Checklist
- [x] One concern only
- [x] Failing test first
- [x] `npm run verify` green
