import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatJson } from "@/workers/json-ops";

const fx = (n: string) => readFileSync(new URL(`../fixtures/generated/${n}`, import.meta.url), "utf8");

describe("formatJson", () => {
  it("formats valid JSON with 2 spaces", () => {
    const r = formatJson({ text: '{"a":1,"b":[1,2]}', indent: 2 });
    expect(r).toEqual({ ok: true, output: '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}' });
  });
  it("minifies", () => {
    const r = formatJson({ text: '{ "a" : 1 ,\n "b": true }', indent: 0 });
    expect(r.ok && r.output).toBe('{"a":1,"b":true}');
  });
  it("indents with tabs", () => {
    const r = formatJson({ text: '{"a":1}', indent: "\t" });
    expect(r.ok && r.output).toBe('{\n\t"a": 1\n}');
  });
  it("sorts keys deeply", () => {
    const r = formatJson({ text: '{"b":{"d":1,"c":2},"a":0}', indent: 0, sortKeys: true });
    expect(r.ok && r.output).toBe('{"a":0,"b":{"c":2,"d":1}}');
  });
  it("strips comments but not // inside strings", () => {
    const r = formatJson({ text: '{\n // note\n "url": "https://x.com/a", /* c */ "n": 1\n}', indent: 0, stripComments: true });
    expect(r.ok && r.output).toBe('{"url":"https://x.com/a","n":1}');
  });
  it("keeps Unicode, emoji and Hindi intact", () => {
    const r = formatJson({ text: '{"t":"नमस्ते 👋 مرحبا"}', indent: 0 });
    expect(r.ok && r.output).toBe('{"t":"नमस्ते 👋 مرحبا"}');
  });
  it("reports the trailing-comma error on line 7 with a fix hint", () => {
    const r = formatJson({ text: fx("invalid-line7.json"), indent: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.line).toBe(7);
      expect(r.hint).toMatch(/trailing comma/i);
    }
  });
  it("explains single quotes", () => {
    const r = formatJson({ text: "{'a': 1}", indent: 2 });
    expect(!r.ok && r.hint).toMatch(/double quotes/);
  });
  it("explains unquoted keys", () => {
    const r = formatJson({ text: "{\n  name: 1\n}", indent: 2 });
    expect(!r.ok && r.hint).toMatch(/Keys must be in double quotes/);
  });
  it("reports empty input as an error, not a crash", () => {
    expect(formatJson({ text: "", indent: 2 }).ok).toBe(false);
  });
  it("formats 5 MB of JSON in under 2 seconds", () => {
    const text = fx("huge-5mb.json");
    const t0 = performance.now();
    const r = formatJson({ text, indent: 2 });
    expect(r.ok).toBe(true);
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});
