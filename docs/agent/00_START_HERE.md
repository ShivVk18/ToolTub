# Start here — KlipKit agent work order and ground rules

Read this first, then the other files in `docs/agent/` in number order.

## The files

| File | What it is | It wins on |
|---|---|---|
| `00_START_HERE.md` | Work order and ground rules (this file) | Order of work, safety |
| `01_UI_FIX_PROMPT.md` | Known UI bugs, likely root causes, visual-compare process, acceptance checklist | What "UI fixed" means |
| `02_TOOLS_E2E_TEST_PROMPT.md` | Tool inventory, test setup, exact expected values, report format | What "tool works" means |
| `03_ENGINEERING_STANDARDS.md` | Git workflow, architecture, reusability, quality gates, review checklist | How code is organised and shipped |
| `KlipKit_UI_Redesign_Prompt.md` | Full design spec: tokens, type, layout, motion, sections, states | How things look and move |
| `design/reference/KlipKit_UI.html` | The reference prototype (single file) | Pixels and behaviour, unless a spec above says otherwise |

If two sources disagree: the expected values in `02` beat the reference HTML; `03` beats everything on code structure; the reference HTML beats the redesign spec on pixels. Write the disagreement down in the report.

## Work order

1. **Safety** (below).
2. **Foundation**: tooling, folder structure, single registry, pure engines, single motion loop (`03` §6).
3. **UI restore** (`01`), section by section, against the reference.
4. **Design polish** (de-slop) inside the identity guardrails of the redesign spec (§9).
5. **Tools end to end** (`02`), with a failing test before every fix.
6. **Wrap-up**: README, ADRs, `CLAUDE.md`, changelog, final draft PR.

Do not start a phase until the previous phase's checklist passes.

## Ground rules

- **Safety first.** Run `git status`. Commit any uncommitted work to `backup/before-<agent>-fix` before touching anything. Work happens on `integration/ui-restore`.
- **One branch + one PR per fix**, branched from `integration/ui-restore` and squash-merged back (`03` §1). If there is no Git remote, do the same locally and save the PR description to `reports/prs/<branch>.md`.
- Never commit to `main`. Never `git reset --hard`. Never force-push. Never delete files or folders without asking.
- **Reproduce → root cause → failing test → fix → re-test.** No guess-fixes. Never weaken, skip or delete a test to make it pass.
- **Verify output, not page load.** A tool passes only when its result was checked against an expected value.
- **No third parties.** No external APIs, AI servers, CDNs, fonts or analytics scripts. Fonts are self-hosted via `next/font/local`.
- **Plans are Free and Pro only.** No API plan.
- **Ask before:** adding a dependency over 100 KB, changing the server or infrastructure (Docker, Caddy, worker, queue), or changing behaviour the reference doesn't show.
- **Honest reports.** If something is not done, not tested or faked, say so in the report.

## Definition of done

- Every acceptance checklist in `01` and `02` passes, or each open item is listed with a reason.
- `npm run verify` and `npm run test:all` are green.
- The code matches the architecture in `03` §2.
- Every change went through its own branch and PR.
- The reports exist and are honest.
