import { defineConfig, devices } from "@playwright/test";

/**
 * E2E against the production (standalone) build. Run `npm run build` first (test:e2e does it).
 * Server-tool tests start their own Redis/Valkey + worker and skip themselves if those binaries
 * are missing (see tests/e2e/server-tools.spec.ts).
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
export const JOBS_DIR = process.env.E2E_JOBS_DIR ?? "/tmp/klipkit-e2e-jobs";
export const REDIS_PORT = Number(process.env.E2E_REDIS_PORT ?? 6391);

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure", acceptDownloads: true },
  webServer: {
    command: "node scripts/start-standalone.mjs",
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false, // never test a stale build left running on the port
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      VALKEY_URL: `redis://127.0.0.1:${REDIS_PORT}`,
      JOBS_DIR,
      RATE_LIMIT_SALT: "e2e",
      RATE_LIMIT_MAX: "20",
    },
  },
  projects: [
    // Platform-wide, single-browser checks (SEO, links, API security, server tools, offline).
    {
      name: "platform",
      testMatch: /(seo|links|api|server-tools|offline|lighthouse-urls)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testIgnore: /(seo|links|api|server-tools|offline)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testIgnore: /(seo|links|api|server-tools|offline)\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testIgnore: /(seo|links|api|server-tools|offline)\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
    { name: "mobile-pixel7", testMatch: /\/(tools|platform)\.spec\.ts$/, use: { ...devices["Pixel 7"] } },
    { name: "mobile-iphone14", testMatch: /\/(tools|platform)\.spec\.ts$/, use: { ...devices["iPhone 14"] } },
  ],
});
