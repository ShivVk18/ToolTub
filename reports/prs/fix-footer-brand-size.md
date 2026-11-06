# fix(footer): footer brand was nav-sized (38 px mark, 22 px text, 44 px tall)

## What and why
The reference sizes the footer brand inline (30 px mark, 17 px text) because the global `.brand`/`.mark` rules are for the nav. The port used Tailwind size classes, which lose to those unlayered rules, and `.brand` also has `min-height: 44px` (touch target), so the footer was 145 px tall instead of 131.

## How
Inline sizes like the reference; `margin-block: -7px` on the brand link keeps its 44 px tap target while laying out at 30 px.

## Evidence
- New e2e "footer brand matches the reference size" (footer height, mark width, brand font size equal to the reference): failed (145 / 38 / 22px), passes now. `redesign-ui.spec.ts`: 23/23.
- `npm run verify`: green (see ship log).

## Checklist
- [x] One concern only
- [x] Failing test first
