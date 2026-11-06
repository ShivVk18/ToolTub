# KlipKit

Free online tools that run on your device. Next.js 16 (App Router, SSG), self-hosted, no third-party APIs.

- Strategy, tool list, architecture, SEO/AEO/GEO plan: [docs/STRATEGY.md](docs/STRATEGY.md)
- Single source of truth: [src/registry/](src/registry/) (tools, SEO content, chains, dependencies + licences)

## Run locally

```bash
npm install          # also copies browser engines into public/vendor
npm run dev          # http://localhost:3000
```

Server tools (PDF to Word) need Valkey/Redis and the worker:

```bash
redis-server --port 6379 &                                   # or: docker run -p 6379:6379 valkey/valkey:8-alpine
cd worker && npm install && PATH="/Applications/LibreOffice.app/Contents/MacOS:$PATH" JOBS_DIR=/tmp/klip-jobs node src/index.mjs
JOBS_DIR=/tmp/klip-jobs npm run dev
```

The Background Remover needs the self-hosted model: see [public/models/README.md](public/models/README.md).

## Production

```bash
cp .env.example .env   # fill in secrets
docker compose up -d --build
```

## Add a tool

1. Add a row in `src/registry/tools.ts` (status `planned`).
2. Build the UI in `src/tools/<Name>.tsx` using `ToolWorkspace`; heavy work goes in a worker (`src/workers`).
3. Register it in `src/tools/index.tsx` and set status `beta` (routed, noindex).
4. Write its `ToolSEO` in `src/registry/seo/` and set status `live` (indexed, in sitemap and llms.txt).

## Tests

- `npm test`: unit tests (Vitest)
- `npm run test:e2e`: build + Playwright (Chromium, Firefox, WebKit, Pixel 7, iPhone 14, axe)
- `npm run test:perf`: Lighthouse CI
- `npm run test:all`: everything (also runs in `.github/workflows/test.yml`)

Results, bug list and details: [docs/QA-REPORT.md](docs/QA-REPORT.md).
# ToolTub
