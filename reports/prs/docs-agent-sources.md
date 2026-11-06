# docs: add agent source docs (start here, engineering standards, design spec)

## What and why
The master prompt requires five source docs in `docs/agent/`. Three were missing (`00_START_HERE.md`, `03_ENGINEERING_STANDARDS.md`, `KlipKit_UI_Redesign_Prompt.md`) and two lived at the repo root. The owner asked Claude to write the missing ones.

## How
- Moved `01_UI_FIX_PROMPT.md` and `02_TOOLS_E2E_TEST_PROMPT.md` into `docs/agent/` (git mv, content unchanged).
- Wrote `00_START_HERE.md` (work order, ground rules, precedence between sources).
- Wrote `03_ENGINEERING_STANDARDS.md` (branch-per-fix workflow incl. local no-remote flow, target architecture, layering, registry/engines/motion rules, quality gates, PR template, review checklist, ADR list).
- Wrote `KlipKit_UI_Redesign_Prompt.md` from `design/reference/KlipKit_UI.html` and `docs/STRATEGY.md` (tokens, type, sections, orb, satellites, states, honesty rules, identity guardrails).

## Evidence
Docs only. Token values and copy were extracted from the reference HTML.

## Checklist
- [x] One concern only
- [x] Failing test: N/A (docs)
- [x] No dependency or infra change
