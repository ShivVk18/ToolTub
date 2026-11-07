import { describe, it, expect } from "vitest";
import { convert, parseConversion, fmtNum } from "@/lib/engines/units";
import { parseTimeZone, resolveZone, zoneOffset } from "@/lib/engines/timezone";
import { parseChmod, encodeEntities, decodeEntities, parseBase, groupDigits } from "@/lib/engines/devconv";
import { redactEnv, metaTags, jsonLd, parseFields } from "@/lib/engines/webdev";
import { cssGen, styleText, graphemes, captions, fitBio } from "@/lib/engines/creator";
import { renderMarkdown } from "@/lib/engines/markdown";
import { code128, ean13, upcA, eanCheck, barcodeSvg } from "@/lib/engines/barcode";

describe("units", () => {
  it("converts the everyday cases exactly", () => {
    expect(convert(5, "km", "mi")).toBeCloseTo(3.10686, 5);
    expect(convert(100, "f", "c")).toBeCloseTo(37.7778, 4);
    expect(convert(-40, "c", "f")).toBe(-40);
    expect(convert(0, "c", "k")).toBeCloseTo(273.15, 10);
    expect(convert(1, "GiB", "MB")).toBeCloseTo(1073.741824, 6);
    expect(convert(1, "lb", "g")).toBeCloseTo(453.59237, 6);
    expect(convert(1, "gal", "l")).toBeCloseTo(3.785411784, 9);
  });
  it("parses free text", () => {
    const r = parseConversion("1,000 m to km");
    expect(r.rows).toEqual([["km", 1]]);
    expect(parseConversion("5km in miles").rows[0][1]).toBeCloseTo(3.10686, 5);
    expect(parseConversion("2.5e3 g → kg").rows[0][1]).toBe(2.5);
    expect(parseConversion("10 mph to km/h, m/s").rows.map((x) => x[0])).toEqual(["km/h", "m/s"]);
    const all = parseConversion("1.5 GB");
    expect(all.kind).toBe("data");
    expect(all.rows.find((x) => x[0] === "MB")![1]).toBe(1500);
  });
  it("edge cases: unknown unit, wrong kind, below absolute zero, empty", () => {
    expect(() => parseConversion("5 parsecs to m")).toThrow(/Unknown unit: parsecs/);
    expect(() => parseConversion("5 kg to m")).toThrow(/Can't convert mass/);
    expect(() => convert(-300, "c", "f")).toThrow(/absolute zero/);
    expect(() => parseConversion("")).toThrow();
    expect(() => parseConversion("km to mi")).toThrow();
  });
  it("formats numbers without float noise", () => {
    expect(fmtNum(0.1 + 0.2)).toBe("0.3");
    expect(fmtNum(1e20)).toMatch(/e\+20$/);
    expect(fmtNum(0)).toBe("0");
  });
});

describe("time zones", () => {
  const NOW = Date.parse("2026-11-04T04:37:00Z"); // 10:07 IST
  it("converts 10:30 IST to PST (winter, standard time)", () => {
    const r = parseTimeZone("10:30 IST to PST", NOW);
    expect(r.rows[0]).toMatchObject({ zone: "Asia/Kolkata", time: "10:30", offset: "UTC+05:30" });
    expect(r.rows[1]).toMatchObject({ zone: "America/Los_Angeles", time: "21:00", offset: "UTC−08:00", dayShift: -1 });
  });
  it("handles am/pm, cities, several targets and dates across DST", () => {
    const r = parseTimeZone("6pm London in Tokyo, NYC", NOW);
    expect(r.rows.map((x) => x.time)).toEqual(["18:00", "03:00", "13:00"]);
    expect(r.rows[1].dayShift).toBe(1);
    const summer = parseTimeZone("2026-07-01 09:00 Europe/London to UTC", NOW);
    expect(summer.rows[0].offset).toBe("UTC+01:00");
    expect(summer.rows[1].time).toBe("08:00");
  });
  it("now uses the given clock; no target gives the world clock", () => {
    const r = parseTimeZone("now in Tokyo", NOW);
    expect(r.instant).toBe(NOW);
    expect(r.rows[1]).toMatchObject({ zone: "Asia/Tokyo", time: "13:37" });
    expect(parseTimeZone("12:00 UTC", NOW).rows.length).toBeGreaterThan(5);
  });
  it("edge cases: bad zone, bad time, 13pm, empty", () => {
    expect(() => resolveZone("Mars/Base")).toThrow(/Unknown time zone/);
    expect(() => parseTimeZone("25:00 UTC", NOW)).toThrow(/valid time/);
    expect(() => parseTimeZone("13pm UTC", NOW)).toThrow(/1–12/);
    expect(() => parseTimeZone("", NOW)).toThrow();
    expect(() => parseTimeZone("lunch in Tokyo", NOW)).toThrow(/time/);
    expect(zoneOffset("Asia/Kolkata", NOW)).toBe(330);
  });
});

describe("chmod", () => {
  it("octal ↔ symbolic", () => {
    expect(parseChmod("755")).toMatchObject({ octal: "755", symbolic: "rwxr-xr-x" });
    expect(parseChmod("rw-r--r--").octal).toBe("644");
    expect(parseChmod("-rwxr-x---").octal).toBe("750");
    expect(parseChmod("0644").octal).toBe("644");
  });
  it("special bits", () => {
    expect(parseChmod("4755")).toMatchObject({ symbolic: "rwsr-xr-x", special: ["setuid"] });
    expect(parseChmod("1777").symbolic).toBe("rwxrwxrwt");
    expect(parseChmod("rwSr--r--").octal).toBe("4644");
    expect(parseChmod("drwxrwxrwt").octal).toBe("1777");
  });
  it("rejects invalid input", () => {
    for (const bad of ["789", "75", "rwxrwxrw", "abc", "", "77777"]) expect(() => parseChmod(bad), bad).toThrow();
  });
});

describe("HTML entities", () => {
  it("encodes minimal and all", () => {
    expect(encodeEntities(`<a href="x">Tom & 'Jerry'</a>`, "minimal")).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;",
    );
    expect(encodeEntities("café © 😀", "all")).toBe("caf&eacute; &copy; &#x1F600;");
  });
  it("decodes named, decimal and hex; leaves unknown alone", () => {
    expect(decodeEntities("&lt;b&gt; &amp;amp; &#169; &#x1F600; &rupee;").text).toBe("<b> &amp; © 😀 ₹");
    const r = decodeEntities("&bogus; &#xD800; &#0;");
    expect(r.text).toBe("&bogus; &#xD800; &#0;");
    expect(r.unknown).toBe(3);
  });
  it("round-trips any text", () => {
    const s = "<p>“Hi” — 5 > 3 & 2 < 4 ✓ नमस्ते 🇮🇳</p>";
    expect(decodeEntities(encodeEntities(s, "all")).text).toBe(s);
  });
});

describe("number bases", () => {
  it("reads prefixes and each base", () => {
    expect(parseBase("255", "auto")).toMatchObject({ bin: "11111111", oct: "377", hex: "FF" });
    expect(parseBase("0xff", "auto").dec).toBe("255");
    expect(parseBase("0b1010_1010", "auto").dec).toBe("170");
    expect(parseBase("101", 2).dec).toBe("5");
    expect(parseBase("101", 8).dec).toBe("65");
    expect(parseBase("101", 16).dec).toBe("257");
  });
  it("big and negative numbers", () => {
    expect(parseBase("18446744073709551616", "auto").hex).toBe("10000000000000000");
    expect(parseBase("-42", "auto").bin).toBe("-101010");
    expect(groupDigits("11111111", 4, " ")).toBe("1111 1111");
    expect(groupDigits("-1234567", 3, ",")).toBe("-1,234,567");
  });
  it("rejects bad digits and mismatched prefixes", () => {
    expect(() => parseBase("102", 2)).toThrow(/base-2/);
    expect(() => parseBase("0xff", 2)).toThrow(/prefix/);
    expect(() => parseBase("", "auto")).toThrow();
    expect(() => parseBase("12.5", "auto")).toThrow();
  });
});

describe(".env redactor", () => {
  const env = [
    "# database",
    "DATABASE_URL=postgres://app:hunter2@db:5432/main",
    "export API_KEY=sk_live_51HxYzABCDEF0123456789",
    'JWT_SECRET="a=b=c"  # rotated monthly',
    "PORT=3000",
    "EMPTY=",
    'PRIVATE_KEY="-----BEGIN KEY-----',
    "abc",
    '-----END KEY-----"',
    "NEXT_PUBLIC_SITE=https://klipkit.com",
  ].join("\n");
  it("smart: hides secrets and URL passwords, keeps the rest", () => {
    const r = redactEnv(env, "smart");
    expect(r.text).toContain("postgres://app:••••@db:5432/main");
    expect(r.text).not.toContain("hunter2");
    expect(r.text).toMatch(/^export API_KEY=sk_•+$/m);
    expect(r.text).not.toContain("51HxYz");
    expect(r.text).toMatch(/^JWT_SECRET="•+"  # rotated monthly$/m);
    expect(r.text).toContain("PORT=3000");
    expect(r.text).toContain("NEXT_PUBLIC_SITE=https://klipkit.com");
    expect(r.text).toContain("# database");
    expect(r.text).not.toContain("BEGIN KEY");
    expect(r.text.split("\n").length).toBe(8); // the 3-line key collapses to one masked line
  });
  it("all and keys modes", () => {
    expect(redactEnv("PORT=3000", "all").text).toBe("PORT=••••");
    expect(redactEnv("PORT=3000\nA=", "keys").text).toBe("PORT=\nA=");
    expect(redactEnv("not an env line", "all").text).toBe("not an env line");
  });
});

describe("meta tags and JSON-LD", () => {
  it("builds escaped tags and warns about lengths", () => {
    const r = metaTags(
      `title: Tom & Jerry's "Best" Tools\ndescription: ${"x".repeat(170)}\nurl: klipkit.com\ntwitter: klipkit`,
    );
    expect(r.html).toContain("<title>Tom &amp; Jerry&#39;s &quot;Best&quot; Tools</title>");
    expect(r.warnings.join(" ")).toMatch(/170 characters/);
    expect(r.warnings.join(" ")).toMatch(/url should be a full/);
    expect(r.warnings.join(" ")).toMatch(/@handle/);
    expect(() => metaTags("description: no title")).toThrow(/title/);
  });
  it("FAQ, Product, Organization and Article; </script> can't break out", () => {
    const faq = jsonLd("q: Is it free?\na: Yes </script><script>alert(1)</script>\nq: dangling", "FAQPage");
    expect(faq.json).not.toMatch(/<\/script><script>/);
    expect(JSON.parse(faq.json.replace(/^<script[^>]*>|<\/script>$/g, "")).mainEntity).toHaveLength(1);
    expect(faq.warnings).toContain("The last question has no answer");
    const p = JSON.parse(
      jsonLd("name: Mug\nprice: ₹499\nrating: 4.6\nreviews: 12", "Product").json.replace(
        /^<script[^>]*>|<\/script>$/g,
        "",
      ),
    );
    expect(p.offers).toMatchObject({ price: "499", priceCurrency: "INR" });
    const o = JSON.parse(
      jsonLd("name: KlipKit\nsameas: https://x.com/k\nsameas: https://github.com/k", "Organization").json.replace(
        /^<script[^>]*>|<\/script>$/g,
        "",
      ),
    );
    expect(o.sameAs).toHaveLength(2);
    expect(() => jsonLd("", "Article")).toThrow();
    expect(() => jsonLd("nothing", "FAQPage")).toThrow(/q:/);
    expect(parseFields("Site Name: X").one["site-name"]).toBe("X");
  });
});

describe("CSS generator", () => {
  it("linear, radial and shadow", () => {
    expect(cssGen("#6d5df5 #ff9c82 90deg", "linear").css).toMatch(
      /linear-gradient\(90deg, #6d5df5 0%, #ff9c82 100%\)/i,
    );
    expect(cssGen("#6d5df5 #ff9c82", "linear").css).toMatch(/135deg/);
    expect(cssGen("#000, #fff, #f00 circle", "radial").css).toMatch(
      /radial-gradient\(circle at center, #000000 0%, #ffffff 50%, #ff0000 100%\)/i,
    );
    expect(cssGen("rgba(0,0,0,0.3) 0 4 12 0", "shadow").css).toMatch(/^box-shadow: 0px 4px 12px 0px rgba?\(0, ?0, ?0/);
    expect(cssGen("", "shadow").css).toContain("0px 12px 32px -8px");
    expect(cssGen("#6d5df5 #ff9c82 135deg", "shadow").css).toContain("0px 12px 32px -8px"); // the angle is not an offset
  });
  it("rejects one colour, bad colours, too many", () => {
    expect(() => cssGen("#6d5df5", "linear")).toThrow(/two colours/);
    expect(() => cssGen("#zzz #fff", "linear")).toThrow(/Not a colour/);
    expect(() => cssGen(Array(9).fill("#fff").join(" "), "linear")).toThrow(/Up to 8/);
  });
});

describe("social text", () => {
  it("styles letters and digits, keeps everything else", () => {
    expect(styleText("Hi 5!", "bold")).toBe("𝐇𝐢 𝟓!");
    expect(styleText("hello", "italic")).toBe("ℎ𝑒𝑙𝑙𝑜");
    expect(styleText("Be", "script")).toBe("ℬℯ");
    expect(styleText("café 😀 नमस्ते", "mono")).toBe("𝚌𝚊𝚏é 😀 नमस्ते");
    expect(graphemes("👍🏽a")).toBe(2);
  });
  it("captions per platform, with limits", () => {
    const yt = captions("home workouts", "youtube");
    expect(yt).toHaveLength(8);
    expect(yt[0].text).toBe("Home Workouts: The Complete Beginner's Guide");
    expect(new Set(captions("x", "linkedin").map((c) => c.text)).size).toBe(8);
    expect(() => captions("  ", "instagram")).toThrow();
    expect(() => captions("a".repeat(81), "youtube")).toThrow(/80/);
  });
  it("fits bios at word boundaries", () => {
    const bio = "Designer at KlipKit\nI make tools that feel calm\nBengaluru 🇮🇳";
    const short = fitBio(bio, 40, false);
    expect(short.cut).toBe(true);
    expect(short.length).toBeLessThanOrEqual(40);
    expect(short.text.endsWith("…")).toBe(true);
    expect(fitBio(bio, 150, true)).toMatchObject({ cut: false, text: bio });
    expect(fitBio(bio, 150, false).text).toContain(" | ");
    expect(fitBio("", 80, false)).toMatchObject({ text: "", length: 0 });
  });
});

describe("markdown", () => {
  it("renders the common syntax", () => {
    const h = renderMarkdown(
      "# Title\n\nSome **bold**, _it_, `x<y` and [link](https://a.b).\n\n- one\n  - nested\n- [x] done\n\n1. first\n\n> quote\n\n```js\nif (a < b) {}\n```\n\n| a | b |\n|---|--:|\n| 1 | 2 |\n\n---",
    );
    expect(h).toContain('<h1 id="title">Title</h1>');
    expect(h).toContain("<strong>bold</strong>");
    expect(h).toContain("<em>it</em>");
    expect(h).toContain("<code>x&lt;y</code>");
    expect(h).toContain('<a href="https://a.b" rel="noopener noreferrer">link</a>');
    expect(h).toMatch(
      /<ul><li>one<ul><li>nested<\/li><\/ul><\/li><li><input type="checkbox" disabled checked> done<\/li><\/ul>/,
    );
    expect(h).toContain("<ol><li>first</li></ol>");
    expect(h).toContain("<blockquote><p>quote</p></blockquote>");
    expect(h).toContain('<pre><code class="language-js">if (a &lt; b) {}</code></pre>');
    expect(h).toContain('<td style="text-align:right">2</td>');
    expect(h).toContain("<hr>");
  });
  it("is safe: raw HTML is text, javascript: links are neutralised", () => {
    const h = renderMarkdown(
      "<script>alert(1)</script>\n\n[x](javascript:alert(1)) ![i](data:text/html,hi) <img src=x onerror=alert(1)>",
    );
    expect(h).not.toMatch(/<script|<img src=x|javascript:|data:text/);
    expect(h).toContain("&lt;script&gt;");
    expect(h).toContain('<a href="#"');
  });
  it("edge cases: empty, unclosed fence, snake_case words", () => {
    expect(renderMarkdown("")).toBe("");
    expect(renderMarkdown("```\nopen")).toBe("<pre><code>open</code></pre>");
    expect(renderMarkdown("my_var_name stays")).toBe("<p>my_var_name stays</p>");
  });
});

describe("barcodes", () => {
  const modules = (w: number[]) => w.reduce((a, b) => a + b, 0);

  it("EAN-13 and UPC-A check digits (published examples)", () => {
    expect(eanCheck("590123412345")).toBe(7);
    expect(ean13("590123412345").text).toBe("5901234123457");
    expect(ean13("5901234123457").text).toBe("5901234123457");
    expect(upcA("03600029145").text).toBe("036000291452");
    expect(modules(ean13("590123412345").widths)).toBe(95);
  });
  it("rejects wrong check digits and lengths", () => {
    expect(() => ean13("5901234123458")).toThrow(/expected 7/);
    expect(() => ean13("12345")).toThrow(/12 digits/);
    expect(() => upcA("036000291453")).toThrow(/expected 2/);
    expect(() => upcA("abc")).toThrow();
  });
  it("Code 128: valid structure, set C for digit runs, rejects non-ASCII", () => {
    const b = code128("KlipKit-2026");
    // 11 modules per symbol, 13 for stop
    const n = modules(b.widths);
    expect((n - 13) % 11).toBe(0);
    expect(b.widths.length % 2).toBe(1); // starts and ends with a bar
    // all digits: start C (105) + 4 pairs + checksum + stop = 7 symbols
    expect((modules(code128("12345678").widths) - 13) / 11).toBe(6);
    // odd digit run at start: first digit in B, then C
    expect((modules(code128("1234567").widths) - 13) / 11).toBe(7);
    expect(() => code128("café")).toThrow(/can't encode "é"/);
    expect(() => code128("")).toThrow();
    expect(barcodeSvg(code128('<a&"b>'))).toContain("&lt;a&amp;&quot;b&gt;");
  });
});
