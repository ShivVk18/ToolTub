import { describe, it, expect } from "vitest";
import { myers, diffLines, diffWords, unified } from "@/lib/engines/diff";

/** Applying the edit script to `a` must give `b`, and it must be minimal for known cases. */
const apply = <T>(a: T[], b: T[]) =>
  myers(a, b)
    .filter((o) => o.type !== "del")
    .map((o) => (o.type === "ins" ? b[o.b!] : a[o.a!]));

describe("myers", () => {
  it("edit scripts reproduce the target and are minimal", () => {
    const a = "ABCABBA".split("");
    const b = "CBABAC".split("");
    expect(apply(a, b)).toEqual(b);
    expect(myers(a, b).filter((o) => o.type !== "eq")).toHaveLength(5); // the classic example: D = 5
    expect(myers([], [])).toEqual([]);
    expect(apply([], ["x"])).toEqual(["x"]);
    expect(myers(["x"], []).map((o) => o.type)).toEqual(["del"]);
  });
  it("past the edit limit it reports a full replacement (still correct, never huge memory)", () => {
    const a = Array.from({ length: 3000 }, (_, i) => `a${i}`);
    const b = Array.from({ length: 3000 }, (_, i) => `b${i}`);
    const ops = myers(a, b, undefined, 100);
    expect(ops.filter((o) => o.type === "del")).toHaveLength(3000);
    expect(apply(a, b)).toEqual(b);
  });
  it("random inputs always round-trip", () => {
    let s = 3;
    const r = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) % 5;
    for (let t = 0; t < 200; t++) {
      const a = Array.from({ length: r() * 3 }, r);
      const b = Array.from({ length: r() * 3 }, r);
      expect(apply(a, b)).toEqual(b);
    }
  });
});

describe("line and word diff", () => {
  it("pairs changed lines and marks the changed words", () => {
    const d = diffLines("one\ntwo apples\nthree", "one\ntwo pears\nthree\nfour");
    expect(d.lines.map((l) => l.type)).toEqual(["eq", "mod", "eq", "ins"]);
    expect(d).toMatchObject({ added: 1, removed: 0, changed: 1 });
    expect(d.lines[1].words).toEqual([
      { text: "two ", type: "eq" },
      { text: "apples", type: "del" },
      { text: "pears", type: "ins" },
    ]);
  });
  it("ignore whitespace and case; identical inputs; CRLF vs LF", () => {
    expect(
      diffLines("a  b\nC", "a b\nc", { ignoreWhitespace: true, ignoreCase: true }).lines.every((l) => l.type === "eq"),
    ).toBe(true);
    expect(diffLines("same", "same").lines).toEqual([{ type: "eq", a: 1, b: 1, left: "same", right: "same" }]);
    expect(diffLines("a\r\nb", "a\nb").lines.every((l) => l.type === "eq")).toBe(true);
  });
  it("word diff joins back to both sides exactly (Unicode words)", () => {
    const w = diffWords("नमस्ते दुनिया, hello", "नमस्ते world, hello!");
    expect(
      w
        .filter((p) => p.type !== "ins")
        .map((p) => p.text)
        .join(""),
    ).toBe("नमस्ते दुनिया, hello");
    expect(
      w
        .filter((p) => p.type !== "del")
        .map((p) => p.text)
        .join(""),
    ).toBe("नमस्ते world, hello!");
  });
  it("unified output like diff -u", () => {
    const u = unified("a\nb\nc\nd\ne\nf\ng\nh\ni\nj", "a\nb\nc\nD\ne\nf\ng\nh\ni\nj");
    expect(u).toBe("--- original\n+++ changed\n@@ -1,7 +1,7 @@\n a\n b\n c\n-d\n+D\n e\n f\n g\n");
    expect(unified("x", "x")).toBe("");
  });
});
