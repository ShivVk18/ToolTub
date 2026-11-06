import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

test("security headers: CSP on every page, no cross-origin isolation (no media routes yet)", async ({ request }) => {
  for (const p of ["/", "/json-formatter", "/background-remover"]) {
    const h = (await request.get(p)).headers();
    expect(h["content-security-policy"], p).toContain("default-src 'self'");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["cross-origin-embedder-policy"], p).toBeUndefined();
  }
  expect((await request.get("/")).headers()["x-powered-by"]).toBeUndefined();
});

test("vendored engines and models are served with long-lived caching from our own origin", async ({ request }) => {
  const r = await request.get("/vendor/libheif/libheif-bundle.mjs");
  expect(r.status()).toBe(200);
  expect(r.headers()["cache-control"]).toContain("immutable");
  expect(r.headers()["content-type"]).toMatch(/javascript/);
  const w = await request.head("/vendor/ort/ort-wasm-simd-threaded.asyncify.wasm");
  expect(w.headers()["content-type"]).toBe("application/wasm");
});

test("no secrets or server config in client bundles; .env is not committed", () => {
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  const files = walk(".next/static").filter((f) => f.endsWith(".js"));
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    for (const needle of ["RATE_LIMIT_SALT", "VALKEY_URL", "redis://", "UMAMI_SECRET", "JOBS_DIR"])
      expect(s.includes(needle), `${needle} in ${f}`).toBe(false);
  }
  const tracked = execSync("git ls-files", { encoding: "utf8" }).split("\n");
  expect(tracked.filter((f) => /(^|\/)\.env($|\.local|\.production)/.test(f))).toEqual([]);
});
