# 0006 — Plans run for real or say they can't

- Status: accepted
- Date: 2026-11-07

## Context
The home workspace turns a request ("compress to under 2 mb and split pages 1-5") into plan steps. Before #61, pressing Run animated progress bars and then showed an invented result: a file named `<name>-klipkit.<ext>` at 42% of the input size. Download only showed a toast. Steps such as "protect" or "make a gif", which have no implementation, looked identical to working ones.

## Decision
- `planFor(step, file)` in `src/lib/engines/plan.ts` (pure, unit-tested) gives each step one of three outcomes:
  - **run:** KlipKit can do it here. PDF compress/split, image compress/resize/convert and JSON format/minify/types run in the existing workers (`src/lib/plan/run.ts`), and each step's real output feeds the next.
  - **open:** another tool does it. The step offers "Continue in X →" and hands the file over (PDF to Word on the server, Background Remover on the device).
  - **soon:** not built. Tagged "Coming soon", never run, never faked.
- The plan card's tag (On device / Private server / Coming soon) comes from the registry. Run is disabled when every step is "soon".
- Results show real sizes, and Download saves the real file. A target size never ends up above what was asked: KB means 1000 bytes on the home page, and targets are floored to whole KiB for the workers.

## Consequences
- Some plans only half-run; the rest is shown honestly. Building a tool (README, "add a tool in 5 steps") turns its steps from "soon" to "run" with one case in `planFor`.
- `tests/e2e/plan.spec.ts` checks real outputs: a 5-page PDF from "split pages 1-5", an image of at most 200,000 bytes, and 1080×1350 for Instagram.
