import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

/** `npm run verify` lints the repo; generated test output must not make it fail. */
describe("ESLint ignores generated output", () => {
  const eslint = new ESLint();
  it("skips Playwright reports/traces, test results and Lighthouse output", async () => {
    for (const p of [
      "playwright-report/trace/sw.bundle.js", // minified trace viewer: 238 errors broke verify after a failed e2e run
      "test-results/some-test/trace.js",
      ".lighthouseci/report.js",
    ])
      expect(await eslint.isPathIgnored(p), p).toBe(true);
  });
  it("still lints our code", async () => {
    expect(await eslint.isPathIgnored("src/app/layout.tsx")).toBe(false);
    expect(await eslint.isPathIgnored("tests/e2e/helpers.ts")).toBe(false);
  });
});
