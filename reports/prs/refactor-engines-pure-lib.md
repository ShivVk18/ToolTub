# refactor: move tool logic into pure engines (ADR 0003)

## What and why
`lib/detect.ts` (1,070 lines) mixed detection, converters, generators and HTML, read `Date.now()`/`Math.random()`/`Blob` directly, and duplicated logic in `livePanels.ts` and `workers/json-ops.ts`. Standards §2.4 and ADR 0003 require pure, typed engines.

## How
- New `src/lib/engines/`: `text`, `json` (was `workers/json-ops` + JSON error/highlight/TS-types), `jwt`, `detect`, `generators`, `hash`, `csv`, `sql`, `time`, `color`, `cron`, `random`, `format`, `intent`, `qr-payload`. Code moved by line range from `detect.ts`, not rewritten.
- Time and randomness injected: `rel(ms, now)`, `tsConv(t, now)`, `cronNext(e, now, n)`, `genPassword(len, rng)`, `uuidV4(rng)`.
- Duplicates removed: JWT decode (`decodeJWT` → `decodeJwt`), Base64URL decode, two UUID generators → `uuidV4`, two JSON error scanners → `jsonErrorOffset`, `esc` (intent) → `engines/text`, `fmtSize` (livePanels) → `engines/format`. (`fileKind.fmtSize` formats differently on purpose and stays.)
- HTML composition moved to `src/lib/actions.ts` (`ACT`, `runGen`, `table`, `codeBlock`, tiles); `livePanels.ts` uses engines.
- `FileKind` type lives in `engines/intent` so engines never import DOM code.

## Evidence
- New `tests/unit/engines.test.ts` (14 tests): purity guard (no clock/random/DOM/app imports in engines), Safari/Firefox JSON error path with exact line/col, deterministic `uuidV4`, 10 000 unique v4 UUIDs, injected `now` for `rel`/`tsConv`/`cronNext` (exact IST string and next runs 10:15…11:15).
- Existing tests updated only for the new signatures (`tsConv`/`cronNext` now get a fixed `now`; unused `decodeJWT` import dropped).
- `npm run verify`: exit 0 — 196/196 unit tests, 0 lint errors (20 warnings), build OK.
- Playwright platform + chromium: 119 passed, 11 skipped, 0 failed.

## Checklist
- [x] One concern only (engine extraction)
- [x] `npm run verify` green
- [x] ADR 0003 added
