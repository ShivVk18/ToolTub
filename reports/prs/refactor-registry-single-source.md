# refactor: one tool registry drives the home grid, panels and actions (ADR 0002)

## What and why
Three lists described the same tools (registry by slug, home grid and live panels by display name). 24 grid slugs weren't in the registry, the grid wrongly tagged Protect PDF as "Private server", and actions opened panels by display name.

## How
- `registry/catalog.ts`: tool facts without SEO (client-safe). `registry/tools.ts` = catalog + SEO (server only). `registry/home.ts`: home card per slug (generated from the old grid list, same order). New `ToolCore`, `HomeCard`, `panel` field.
- `lib/designTools.ts` `TOOLS` is derived from the catalog; adds `live`, `routed`, `toolBySlug()`.
- `PANELS`, action/generator `open:` targets, deep-link hashes and panel lookups use registry slugs. Old name hashes (`#timestamp`) still resolve.
- 24 grid slugs mapped to registry slugs; Bulk Rename added to the registry (planned).
- Removed the palette's unused, cast-to-`ToolItem` object.

## Evidence
- `registry.test.ts` new block: 76 home cards all in registry and in grid order; `PANELS` ⇔ `PANEL_SLUGS`; all action targets are slugs; routed tools have components; catalog has no SEO. Tool count 78 → 79 (Bulk Rename). One assertion updated: `ACT.fmt` target is now `json-formatter`.
- Client bundles: an SEO explainer sentence appears in 0 `.next/static` chunks (14 server files).
- Grid on the production build: 76 cards, identical names and order; 18 Live; "Private server" only on PDF to Word / Word to PDF (Protect PDF fixed). `#base64`, `#timestamp`, `#timestamp-converter`, `#csv-json`, `#json-to-csv` open the right panels.
- `npm run verify`: exit 0 — 202/202 unit tests, 0 lint errors. Playwright platform + chromium: 119 passed, 11 skipped, 0 failed.

## Checklist
- [x] One concern only (single source of tool data)
- [x] `npm run verify` green
- [x] ADR 0002 added
