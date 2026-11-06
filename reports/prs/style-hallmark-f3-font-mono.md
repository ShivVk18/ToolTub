# style(hallmark F3): code rendered in Inter instead of monospace

## What and why
`@theme inline` declared `--font-mono: var(--font-mono), ui-monospace, …`. Unlike serif/sans, no `next/font` variable defines `--font-mono`, so the value referred to itself, the declaration was invalid, and every `font-mono` element (JSON/JWT output, code) fell back to Inter — nested indentation read poorly.

## How
`--font-mono` is the reference's system monospace stack.

## Evidence
- `tool-design.spec.ts` F3: failed (`inter, "inter Fallback", …`), passes. Tools + tool-design: 75 passed, 11 skipped.
- Home states using mono (pasted JSON, live panel) unchanged in visual compare (see ship log).
