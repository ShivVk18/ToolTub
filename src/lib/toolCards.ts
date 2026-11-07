// KlipKit Live Tool Panels Library
// 18 client-side developer tools matching design/reference/KlipKit_UI.html lines 945-970

import { esc, utf8b64, utf8b64Decode, wordStats, titleCase, cleanText, cap } from "./engines/text";
import { hlJSON, jsonErr, tsType } from "./engines/json";
import { decodeJwt } from "./engines/jwt";
import { rel, tsConv } from "./engines/time";
import { hashAll } from "./engines/hash";
import { genPassword, LOREM } from "./engines/generators";
import { parseColor } from "./engines/color";
import { cronNext, cronExplain } from "./engines/cron";
import { fmtSQL } from "./engines/sql";
import { toCSV, parseCSV } from "./engines/csv";
import { uuidV4 } from "./engines/random";
import { byteLength, fmtSize } from "./engines/format";
import { parseConversion, fmtNum } from "./engines/units";
import { parseTimeZone } from "./engines/timezone";
import { parseChmod, encodeEntities, decodeEntities, parseBase, groupDigits, type Base } from "./engines/devconv";
import { redactEnv, metaTags, jsonLd, type RedactMode, type SchemaType } from "./engines/webdev";
import {
  cssGen,
  styleText,
  graphemes,
  captions,
  fitBio,
  LIMITS,
  BIO_LIMITS,
  type CssKind,
  type TextStyle,
  type CaptionStyle,
} from "./engines/creator";
import { renderMarkdown } from "./engines/markdown";
import { toYaml, fromYaml } from "./engines/yaml";
import { detectLang, minifyCss, minifyHtml, type CodeLang } from "./engines/minify";
import { code128, ean13, upcA, barcodeSvg } from "./engines/barcode";

export { fmtSize };

export interface CardRunResult {
  html?: string;
  copy?: string;
  status?: string;
  bad?: boolean | number;
}

export interface CardConfig {
  opts?: [string, string][];
  sample?: string;
  gen?: boolean | number;
  regex?: boolean | number;
  pat?: string;
  flags?: string;
  run: (v: string, o?: string | null, pat?: string, fl?: string) => CardRunResult | Promise<CardRunResult>;
}

/** Live panel tools keyed by registry slug (see CARD_SLUGS in registry/tools.ts). */
export const PANELS: Record<string, CardConfig> = {
  "json-formatter": {
    opts: [
      ["2 spaces", "2"],
      ["4 spaces", "4"],
      ["Tabs", "t"],
      ["Minify", "m"],
    ],
    sample:
      '{"user":{"id":42,"name":"Asha Rao","roles":["admin","editor"],"active":true,"plan":null},"items":[{"sku":"KK-01","qty":2,"price":299.5}]}',
    run: (v, o) => {
      if (!v.trim()) return {};
      try {
        const x = JSON.parse(v);
        const s = o === "m" ? JSON.stringify(x) : JSON.stringify(x, null, o === "t" ? "\t" : +o! || 2);
        const size = byteLength(s);
        return {
          html: hlJSON(s),
          copy: s,
          status: `✓ Valid JSON · ${s.split("\n").length} lines · ${fmtSize(size)}`,
        };
      } catch (e: unknown) {
        const er = jsonErr(v, e as Error);
        return {
          html: `<span class="perr">${esc(er.msg)}${er.line ? ` — line ${er.line}, column ${er.col}` : ""}</span>`,
          status: "✕ Invalid JSON",
          bad: 1,
        };
      }
    },
  },

  "jwt-decoder": {
    sample:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzQyIiwibmFtZSI6IkFzaGEgUmFvIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzMwNTAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.c2lnbmF0dXJl",
    run: (v) => {
      if (!v.trim()) return {};
      try {
        const { header: H, payload: P } = decodeJwt(v);
        const exp = P.exp ? Number(P.exp) * 1000 : null;
        return {
          html: `<span class="pc">// header</span>\n${hlJSON(JSON.stringify(H, null, 2))}\n\n<span class="pc">// payload</span>\n${hlJSON(
            JSON.stringify(P, null, 2),
          )}`,
          copy: JSON.stringify(P, null, 2),
          status: exp
            ? (exp < Date.now() ? `✕ Expired ${rel(exp, Date.now())}` : `✓ Valid · expires ${rel(exp, Date.now())}`) +
              ` · ${H.alg || "none"} · signature not verified`
            : `No expiry · ${H.alg || "none"}`,
          bad: exp ? exp < Date.now() : false,
        };
      } catch {
        return { html: '<span class="perr">Not a valid JWT</span>', status: "✕ Invalid", bad: 1 };
      }
    },
  },

  base64: {
    opts: [
      ["Encode", "e"],
      ["Decode", "d"],
    ],
    sample: "KlipKit — drop it, paste it, or just ask ✨",
    run: (v, o) => {
      if (!v) return {};
      try {
        const s = o === "d" ? utf8b64Decode(v) : utf8b64(v);
        const size = byteLength(s);
        return {
          html: esc(s),
          copy: s,
          status: `${o === "d" ? "Decoded" : "Encoded"} · ${fmtSize(size)}`,
        };
      } catch {
        return { html: '<span class="perr">Not valid Base64</span>', status: "✕", bad: 1 };
      }
    },
  },

  "url-encoder": {
    opts: [
      ["Encode", "e"],
      ["Decode", "d"],
      ["Parse", "p"],
    ],
    sample: "https://klipkit.com/search?q=compress pdf&lang=en-IN#tools",
    run: (v, o) => {
      if (!v) return {};
      try {
        if (o === "p") {
          const u = new URL(v.trim());
          const rows: [string, string][] = [
            ["protocol", u.protocol],
            ["host", u.host],
            ["path", u.pathname],
          ];
          u.searchParams.forEach((x, k) => rows.push(["?" + k, x]));
          if (u.hash) rows.push(["hash", u.hash]);
          const s = rows.map((r) => r[0].padEnd(12) + r[1]).join("\n");
          return { html: esc(s), copy: s, status: `${[...u.searchParams].length} query params` };
        }
        const s = o === "d" ? decodeURIComponent(v) : encodeURIComponent(v);
        return { html: esc(s), copy: s, status: o === "d" ? "Decoded" : "Encoded" };
      } catch (e: unknown) {
        return { html: '<span class="perr">' + esc((e as Error).message) + "</span>", status: "✕", bad: 1 };
      }
    },
  },

  "timestamp-converter": {
    sample: "1730592000",
    run: (v) => {
      if (!v.trim()) return {};
      const r = /^\d{9,13}$/.test(v.trim())
        ? tsConv(v, Date.now())
        : (() => {
            const d = new Date(v);
            return isNaN(d.getTime()) ? null : tsConv(String(d.getTime()), Date.now());
          })();
      if (!r) return { html: '<span class="perr">Type a Unix timestamp or a date</span>', status: "✕", bad: 1 };
      const s = r.map((x) => x[0].padEnd(14) + x[1]).join("\n");
      return { html: esc(s), copy: r[4][1], status: "✓ " + r[3][1] };
    },
  },

  "word-counter": {
    sample:
      "KlipKit brings 76 genuinely useful tools under one roof. Drop a file, paste anything, or just ask — and it is done in seconds.\n\nNo sign-ups. No pop-ups. No waiting.",
    run: (v) => {
      const r = wordStats(v);
      const n = [...v].length;
      const lim: [string, number][] = [
        ["X / Twitter", 280],
        ["Instagram caption", 2200],
        ["LinkedIn post", 3000],
      ];
      const s = r.map((x) => x[0].padEnd(16) + String(x[1])).join("\n");
      return {
        html:
          esc(s) +
          '\n\n<span class="pc">// social limits</span>\n' +
          esc(lim.map(([k, l]) => k.padEnd(18) + (n <= l ? "✓ fits" : "✕ " + (n - l) + " over")).join("\n")),
        copy: s,
        status: `${r[0][1]} words · ${n} characters`,
      };
    },
  },

  "case-converter": {
    opts: [
      ["Title Case", "t"],
      ["UPPER", "u"],
      ["lower", "l"],
      ["camelCase", "c"],
      ["snake_case", "s"],
      ["kebab-case", "k"],
    ],
    sample: "drop it, paste it, or just ask",
    run: (v, o) => {
      const w = v
        .trim()
        .split(/[\s_\-]+/)
        .filter(Boolean);
      const s =
        (
          {
            t: titleCase(v),
            u: v.toUpperCase(),
            l: v.toLowerCase(),
            c: w.map((x, i) => (i ? cap(x.toLowerCase()) : x.toLowerCase())).join(""),
            s: w.map((x) => x.toLowerCase()).join("_"),
            k: w.map((x) => x.toLowerCase()).join("-"),
          } as Record<string, string>
        )[o || "t"] || v;
      return { html: esc(s), copy: s, status: `${w.length} words` };
    },
  },

  "hash-generator": {
    sample: "hello world",
    run: async (v) => {
      const r = await hashAll(v);
      const s = r.map((x) => x[0].padEnd(9) + x[1]).join("\n");
      return { html: esc(s), copy: r[1][1], status: "Web Crypto · on device" };
    },
  },

  "uuid-generator": {
    gen: 1,
    opts: [
      ["1", "1"],
      ["5", "5"],
      ["10", "10"],
      ["50", "50"],
    ],
    run: (_v, o) => {
      const len = +(o || 5);
      const l = Array.from({ length: len }, () => uuidV4());
      return { html: esc(l.join("\n")), copy: l.join("\n"), status: `${l.length} × UUID v4` };
    },
  },

  "password-generator": {
    gen: 1,
    opts: [
      ["16", "16"],
      ["24", "24"],
      ["32", "32"],
      ["64", "64"],
    ],
    run: (_v, o) => {
      const p = genPassword(+(o || 24));
      return {
        html: `<span style="font-size:22px">${esc(p)}</span>`,
        copy: p,
        status: `${p.length} characters · ~${Math.round(p.length * Math.log2(70))} bits of entropy`,
      };
    },
  },

  "lorem-ipsum": {
    gen: 1,
    opts: [
      ["1 ¶", "1"],
      ["3 ¶", "3"],
      ["5 ¶", "5"],
    ],
    run: (_v, o) => {
      const count = +(o || 3);
      const s = Array.from({ length: count }, (_, i) => LOREM[i % 4]).join("\n\n");
      return { html: esc(s), copy: s, status: `${wordStats(s)[0][1]} words` };
    },
  },

  "color-converter": {
    sample: "#6D5DF5",
    run: (v) => {
      const c = parseColor(v);
      if (!c) return { html: '<span class="perr">Type a HEX, rgb() or hsl() colour</span>', status: "✕", bad: 1 };
      const s = `HEX   ${c.hex}\nRGB   ${c.rgb}\nHSL   ${c.hsl}\n\nWhite text  ${c.cw.toFixed(2)} : 1 ${
        c.cw >= 4.5 ? "✓ AA" : ""
      }\nDark text   ${c.cb.toFixed(2)} : 1 ${c.cb >= 4.5 ? "✓ AA" : ""}`;
      return {
        html:
          `<div class="swatch" style="background:${c.hex};margin-bottom:14px"><span style="color:#fff">Aa</span><span style="color:#17161B">Aa</span></div>` +
          esc(s),
        copy: s,
        status: c.hex,
      };
    },
  },

  "cron-generator": {
    sample: "*/15 9-18 * * 1-5",
    run: (v) => {
      const p = v.trim().split(/\s+/);
      if (p.length !== 5) {
        return {
          html: '<span class="perr">Cron needs 5 fields: minute hour day month weekday</span>',
          status: "✕",
          bad: 1,
        };
      }
      const r = cronNext(v, Date.now(), 6);
      const s =
        cronExplain(v) +
        "\n\n" +
        r
          .map(
            (d) =>
              "→ " +
              d.toLocaleString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
          )
          .join("\n");
      return { html: esc(s), copy: v.trim(), status: "Next runs in your time zone" };
    },
  },

  "sql-formatter": {
    sample:
      "select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.active = true and o.total > 500 group by u.id, u.name order by orders desc limit 10",
    run: (v) => {
      const s = fmtSQL(v);
      return {
        html: esc(s).replace(
          /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LEFT JOIN|JOIN|ON|AND|OR|LIMIT|AS|COUNT|DESC|ASC|HAVING|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM)\b/g,
          '<span class="jk">$1</span>',
        ),
        copy: s,
        status: `${s.split("\n").length} lines`,
      };
    },
  },

  "json-to-csv": {
    sample: 'name,city,orders\nAsha,Pune,12\nRohan,"Delhi, NCR",7\nMeera,Bengaluru,21',
    run: (v) => {
      const t = v.trim();
      if (!t) return {};
      try {
        if (/^[\[{]/.test(t)) {
          const s = toCSV(JSON.parse(t));
          return { html: esc(s), copy: s, status: "JSON → CSV" };
        }
        const j = parseCSV(t);
        const s = JSON.stringify(j, null, 2);
        return { html: hlJSON(s), copy: s, status: `CSV → JSON · ${j.length} rows` };
      } catch (e: unknown) {
        return { html: '<span class="perr">' + esc((e as Error).message) + "</span>", status: "✕", bad: 1 };
      }
    },
  },

  "json-to-typescript": {
    sample:
      '{"id":42,"name":"Asha","tags":["pro"],"address":{"city":"Pune","pin":411001},"orders":[{"sku":"KK-01","qty":2}]}',
    run: (v) => {
      try {
        const acc: string[] = [];
        tsType(JSON.parse(v), "Root", acc);
        const s = acc.join("\n\n");
        return {
          html: esc(s)
            .replace(/\b(export|interface)\b/g, '<span class="jk">$1</span>')
            .replace(/: (string|number|boolean|null|unknown)/g, ': <span class="jn">$1</span>'),
          copy: s,
          status: `${acc.length} interfaces`,
        };
      } catch {
        return { html: '<span class="perr">Paste valid JSON</span>', status: "✕", bad: 1 };
      }
    },
  },

  "clean-text": {
    sample: "This line was\nbroken in the\nmiddle by a PDF   copy.\n\n\n\nToo many    spaces too.",
    run: (v) => {
      const s = cleanText(v);
      return { html: esc(s), copy: s, status: `${v.length - s.length} characters tidied` };
    },
  },

  "regex-tester": {
    regex: 1,
    sample: "Contact asha@klipkit.com or rohan.dev@example.in — not @nobody or test@.",
    pat: "[\\w.+-]+@[\\w-]+\\.[\\w.]+",
    flags: "g",
    run: (v, _o, pat, fl = "g") => {
      if (!pat) return { html: esc(v), status: "Type a pattern" };
      let re: RegExp;
      try {
        re = new RegExp(pat, fl.includes("g") ? fl : fl + "g");
      } catch (e: unknown) {
        return {
          html: '<span class="perr">' + esc((e as Error).message) + "</span>",
          status: "✕ Invalid pattern",
          bad: 1,
        };
      }
      let out = "",
        last = 0,
        n = 0;
      const list: RegExpMatchArray[] = [];
      for (const m of v.matchAll(re)) {
        if (n++ > 500) break;
        if (m[0] === "") continue;
        out += esc(v.slice(last, m.index!)) + `<mark class="rm">${esc(m[0])}</mark>`;
        last = m.index! + m[0].length;
        list.push(m);
      }
      out += esc(v.slice(last));
      return {
        html:
          out +
          (list.length
            ? `\n\n<span class="pc">// ${list.length} match${list.length > 1 ? "es" : ""}</span>\n` +
              list
                .slice(0, 30)
                .map(
                  (m, i) =>
                    `${String(i + 1).padStart(2)}  ${esc(m[0])}${
                      m.length > 1
                        ? "  " +
                          m
                            .slice(1)
                            .map((g, j) => `<span class="pc">$${j + 1}</span>=${esc(g ?? "")}`)
                            .join(" ")
                        : ""
                    }`,
                )
                .join("\n")
            : ""),
        copy: list.map((m) => m[0]).join("\n"),
        status: `${list.length} match${list.length === 1 ? "" : "es"}`,
      };
    },
  },

  "unit-converter": {
    sample: "5 km to mi",
    run: (v) => {
      if (!v.trim()) return {};
      try {
        const r = parseConversion(v);
        const w = Math.max(...r.rows.map((x) => x[0].length));
        const s = r.rows.map(([u, n]) => `${u.padEnd(w)}  ${fmtNum(n)}`).join("\n");
        return {
          html: `<span class="pc">${esc(fmtNum(r.value) + " " + r.from)} =</span>\n${esc(s)}`,
          copy: r.rows.length === 1 ? `${fmtNum(r.rows[0][1])} ${r.rows[0][0]}` : s,
          status: `${cap(r.kind)} · ${r.rows.length} unit${r.rows.length > 1 ? "s" : ""}`,
        };
      } catch (e) {
        return { html: `<span class="perr">${esc((e as Error).message)}</span>`, status: "✕", bad: 1 };
      }
    },
  },

  "time-zone-converter": {
    sample: "10:30 IST to PST, London, Tokyo",
    run: (v) => {
      if (!v.trim()) return {};
      try {
        const r = parseTimeZone(v, Date.now());
        const city = (z: string) => z.split("/").pop()!.replace(/_/g, " ");
        const w = Math.max(...r.rows.map((x) => city(x.zone).length));
        const s = r.rows
          .map(
            (x) =>
              `${city(x.zone).padEnd(w)}  ${x.time}  ${x.date.padEnd(10)} ${x.offset.replace("UTC", "")}${x.dayShift ? `  ${x.dayShift > 0 ? "+" : ""}${x.dayShift}d` : ""}`,
          )
          .join("\n");
        return { html: esc(s), copy: s, status: `${r.rows.length} zones · daylight saving included` };
      } catch (e) {
        return { html: `<span class="perr">${esc((e as Error).message)}</span>`, status: "✕", bad: 1 };
      }
    },
  },

  "json-to-yaml": {
    opts: [
      ["JSON → YAML", "y"],
      ["YAML → JSON", "j"],
    ],
    sample:
      '{"name":"klipkit","version":"1.0","private":true,"tools":["json","yaml"],"port":3000,"on":"yes","zip":"007"}',
    run: async (v, o) => {
      if (!v.trim()) return {};
      const YAML = await import("yaml");
      try {
        if (o === "j") {
          const x = fromYaml(YAML, v);
          const s = JSON.stringify(x, null, 2) ?? "null";
          return { html: hlJSON(s), copy: s, status: "✓ YAML → JSON" };
        }
        const x = JSON.parse(v);
        const s = toYaml(YAML, x);
        return { html: esc(s), copy: s, status: `✓ JSON → YAML · ${s.split("\n").length - 1} lines` };
      } catch (e) {
        return {
          html: `<span class="perr">${esc((e as Error).message.split("\n")[0])}</span>`,
          status: o === "j" ? "✕ Invalid YAML" : "✕ Invalid JSON",
          bad: 1,
        };
      }
    },
  },

  "env-redactor": {
    opts: [
      ["Hide secrets", "smart"],
      ["Hide all values", "all"],
      ["Keys only", "keys"],
    ],
    sample:
      "# app\nDATABASE_URL=postgres://app:hunter2@db:5432/main\nSTRIPE_SECRET_KEY=sk_live_51HxYzABCDEF0123456789\nPORT=3000\nNEXT_PUBLIC_SITE=https://klipkit.com",
    run: (v, o) => {
      if (!v.trim()) return {};
      const r = redactEnv(v, (o || "smart") as RedactMode);
      return { html: esc(r.text), copy: r.text, status: `${r.redacted} hidden · ${r.kept} kept` };
    },
  },

  "meta-tag-generator": {
    sample:
      "title: KlipKit — free tools that run on your device\ndescription: Compress, convert and format files in your browser. Nothing is uploaded.\nurl: https://klipkit.com\nimage: https://klipkit.com/og.png\nsite: KlipKit\ntwitter: @klipkit",
    run: (v) => {
      if (!v.trim()) return {};
      try {
        const r = metaTags(v);
        return {
          html:
            esc(r.html) +
            (r.warnings.length ? `\n\n<span class="pc">// ${r.warnings.map(esc).join("\n// ")}</span>` : ""),
          copy: r.html,
          status: r.warnings.length
            ? `${r.warnings.length} suggestion${r.warnings.length > 1 ? "s" : ""}`
            : "✓ Ready to paste into <head>",
        };
      } catch (e) {
        return { html: `<span class="perr">${esc((e as Error).message)}</span>`, status: "✕", bad: 1 };
      }
    },
  },

  "schema-generator": {
    opts: [
      ["Article", "Article"],
      ["Product", "Product"],
      ["FAQ", "FAQPage"],
      ["Organization", "Organization"],
    ],
    sample:
      "name: KlipKit\ndescription: Free tools that run on your device.\nurl: https://klipkit.com\nauthor: Asha Rao\ndate: 2026-11-07\nprice: 0\nq: Is KlipKit free?\na: Yes. Every tool has a free plan.",
    run: (v, o) => {
      if (!v.trim()) return {};
      try {
        const r = jsonLd(v, (o || "Article") as SchemaType);
        return {
          html:
            esc(r.json) +
            (r.warnings.length ? `\n\n<span class="pc">// ${r.warnings.map(esc).join("\n// ")}</span>` : ""),
          copy: r.json,
          status: r.warnings.length
            ? `${r.warnings.length} suggestion${r.warnings.length > 1 ? "s" : ""}`
            : "✓ Valid JSON-LD",
        };
      } catch (e) {
        return { html: `<span class="perr">${esc((e as Error).message)}</span>`, status: "✕", bad: 1 };
      }
    },
  },

  "chmod-calculator": {
    sample: "755",
    run: (v) => {
      if (!v.trim()) return {};
      try {
        const r = parseChmod(v);
        const row = (t: (typeof r.table)[number]) =>
          `${t.who.padEnd(7)} ${t.read ? "read " : "-    "} ${t.write ? "write " : "-     "} ${t.execute ? "execute" : "-"}`;
        const s = `${r.octal}  ${r.symbolic}\n\n${r.table.map(row).join("\n")}${r.special.length ? `\n\nSpecial: ${r.special.join(", ")}` : ""}\n\nchmod ${r.octal} file`;
        return { html: esc(s), copy: `chmod ${r.octal}`, status: `${r.octal} = ${r.symbolic}` };
      } catch (e) {
        return { html: `<span class="perr">${esc((e as Error).message)}</span>`, status: "✕", bad: 1 };
      }
    },
  },

  "html-entities": {
    opts: [
      ["Encode", "e"],
      ["Encode all", "a"],
      ["Decode", "d"],
    ],
    sample: "<p>Café “KlipKit” & co — 5 > 3 ✓</p>",
    run: (v, o) => {
      if (!v) return {};
      if (o === "d") {
        const r = decodeEntities(v);
        return {
          html: esc(r.text),
          copy: r.text,
          status: r.unknown ? `Decoded · ${r.unknown} unknown left as is` : "Decoded",
        };
      }
      const s = encodeEntities(v, o === "a" ? "all" : "minimal");
      return { html: esc(s), copy: s, status: `Encoded · ${s.length} characters` };
    },
  },

  "number-base-converter": {
    opts: [
      ["Auto", "auto"],
      ["From binary", "2"],
      ["From octal", "8"],
      ["From hex", "16"],
    ],
    sample: "101",
    run: (v, o) => {
      if (!v.trim()) return {};
      try {
        const r = parseBase(v, o === "auto" || !o ? "auto" : (+o as Base));
        const s = [
          `Binary   ${groupDigits(r.bin, 4, " ")}`,
          `Octal    ${r.oct}`,
          `Decimal  ${groupDigits(r.dec, 3, ",")}`,
          `Hex      ${groupDigits(r.hex, 4, " ")}`,
        ].join("\n");
        return { html: esc(s), copy: s, status: `Read as base ${r.from}` };
      } catch (e) {
        return { html: `<span class="perr">${esc((e as Error).message)}</span>`, status: "✕", bad: 1 };
      }
    },
  },

  "css-generator": {
    opts: [
      ["Linear", "linear"],
      ["Radial", "radial"],
      ["Shadow", "shadow"],
    ],
    sample: "#6d5df5 #ff9c82 135deg",
    run: (v, o) => {
      if (!v.trim()) return {};
      try {
        const r = cssGen(v, (o || "linear") as CssKind);
        return {
          html: `<div class="pswatch" style="${esc(r.preview)}"></div>${esc(r.css)}`,
          copy: r.css,
          status: "✓ CSS ready",
        };
      } catch (e) {
        return { html: `<span class="perr">${esc((e as Error).message)}</span>`, status: "✕", bad: 1 };
      }
    },
  },

  "social-post-formatter": {
    opts: [
      ["Bold", "bold"],
      ["Italic", "italic"],
      ["Bold italic", "bolditalic"],
      ["Mono", "mono"],
      ["Script", "script"],
    ],
    sample: "Big news 🎉\n\nKlipKit now has 40 more free tools.\nNo sign-up. Nothing uploaded.",
    run: (v, o) => {
      if (!v) return {};
      // Empty lines get an invisible character so apps that collapse blank lines keep the spacing.
      const s = styleText(v, (o || "bold") as TextStyle).replace(/\n(?=\n)/g, "\n\u2800");
      const n = graphemes(s);
      const over = LIMITS.filter(([, max]) => n > max).map(([p]) => p);
      return {
        html: esc(s),
        copy: s,
        status: `${n} characters${over.length ? ` · too long for ${over.join(", ")}` : " · fits every platform"}`,
        bad: over.length > 0 && over.length === LIMITS.length,
      };
    },
  },

  "title-builder": {
    opts: [
      ["YouTube", "youtube"],
      ["Instagram", "instagram"],
      ["LinkedIn", "linkedin"],
    ],
    sample: "home workouts",
    run: (v, o) => {
      if (!v.trim()) return {};
      try {
        const r = captions(v, (o || "youtube") as CaptionStyle);
        const s = r.map((c, i) => `${String(i + 1).padStart(2)}. ${c.text}`).join("\n");
        const notes = r.filter((c) => c.warn).length;
        return {
          html: r
            .map(
              (c, i) =>
                `${String(i + 1).padStart(2)}. ${esc(c.text)} <span class="pc">${c.length}${c.warn ? " · " + c.warn : ""}</span>`,
            )
            .join("\n"),
          copy: s,
          status: `${r.length} ideas${notes ? ` · ${notes} may be cut off` : ""}`,
        };
      } catch (e) {
        return { html: `<span class="perr">${esc((e as Error).message)}</span>`, status: "✕", bad: 1 };
      }
    },
  },

  "bio-formatter": {
    sample: "Product designer at KlipKit\nMaking tools that feel calm and fast\nBengaluru 🇮🇳 · she/her\nklipkit.com",
    run: (v) => {
      if (!v.trim()) return {};
      const rows = BIO_LIMITS.map(([p, max]) => {
        const r = fitBio(v, max, p === "Instagram" || p === "YouTube");
        return { p, max, ...r };
      });
      const cut = rows.filter((r) => r.cut).length;
      return {
        html: rows
          .map(
            (r) =>
              `<span class="pc">// ${r.p} · ${r.length}/${r.max}${r.cut ? " · shortened" : ""}</span>\n${esc(r.text)}`,
          )
          .join("\n\n"),
        copy: rows.map((r) => `${r.p}:\n${r.text}`).join("\n\n"),
        status: cut ? `Shortened for ${cut} platform${cut > 1 ? "s" : ""}` : "Fits every platform",
      };
    },
  },

  "markdown-editor": {
    opts: [
      ["Preview", "p"],
      ["HTML", "h"],
    ],
    sample:
      "# Release notes\n\nKlipKit now has **40 more tools**, all running _on your device_.\n\n- [x] Unit converter\n- [ ] Video tools\n\n> Nothing is uploaded.\n\n```js\nconst ok = true;\n```\n\n[Open KlipKit](https://klipkit.com)",
    run: (v, o) => {
      if (!v.trim()) return {};
      const h = renderMarkdown(v);
      const words = v.trim().split(/\s+/).length;
      return o === "h"
        ? { html: esc(h), copy: h, status: `HTML · ${h.length} characters` }
        : {
            html: `<div class="pmd">${h}</div>`,
            copy: v,
            status: `${words} words · ${Math.max(1, Math.round(words / 230))} min read`,
          };
    },
  },

  "barcode-generator": {
    opts: [
      ["Code 128", "c"],
      ["EAN-13", "e"],
      ["UPC-A", "u"],
    ],
    sample: "036000291452",
    run: (v, o) => {
      if (!v.trim()) return {};
      try {
        const b = o === "e" ? ean13(v) : o === "u" ? upcA(v) : code128(v.trim());
        const svg = barcodeSvg(b);
        return {
          html: `<div class="pbar">${svg}</div>\n<span class="pc">${b.kind} · ${esc(b.text)} · copy gives the SVG</span>`,
          copy: svg,
          status: `✓ ${b.kind} · ${b.text}`,
        };
      } catch (e) {
        return { html: `<span class="perr">${esc((e as Error).message)}</span>`, status: "✕", bad: 1 };
      }
    },
  },

  "code-minifier": {
    opts: [
      ["Minify", "min"],
      ["Format", "fmt"],
    ],
    sample:
      "// Greets a user\nfunction greet(name) {\n  const message = `Hello, ${name}!`;\n  console.log(message);\n  return message;\n}\ngreet('KlipKit');",
    run: async (v, o) => {
      if (!v.trim()) return {};
      const lang: CodeLang = detectLang(v);
      const label = { js: "JavaScript", css: "CSS", html: "HTML", json: "JSON" }[lang];
      try {
        let out: string;
        if (o === "fmt") {
          if (lang === "json") out = JSON.stringify(JSON.parse(v), null, 2);
          else {
            const prettier = await import("prettier/standalone");
            const plugins =
              lang === "css"
                ? [await import("prettier/plugins/postcss")]
                : lang === "html"
                  ? [
                      await import("prettier/plugins/html"),
                      await import("prettier/plugins/postcss"),
                      await import("prettier/plugins/babel"),
                      await import("prettier/plugins/estree"),
                    ]
                  : [await import("prettier/plugins/babel"), await import("prettier/plugins/estree")];
            out = (
              await prettier.format(v, {
                parser: lang === "css" ? "css" : lang === "html" ? "html" : "babel",
                plugins: plugins as never[],
              })
            ).trimEnd();
          }
        } else if (lang === "json") out = JSON.stringify(JSON.parse(v));
        else if (lang === "css") out = minifyCss(v);
        else if (lang === "html") out = minifyHtml(v);
        else {
          const { minify } = await import("terser");
          const r = await minify(v, { compress: true, mangle: true, format: { comments: /^!/ } });
          out = r.code ?? "";
        }
        const before = byteLength(v);
        const after = byteLength(out);
        return {
          html: esc(out),
          copy: out,
          status: `${label} · ${o === "fmt" ? "formatted" : `${fmtSize(before)} → ${fmtSize(after)} (−${Math.max(0, Math.round((1 - after / before) * 100))}%)`}`,
        };
      } catch (e) {
        const msg = (e as Error).message.split("\n")[0];
        return {
          html: `<span class="perr">${esc(`${label}: ${msg}`)}</span>`,
          status: `✕ Couldn't parse this ${label}`,
          bad: 1,
        };
      }
    },
  },
};
