# 0003 — Tool logic lives in pure engines

- Status: accepted
- Date: 2026-11-06

## Context
`src/lib/detect.ts` (1,070 lines) mixed paste detection, converters, generators and HTML rendering, and read `Date.now()`, `Math.random()` and `Blob` directly. Logic was duplicated in `livePanels.ts` and `workers/json-ops.ts` (JWT decoding, Base64URL, UUIDs, JSON error scanning, HTML escaping), so fixes landed in one copy only and time-dependent results (cron next runs, JWT expiry) couldn't be tested deterministically.

## Decision
- All tool logic lives in `src/lib/engines/*.ts`: one small module per concern (text, json, jwt, detect, generators, hash, csv, sql, time, color, cron, random, format, intent, qr-payload).
- Engines are pure: input → output. Time is a `now` parameter, randomness an `rng` parameter (default: Web Crypto). No React, DOM, `Blob`, `localStorage`, or imports from components/registry/server.
- UI-facing composition (HTML snippets for the chat thread) lives outside engines: `src/lib/actions.ts` and `src/lib/livePanels.ts`.
- Workers and tool components import engines; they never re-implement logic.
- `tests/unit/engines.test.ts` guards purity (no clock/random/DOM in engine sources) and covers the injected-time/rng contracts.

## Consequences
- One implementation per behaviour; deterministic tests with a frozen `now`.
- Callers must pass `Date.now()` explicitly, which makes time-dependence visible.
