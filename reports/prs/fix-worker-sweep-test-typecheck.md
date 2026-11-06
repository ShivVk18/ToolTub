# fix(test): drop an unused @ts-expect-error in the sweeper test

#26 merged with `npm run verify` failing (TS2578: the worker module type-checks fine via allowJs, so the directive was unused). Removed it; verify green.
