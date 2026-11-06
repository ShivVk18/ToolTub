import { describe, it, expect } from "vitest";
import { PANELS } from "@/lib/livePanels";

describe("PANELS - 18 Live Tools", () => {
  it("has all 18 developer tools defined", () => {
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
