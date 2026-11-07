import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { jsonErr } from "@/lib/engines/json";
import { uuidV4, type Rng } from "@/lib/engines/random";
import { genPassword } from "@/lib/engines/generators";
import { rel, tsConv } from "@/lib/engines/time";
import { cronNext } from "@/lib/engines/cron";
import { utf8b64, utf8b64Decode } from "@/lib/engines/text";
import { acceptsFile, byteLength } from "@/lib/engines/format";

const ENGINES = join(__dirname, "../../src/lib/engines");

describe("engines are pure (ADR 0003)", () => {
  it("no engine reads the clock, Math.random or the DOM directly", () => {
    for (const f of readdirSync(ENGINES).filter((x) => x.endsWith(".ts"))) {
      const src = readFileSync(join(ENGINES, f), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(src, f).not.toMatch(/Date\.now\(|Math\.random\(|\bdocument\.|\bwindow\.|localStorage|new Blob\(/);
    }
  });
  it("no engine imports React or app layers", () => {
    for (const f of readdirSync(ENGINES).filter((x) => x.endsWith(".ts"))) {
      const src = readFileSync(join(ENGINES, f), "utf8");
      expect(src, f).not.toMatch(/from ["'](react|@\/components|@\/registry|@\/server|@\/app)/);
    }
  });
});

describe("JSON errors without an engine position (Safari/Firefox path)", () => {
  // Non-V8 engines don't put "position N" in the message, so jsonErr falls back to its own scanner.
  const noPos = { message: "JSON Parse error: Expected '}'" };
  it("trailing comma → line 1, column 8", () => {
    expect(jsonErr('{"a":1,}', noPos)).toEqual({
      msg: "Trailing comma — remove the comma before }",
      line: 1,
      col: 8,
    });
  });
  it("single quotes → line 1, column 2", () => {
    expect(jsonErr("{'a':1}", noPos)).toEqual({ msg: "Use double quotes, not single quotes", line: 1, col: 2 });
  });
  it("unquoted key", () => {
    expect(jsonErr("{a:1}", noPos).msg).toBe("Keys need double quotes");
  });
  it("unclosed input", () => {
    expect(jsonErr('{"a":[1,2', noPos).msg).toBe("Unexpected end — something isn’t closed");
  });
});

describe("injected randomness", () => {
  const counter = (): Rng => {
    let i = 0;
    return (n) => Array.from({ length: n }, () => i++);
  };
  it("uuidV4 is deterministic for a given rng and sets version/variant bits", () => {
    expect(uuidV4(counter())).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });
  it("10 000 secure UUIDs are all v4 and unique", () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const all = Array.from({ length: 10_000 }, () => uuidV4());
    expect(all.every((u) => re.test(u))).toBe(true);
    expect(new Set(all).size).toBe(10_000);
  });
  it("genPassword uses the injected rng", () => {
    expect(genPassword(4, () => [0, 1, 2, 3])).toBe("abcd");
  });
});

describe("injected time", () => {
  const NOW = Date.parse("2026-11-04T10:07:00+05:30");
  it("rel() is relative to the given now", () => {
    expect(rel(NOW + 3 * 86_400_000, NOW)).toBe("in 3 days");
    expect(rel(NOW - 2 * 3_600_000, NOW)).toBe("2 hours ago");
  });
  it("tsConv gives the exact IST, ISO and both units for 1730592000", () => {
    const r = Object.fromEntries(tsConv("1730592000", NOW)!);
    expect(r["ISO 8601"]).toBe("2024-11-03T00:00:00.000Z");
    expect(r["India (IST)"]).toBe("Sunday, 3 November 2024 at 5:30:00 am IST");
    expect(Object.fromEntries(tsConv("1730592000000", NOW)!)["ISO 8601"]).toBe("2024-11-03T00:00:00.000Z");
  });
  it("cronNext is computed from the given now (local time)", () => {
    const local = new Date(2026, 10, 4, 10, 7).getTime();
    const runs = cronNext("*/15 9-18 * * 1-5", local, 5).map(
      (d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`,
    );
    expect(runs).toEqual(["10:15", "10:30", "10:45", "11:00", "11:15"]);
  });
});

describe("text and format helpers", () => {
  it("Base64 round-trips emoji", () => {
    expect(utf8b64("KlipKit ✨")).toBe("S2xpcEtpdCDinKg=");
    expect(utf8b64Decode("S2xpcEtpdCDinKg=")).toBe("KlipKit ✨");
  });
  it("byteLength counts UTF-8 bytes", () => {
    expect(byteLength("✨")).toBe(3);
  });
});

describe("acceptsFile (Hallmark F7: validate on selection)", () => {
  const f = (name: string, type: string) => ({ name, type });
  it("matches MIME types, wildcards and extensions, case-insensitively", () => {
    expect(acceptsFile("application/pdf,.pdf", f("a.pdf", "application/pdf"))).toBe(true);
    expect(acceptsFile("application/pdf,.pdf", f("A.PDF", ""))).toBe(true); // drag-drop can lose the type
    expect(acceptsFile("application/pdf,.pdf", f("photo.jpg", "image/jpeg"))).toBe(false);
    expect(acceptsFile("image/*", f("x.webp", "image/webp"))).toBe(true);
    expect(acceptsFile("image/png,image/jpeg", f("notes.txt", "text/plain"))).toBe(false);
    expect(acceptsFile(".heic,.heif", f("IMG_1.HEIC", ""))).toBe(true);
  });
  it("accepts anything when accept is empty", () => {
    expect(acceptsFile("", f("x.bin", ""))).toBe(true);
  });
});
