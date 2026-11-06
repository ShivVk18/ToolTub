import { test, expect } from "@playwright/test";

/** Crawls every internal link reachable from the homepage (raw HTML, two levels deep). No 404s allowed. */
test("no broken internal links", async ({ request }) => {
  test.setTimeout(180_000);
  const seen = new Map<string, number>();
  const queue = ["/"];
  const broken: string[] = [];
  while (queue.length) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    const res = await request.get(path, { maxRedirects: 0 });
    seen.set(path, res.status());
    if (res.status() >= 400) {
      broken.push(`${res.status()} ${path}`);
      continue;
    }
    if (!res.headers()["content-type"]?.includes("text/html")) continue;
    const html = await res.text();
    for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
      const href = m[1];
      if (href.startsWith("/_next") || seen.has(href)) continue;
      queue.push(href);
    }
  }
  expect(seen.size).toBeGreaterThan(20);
  expect(broken).toEqual([]);
});
