# chore: remove unused KlipKitApp and design CommandPalette

## What and why
`src/components/design/KlipKitApp.tsx` (446 lines) is imported by nothing; `src/components/design/CommandPalette.tsx` (247 lines) is imported only by it. The live home stage is `HomeStage.tsx` and the live palette is `components/search/CommandPalette.tsx`. Dead copies hide bugs (fixes land in the wrong file). Deletion approved by the owner.

## Evidence
- `grep` shows no importers outside the two files.
- `npm run verify`: exit 0; lint warnings 34 → 21; 182/182 unit tests; build OK.

## Checklist
- [x] One concern only
- [x] `npm run verify` green
