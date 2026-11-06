// KlipKit Live Tool Panels Library
// 18 client-side developer tools matching design/reference/KlipKit_UI.html lines 945-970

import {
  esc,
  hlJSON,
  jsonErr,
  decodeJWT,
  utf8b64,
  tsConv,
  wordStats,
  titleCase,
  hashAll,
  genPassword,
  LOREM,
  parseColor,
  cronNext,
  cronExplain,
  fmtSQL,
  toCSV,
  parseCSV,
  tsType,
  cleanText,
  rel,
  cap,
} from "./detect";

export interface PanelRunResult {
  html?: string;
  copy?: string;
  status?: string;
  bad?: boolean | number;
}

export interface PanelConfig {
  opts?: [string, string][];
  sample?: string;
  gen?: boolean | number;
  regex?: boolean | number;
  pat?: string;
  flags?: string;
  run: (v: string, o?: string | null, pat?: string, fl?: string) => PanelRunResult | Promise<PanelRunResult>;
}

export function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const PANELS: Record<string, PanelConfig> = {
  "JSON Formatter": {
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
        const size = typeof Blob !== "undefined" ? new Blob([s]).size : Buffer.byteLength(s);
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

  "JWT Decoder": {
    sample:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzQyIiwibmFtZSI6IkFzaGEgUmFvIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzMwNTAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.c2lnbmF0dXJl",
    run: (v) => {
      if (!v.trim()) return {};
      try {
        const { H, P } = decodeJWT(v);
        const exp = P.exp ? Number(P.exp) * 1000 : null;
        return {
          html: `<span class="pc">// header</span>\n${hlJSON(JSON.stringify(H, null, 2))}\n\n<span class="pc">// payload</span>\n${hlJSON(
            JSON.stringify(P, null, 2),
          )}`,
          copy: JSON.stringify(P, null, 2),
          status: exp
            ? (exp < Date.now() ? `✕ Expired ${rel(exp)}` : `✓ Valid · expires ${rel(exp)}`) +
              ` · ${H.alg || "none"} · signature not verified`
            : `No expiry · ${H.alg || "none"}`,
          bad: exp ? exp < Date.now() : false,
        };
      } catch {
        return { html: '<span class="perr">Not a valid JWT</span>', status: "✕ Invalid", bad: 1 };
      }
    },
  },

  Base64: {
    opts: [
      ["Encode", "e"],
      ["Decode", "d"],
    ],
    sample: "KlipKit — drop it, paste it, or just ask ✨",
    run: (v, o) => {
      if (!v) return {};
      try {
        const s = o === "d" ? decodeURIComponent(escape(atob(v.trim()))) : utf8b64(v);
        const size = typeof Blob !== "undefined" ? new Blob([s]).size : Buffer.byteLength(s);
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

  "URL Encoder": {
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

  Timestamp: {
    sample: "1730592000",
    run: (v) => {
      if (!v.trim()) return {};
      const r = /^\d{9,13}$/.test(v.trim())
        ? tsConv(v)
        : (() => {
            const d = new Date(v);
            return isNaN(d.getTime()) ? null : tsConv(String(d.getTime()));
          })();
      if (!r) return { html: '<span class="perr">Type a Unix timestamp or a date</span>', status: "✕", bad: 1 };
      const s = r.map((x) => x[0].padEnd(14) + x[1]).join("\n");
      return { html: esc(s), copy: r[4][1], status: "✓ " + r[3][1] };
    },
  },

  "Word Counter": {
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

  "Case Converter": {
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

  "Hash Generator": {
    sample: "hello world",
    run: async (v) => {
      const r = await hashAll(v);
      const s = r.map((x) => x[0].padEnd(9) + x[1]).join("\n");
      return { html: esc(s), copy: r[1][1], status: "Web Crypto · on device" };
    },
  },

  "UUID Generator": {
    gen: 1,
    opts: [
      ["1", "1"],
      ["5", "5"],
      ["10", "10"],
      ["50", "50"],
    ],
    run: (_v, o) => {
      const len = +(o || 5);
      const l = Array.from({ length: len }, () =>
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
            }),
      );
      return { html: esc(l.join("\n")), copy: l.join("\n"), status: `${l.length} × UUID v4` };
    },
  },

  "Password Generator": {
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

  "Lorem Ipsum": {
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

  "Color Converter": {
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

  "Cron Builder": {
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
      const r = cronNext(v, 6);
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

  "SQL Formatter": {
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

  "CSV ↔ JSON": {
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

  "JSON to TypeScript": {
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

  "Clean Text": {
    sample: "This line was\nbroken in the\nmiddle by a PDF   copy.\n\n\n\nToo many    spaces too.",
    run: (v) => {
      const s = cleanText(v);
      return { html: esc(s), copy: s, status: `${v.length - s.length} characters tidied` };
    },
  },

  "Regex Tester": {
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
};
