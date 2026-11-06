import { describe, it, expect } from "vitest";
import {
  detect,
  jsonErr,
  genParse,
  genPassword,
  hashAll,
  tsType,
  toCSV,
  parseCSV,
  fmtSQL,
  tsConv,
  parseColor,
  cronExplain,
  cronNext,
  wordStats,
  cleanText,
  decodeJWT,
  pasteItem,
  pasteAct,
  ACT,
  runGen,
} from "@/lib/detect";

describe("detect()", () => {
  it("detects JWT token", () => {
    // Basic JWT header: {"alg":"HS256","typ":"JWT"} -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUPv_s_V84";
    const res = detect(jwt);
    expect(res.pt).toBe("jwt");
    expect(res.l).toBe("JWT token");
  });

  it("detects valid JSON", () => {
    const json = '{"name": "KlipKit", "version": 2}';
    const res = detect(json);
    expect(res.pt).toBe("json");
    expect(res.bad).toBeUndefined();
  });

  it("detects invalid JSON with bad: 1", () => {
    const badJson = '{"name": "KlipKit", "trailing": 1,}';
    const res = detect(badJson);
    expect(res.pt).toBe("json");
    expect(res.bad).toBe(1);
  });

  it("pinpoints JSON errors with line and column", () => {
    const broken = "{\n  \"title\": 'hello'\n}";
    let err: Error | null = null;
    try {
      JSON.parse(broken);
    } catch (e) {
      err = e as Error;
    }
    const info = jsonErr(broken, err!);
    expect(info.line).toBe(2);
    expect(info.msg).toContain("double quotes");
  });

  it("detects unix timestamp", () => {
    const ts = "1730592000";
    const res = detect(ts);
    expect(res.pt).toBe("ts");
    expect(res.l).toBe("Unix timestamp");
  });

  it("detects color formats", () => {
    expect(detect("#6D5DF5").pt).toBe("color");
    expect(detect("#FFF").pt).toBe("color");
    expect(detect("rgb(109, 93, 245)").pt).toBe("color");
    expect(detect("hsl(246, 89%, 66%)").pt).toBe("color");
  });

  it("detects cron expressions", () => {
    const res = detect("*/15 9-18 * * 1-5");
    expect(res.pt).toBe("cron");
    expect(res.l).toBe("cron expression");
  });

  it("detects SQL queries", () => {
    const res = detect("SELECT id, name FROM users WHERE active = true");
    expect(res.pt).toBe("sql");
  });

  it("detects URLs", () => {
    const res = detect("https://klipkit.com/tools?q=pdf");
    expect(res.pt).toBe("url");
  });

  it("detects Base64 string", () => {
    // 16+ chars valid base64
    const b64 = Buffer.from("KlipKit runs locally on your browser").toString("base64");
    const res = detect(b64);
    expect(res.pt).toBe("b64");
  });

  it("detects Regex literals", () => {
    const res = detect("/[a-z0-9_-]+@example\\.com/gi");
    expect(res.pt).toBe("regex");
  });

  it("detects CSV table", () => {
    const csv = "name,age,role\nAsha,28,Lead\nRohan,32,Dev\nMeera,24,Designer";
    const res = detect(csv);
    expect(res.pt).toBe("csv");
  });

  it("defaults to text for general prose", () => {
    const res = detect("Just a simple note about our launch plan.");
    expect(res.pt).toBe("text");
  });
});

describe("Generators & Parsers", () => {
  it("parses uuid generator intent with count", () => {
    const parsed = genParse("generate 10 uuids");
    expect(parsed).not.toBeNull();
    expect(parsed!.g.id).toBe("uuid");
    expect(parsed!.n).toBe(10);
  });

  it("parses password generator", () => {
    const parsed = genParse("make a strong password 24 chars");
    expect(parsed).not.toBeNull();
    expect(parsed!.g.id).toBe("pass");
    expect(parsed!.n).toBe(24);
  });

  it("generates secure passwords of requested length", () => {
    const pass = genPassword(32);
    expect(pass.length).toBe(32);
  });

  it("hashes text locally with Web Crypto", async () => {
    const hashes = await hashAll("hello world");
    expect(hashes.length).toBe(4);
    const sha256 = hashes.find(([alg]) => alg === "SHA-256");
    expect(sha256).toBeDefined();
    expect(sha256![1]).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
  });

  it("runs generators via runGen", async () => {
    const p = genParse("generate 3 uuids")!;
    const res = await runGen(p);
    expect(res.msg).toContain("3 fresh UUIDs");
    expect(res.copy?.split("\n").length).toBe(3);
  });
});

describe("Converters & Helpers", () => {
  it("converts json to typescript interfaces", () => {
    const acc: string[] = [];
    tsType({ id: 1, name: "Alice", active: true, tags: ["user"] }, "User", acc);
    const code = acc.join("\n\n");
    expect(code).toContain("export interface User");
    expect(code).toContain("id: number");
    expect(code).toContain("name: string");
    expect(code).toContain("active: boolean");
    expect(code).toContain("tags: string[]");
  });

  it("converts json to csv and back", () => {
    const data = [
      { id: 1, name: "Asha" },
      { id: 2, name: "Rohan" },
    ];
    const csv = toCSV(data);
    expect(csv).toContain("id,name\n1,Asha\n2,Rohan");
    const parsed = parseCSV(csv);
    expect(parsed.length).toBe(2);
    expect(parsed[0].name).toBe("Asha");
    expect(parsed[1].id).toBe(2);
  });

  it("formats SQL with uppercase keywords", () => {
    const formatted = fmtSQL("select id, name from users where active = true limit 10");
    expect(formatted).toContain("SELECT");
    expect(formatted).toContain("FROM");
    expect(formatted).toContain("WHERE");
    expect(formatted).toContain("LIMIT");
  });

  it("converts timestamps to human dates", () => {
    const r = tsConv("1730592000");
    expect(r).not.toBeNull();
    const utc = r!.find(([k]) => k === "UTC");
    expect(utc![1]).toContain("GMT");
  });

  it("parses colors and computes contrast ratios", () => {
    const c = parseColor("#6D5DF5");
    expect(c).not.toBeNull();
    expect(c!.hex).toBe("#6D5DF5");
    expect(c!.rgb).toBe("rgb(109, 93, 245)");
    expect(c!.cw).toBeGreaterThan(1);
    expect(c!.cb).toBeGreaterThan(1);
  });

  it("explains cron schedule and computes next runs", () => {
    const exp = cronExplain("*/15 9-18 * * 1-5");
    expect(exp).toContain("Every 15 minutes");
    const next = cronNext("*/15 9-18 * * 1-5", 3);
    expect(next.length).toBe(3);
  });

  it("computes word statistics accurately", () => {
    const text = "KlipKit brings 76 tools together in one single app. Fast and private.";
    const stats = wordStats(text);
    const words = stats.find(([k]) => k === "Words")![1];
    expect(words).toBe(12);
  });

  it("cleans up messy text line breaks", () => {
    const messy = "This line is\nbroken into    pieces\n\n\n\nwith extra spaces.";
    const cleaned = cleanText(messy);
    expect(cleaned).toBe("This line is broken into pieces\n\nwith extra spaces.");
  });
});

describe("pasteItem & pasteAct", () => {
  it("identifies paste action from instruction", () => {
    const act = pasteAct("format and pretty print this json", "json");
    expect(act).not.toBeNull();
    expect(act!.act).toBe("fmt");
  });

  it("formats valid json with ACT.fmt", () => {
    const item = pasteItem('{"hello":"world"}');
    const res = ACT.fmt(item) as { msg: string; copy: string; open: string };
    expect(res.msg).toContain("Valid JSON");
    expect(res.copy).toContain('"hello": "world"');
    expect(res.open).toBe("JSON Formatter");
  });
});
