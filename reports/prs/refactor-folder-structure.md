# refactor: move files to the standard folder structure (no behaviour change)

## What and why
Standards §2.1 define the target layout. Home-page components lived in `components/design`, tool chrome in `components/workspace`, CSS in `app/`, and SEO builders, stores and motion code loose in `lib/`.

## How (git mv + automatic import rewrite)
- `components/design/{Nav,DesignFooter,AuroraBackground,GlobalModals}` → `components/layout/`
- other `components/design/*` → `components/home/`
- `components/workspace/*` → `components/tool/`
- `app/globals.css` → `styles/globals.css`
- `lib/animation.ts` → `lib/motion/animation.ts`
- `lib/store.ts`, `lib/uiStore.ts` → `lib/store/klip.ts`, `lib/store/ui.ts`
- `lib/{metadata,schema,sitemap,llms}.ts` → `lib/seo/`
- `lib/brand-icon.tsx` → `components/ui/brand-icon.tsx`
Engine files (`detect`, `intent`, `livePanels`, …) move in `refactor/engines-pure-lib`.

## Evidence
- `npm run verify`: exit 0 (182/182 unit tests, build OK, 0 lint errors).
- Playwright platform + chromium: 119 passed, 11 skipped, 0 failed.
- Pixel diff vs. before the move (prod build): tool pages 0.00%; home 0.32–0.56% (orb/typewriter animation frames).

## Checklist
- [x] One concern only (moves + import paths)
- [x] `npm run verify` green
