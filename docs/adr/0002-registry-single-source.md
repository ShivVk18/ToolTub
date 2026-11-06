# 0002 — One tool registry drives everything

- Status: accepted
- Date: 2026-11-06

## Context
Three lists described the same tools: `registry/tools.ts` (78, by slug) for routes/SEO/sitemaps, `lib/designTools.ts` (76, by display name) for the home grid and workspace, and `lib/livePanels.ts` `PANELS` (18, by display name). 24 grid slugs didn't exist in the registry, the grid's "Private server" tag disagreed with the registry for Protect PDF, and actions opened panels by display name, so a rename broke links silently.

## Decision
- `src/registry/catalog.ts` holds every tool's facts (`ToolCore`): slug, name, category, status, processing, I/O, synonyms, `panel`, and the home card (`home.ts`: short name, icon, blurb, keyed by slug; insertion order = grid order). It has no SEO copy, so client components may import it.
- `src/registry/tools.ts` = catalog + SEO content, for server-rendered pages, sitemaps, `llms.txt` and the search index.
- The home grid (`lib/designTools.ts` `TOOLS`) is **derived** from the catalog. `PANELS` and every action/generator target are keyed by registry slug.
- `tests/unit/registry.test.ts` enforces: 76 home cards all in the registry, `PANELS` ⇔ `PANEL_SLUGS`, action targets are slugs, routed tools have components, the catalog has no SEO copy.

## Consequences
- Adding a tool = one catalog row (+ optional home card, panel, SEO). No second list to forget.
- Deep links use registry slugs (`#timestamp-converter`); old name-based hashes (`#timestamp`) still resolve.
