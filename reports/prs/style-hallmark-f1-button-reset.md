# style(hallmark F1): tool-page primary buttons were transparent

## What and why
The reference's element reset `button { background: none; border: 0; … }` was unlayered, so it beat Tailwind utilities: every `<Button variant="primary">` (`bg-ink`) on tool pages — Compress images, Download, Run chain — rendered as a faint transparent pill indistinguishable from secondary buttons.

## How
Moved the reset into `@layer base` (Tailwind's own preflight does the same there); utilities now override it.

## Evidence
- New `tests/e2e/tool-design.spec.ts` F1 (primary background not transparent): failed, passes. `redesign-ui.spec.ts` still 28/28.
- Home visual compare unchanged (1440 light): hero 0.50%, workspace 0.93%, palette 0.28%, sheet 1.48%, Explore 0.83%, pricing 0.78%.
- Before/after (local): `reports/ui/prs/f1-image-compressor.png`.
