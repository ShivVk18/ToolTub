# refactor: one theme key, recents in the store, no app code on window.__kk

## What and why
Standards §2.7: theme was stored under two keys (`theme`, `kk.theme` as JSON) with the same toggle logic copied in Nav, ThemeToggle and HomeStage; recent file names were written to a raw `kk.recents` key from HomeStage and read in Hero; components talked to each other through the `window.__kk` global.

## How
- `lib/theme.ts` (was `components/layout/ThemeToggle.tsx`, whose component was unused): `readTheme`, `setTheme`, `themeScript`. One key `theme`; legacy `kk.theme` read once as fallback and removed on the next write. Nav and HomeStage use it.
- `useKlip` store: `recentFiles` + `addRecentFile` (deduped, max 5, persisted). Legacy `kk.recents` folded in once at store creation. Hero reads from the store and still renders recents only after mount (no hydration mismatch).
- `useUIStore.homeActions` (`voice`, `clearInput`), registered once by HomeStage with stable wrappers. GlobalModals and the palette use it instead of `window.__kk`.
- `window.__kk` stays only as a test hook with the reference prototype's API (used by `scripts/visual-compare.ts`).

## Evidence
- New `tests/unit/stores.test.ts` (jsdom, 6 tests): single key + legacy removal, legacy fallback, `themeScript` before paint, blocked storage, recents dedupe/max 5/persisted, legacy `kk.recents` migration. The migration test failed first (callback ran before `useKlip` existed) and drove the fix.
- Prod build: drop sample PDF → reload → "Recent: Q3-report.pdf" from the store. Voice demo through the store: without a file → toast "Drop a file or paste first, then speak."; with a file → demo streams into the thread. 0 page errors.
- `npm run verify`: exit 0 — 208/208 unit tests. Playwright platform + chromium: 119 passed, 11 skipped, 0 failed (incl. "works when localStorage is blocked").

## Found, not fixed here
- The Pro voice sheet never becomes visible: reference CSS `#sheet{opacity:0;pointer-events:none}` needs an `open` class, but the component toggles Tailwind `opacity-100`. Tracked for Phase 2 as `fix/pro-sheet-invisible`.

## Checklist
- [x] One concern only (state ownership)
- [x] Failing test first for the migration bug
- [x] `npm run verify` green
