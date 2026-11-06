# fix(ui): the scrolled nav capsule had no backdrop blur

## What and why
After 60 px of scroll the nav becomes a glass capsule with `backdrop-filter: blur(16px) saturate(1.2)`. The source declared the standard property and then `-webkit-backdrop-filter`; the build's CSS minifier merged the pair and kept only the prefixed one, which current Chrome and Firefox ignore. The headline showed sharply through the nav links.

## How
Declare `-webkit-backdrop-filter` first and the standard property last; the compiled rule now keeps both.

## Evidence
- New e2e "the scrolled nav capsule blurs what's behind it": failed (`none`), passes now. `redesign-ui.spec.ts`: 15/15.
- Compiled CSS for `body.scrolled .navin` contains both `-webkit-backdrop-filter` and `backdrop-filter`.
- `npm run verify`: exit 0.

## Checklist
- [x] One concern only
- [x] Failing test first
- [x] `npm run verify` green
