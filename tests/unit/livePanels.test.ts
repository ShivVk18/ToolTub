import { describe, it, expect } from "vitest";
import { PANELS } from "@/lib/livePanels";

describe("PANELS - 33 Live Tools", () => {
  it("has all 33 live panel tools defined", () => {
    const expected = [
      "json-formatter",
      "jwt-decoder",
      "base64",
      "url-encoder",
      "timestamp-converter",
      "word-counter",
      "case-converter",
      "hash-generator",
      "uuid-generator",
      "password-generator",
      "lorem-ipsum",
      "color-converter",
      "cron-generator",
      "sql-formatter",
      "json-to-csv",
      "json-to-typescript",
      "clean-text",
      "regex-tester",
      "unit-converter",
      "time-zone-converter",
      "json-to-yaml",
      "env-redactor",
      "meta-tag-generator",
      "schema-generator",
      "chmod-calculator",
      "html-entities",
      "number-base-converter",
      "css-generator",
      "social-post-formatter",
      "title-builder",
      "bio-formatter",
      "markdown-editor",
      "barcode-generator",
    ];
    for (const name of expected) {
      expect(PANELS[name], `Expected tool ${name} to be defined`).toBeDefined();
    }
  });

  it("runs JSON Formatter with minify and indent options", async () => {
    const p = PANELS["json-formatter"];
    const formatted = await p.run('{"a":1}', "4");
    expect(formatted.status).toContain("Valid JSON");
    expect(formatted.copy).toBe('{\n    "a": 1\n}');

    const minified = await p.run('{\n  "a": 1\n}', "m");
    expect(minified.copy).toBe('{"a":1}');

    const broken = await p.run('{"a":}', "2");
    expect(broken.bad).toBe(1);
    expect(broken.status).toContain("Invalid JSON");
  });

  it("runs Base64 encode and decode", async () => {
    const p = PANELS["base64"];
    const encoded = await p.run("hello world", "e");
    expect(encoded.copy).toBe("aGVsbG8gd29ybGQ=");

    const decoded = await p.run("aGVsbG8gd29ybGQ=", "d");
    expect(decoded.copy).toBe("hello world");
  });

  it("runs URL Encoder decode, encode, and parse", async () => {
    const p = PANELS["url-encoder"];
    const url = "https://example.com/api?user=asha&mode=dev#debug";
    const parsed = await p.run(url, "p");
    expect(parsed.copy).toContain("https:");
    expect(parsed.copy).toContain("?user");
    expect(parsed.status).toContain("2 query params");
  });

  it("runs UUID Generator with custom count", async () => {
    const p = PANELS["uuid-generator"];
    const res = await p.run("", "5");
    expect(res.copy?.split("\n").length).toBe(5);
    expect(res.status).toBe("5 × UUID v4");
  });

  it("runs Password Generator with custom length", async () => {
    const p = PANELS["password-generator"];
    const res = await p.run("", "32");
    expect(res.copy?.length).toBe(32);
    expect(res.status).toContain("32 characters");
  });

  it("runs Word Counter social limits analysis", async () => {
    const p = PANELS["word-counter"];
    const res = await p.run("Test message for social networks");
    expect(res.status).toContain("5 words");
    expect(res.html).toContain("social limits");
  });

  it("runs Regex Tester with group matches and marks", async () => {
    const p = PANELS["regex-tester"];
    const res = await p.run("Call 123-456 and 789-012", undefined, "(\\d{3})-(\\d{3})", "g");
    expect(res.html).toContain('<mark class="rm">123-456</mark>');
    expect(res.status).toBe("2 matches");
  });
});

describe("new panels: every sample runs, every option gives a different result", () => {
  const NEW = [
    "unit-converter",
    "time-zone-converter",
    "json-to-yaml",
    "env-redactor",
    "meta-tag-generator",
    "schema-generator",
    "chmod-calculator",
    "html-entities",
    "number-base-converter",
    "css-generator",
    "social-post-formatter",
    "title-builder",
    "bio-formatter",
    "markdown-editor",
    "barcode-generator",
  ];
  for (const slug of NEW) {
    it(slug, async () => {
      const p = PANELS[slug];
      const outs: string[] = [];
      for (const o of p.opts ?? [[null, null] as unknown as [string, string]]) {
        const r = await p.run(p.sample!, o[1]);
        expect(r.html, `${slug}/${o[1]}`).toBeTruthy();
        expect(r.bad, `${slug}/${o[1]}: ${r.status}`).toBeFalsy();
        outs.push(r.html!);
      }
      expect(new Set(outs).size).toBe(outs.length);
      expect(await p.run("", p.opts?.[0][1])).toEqual({});
    });
  }
  it("YAML: quotes values YAML would misread, and round-trips", async () => {
    const y = (await PANELS["json-to-yaml"].run('{"on":"yes","zip":"007","n":null,"v":"1.0"}', "y")).copy!;
    expect(y).toMatch(/"on": "yes"/);
    expect(y).toMatch(/zip: "007"/);
    expect(y).toMatch(/v: "1.0"/);
    const back = (await PANELS["json-to-yaml"].run(y, "j")).copy!;
    expect(JSON.parse(back)).toEqual({ on: "yes", zip: "007", n: null, v: "1.0" });
    expect((await PANELS["json-to-yaml"].run("a: [1, 2", "j")).bad).toBeTruthy();
    expect((await PANELS["json-to-yaml"].run("a: 1\na: 2", "j")).bad).toBeTruthy(); // duplicate keys
    const tricky = { o: "0o17", h: "0x1F", e: "1e3", t: "~", d: "2026-11-07", m: "a\nb", u: "नमस्ते 😀", empty: "" };
    const ty = (await PANELS["json-to-yaml"].run(JSON.stringify(tricky), "y")).copy!;
    expect(JSON.parse((await PANELS["json-to-yaml"].run(ty, "j")).copy!)).toEqual(tricky);
    const Y = await import("yaml");
    expect(Y.parse(ty, { version: "1.1" })).toEqual(tricky);
    expect((await PANELS["json-to-yaml"].run("{bad json}", "y")).bad).toBeTruthy();
  });
  it("Markdown preview never carries script", async () => {
    const r = await PANELS["markdown-editor"].run("<img src=x onerror=alert(1)>\n[a](javascript:alert(1))", "p");
    expect(r.html).not.toMatch(/<img src=x|javascript:/);
  });
});
