/**
 * Paste and generator actions for the home workspace. Composes the pure engines in `lib/engines`
 * and renders their results as small HTML snippets for the chat thread.
 */
import { cronExplain, cronNext } from "./engines/cron";
import { toCSV, parseCSV } from "./engines/csv";
import { parseColor } from "./engines/color";
import { fmtSQL } from "./engines/sql";
import { hashAll } from "./engines/hash";
import { decodeJwt } from "./engines/jwt";
import { hlJSON, jsonErr, tsType } from "./engines/json";
import { rel, tsConv } from "./engines/time";
import { cleanText, esc, titleCase, utf8b64, utf8b64Decode, wordStats } from "./engines/text";
import { genPassword, LOREM, type GenParsed } from "./engines/generators";
import { uuidV4 } from "./engines/random";
import { byteLength } from "./engines/format";
import type { PasteItem, PasteType } from "./engines/detect";

export const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,"DejaVu Sans Mono",monospace';

export const PT_TILE: Record<PasteType, string> = {
  json: "{ }",
  jwt: "JWT",
  ts: "⏱",
  color: "●",
  cron: "CRON",
  sql: "SQL",
  url: "URL",
  b64: "B64",
  regex: "/.*/",
  csv: "CSV",
  text: "Aa",
};

export const PT_COLOR: Record<PasteType, string> = {
  json: "#6D5DF5",
  jwt: "#D98E04",
  ts: "#2F80ED",
  color: "#E5484D",
  cron: "#1F9D63",
  sql: "#2B5FD9",
  url: "#3B3943",
  b64: "#8E5BD9",
  regex: "#F2734F",
  csv: "#1F9D63",
  text: "#7C7870",
};

export const table = (rows: [unknown, unknown][]): string =>
  `<div class="kv">${rows.map(([k, v]) => `<div class="kvr"><span>${esc(String(k))}</span><b>${esc(String(v))}</b></div>`).join("")}</div>`;

export const codeBlock = (s: string, lang?: string): string =>
  `<pre class="code">${lang === "json" ? hlJSON(s) : esc(s)}</pre>`;

export interface ActionResult {
  msg: string;
  html?: string;
  copy?: string;
  /** Registry slug of the tool that can continue this result. */
  open?: string;
  bad?: number;
  go?: number;
}

export const ACT: Record<string, (f: PasteItem) => ActionResult | Promise<ActionResult>> = {
  fmt: (f) => {
    try {
      const v = JSON.parse(f.text);
      const s = JSON.stringify(v, null, 2);
      const keys = (s.match(/"[^"]*"\s*:/g) || []).length;
      return {
        msg: `Valid JSON ✓ — ${s.split("\n").length.toLocaleString()} lines, ${keys.toLocaleString()} keys.`,
        html: codeBlock(s, "json"),
        copy: s,
        open: "json-formatter",
      };
    } catch (e: unknown) {
      const er = jsonErr(f.text, e as Error);
      const ln = f.text.split("\n")[(er.line || 1) - 1] || "";
      return {
        msg: `Found a problem${er.line ? ` on <b>line ${er.line}, column ${er.col}</b>` : ""}: ${esc(er.msg)}.`,
        html: er.line ? `<pre class="code err">${esc(ln)}\n${" ".repeat(Math.max(0, (er.col || 1) - 1))}^</pre>` : "",
        open: "json-formatter",
        bad: 1,
      };
    }
  },
  min: (f) => {
    try {
      const s = JSON.stringify(JSON.parse(f.text));
      return {
        msg: `Minified — ${f.size} B → ${byteLength(s)} B.`,
        html: codeBlock(s.length > 1600 ? s.slice(0, 1600) + "…" : s),
        copy: s,
        open: "json-formatter",
      };
    } catch {
      return ACT.fmt(f);
    }
  },
  csv: (f) => {
    try {
      const s = toCSV(JSON.parse(f.text));
      return {
        msg: `Converted to CSV — ${(s.split("\n").length - 1).toLocaleString()} rows.`,
        html: codeBlock(s),
        copy: s,
        open: "json-to-csv",
      };
    } catch {
      return ACT.fmt(f);
    }
  },
  types: (f) => {
    try {
      const acc: string[] = [];
      tsType(JSON.parse(f.text), "Root", acc);
      const s = acc.join("\n\n");
      return {
        msg: `Here are your TypeScript types.`,
        html: codeBlock(s),
        copy: s,
        open: "json-to-typescript",
      };
    } catch {
      return ACT.fmt(f);
    }
  },
  csv2json: (f) => {
    const v = parseCSV(f.text);
    const s = JSON.stringify(v, null, 2);
    return {
      msg: `Converted ${v.length} rows to JSON.`,
      html: codeBlock(s, "json"),
      copy: s,
      open: "json-to-csv",
    };
  },
  jwt: (f) => {
    const now = Date.now();
    try {
      const { header: H, payload: P } = decodeJwt(f.text);
      const rows: [unknown, unknown][] = [["Algorithm", H.alg || "—"]];
      if (P.sub) rows.push(["Subject", P.sub]);
      if (P.iss) rows.push(["Issuer", P.iss]);
      if (P.iat) rows.push(["Issued", new Date(Number(P.iat) * 1000).toLocaleString("en-IN")]);
      let st = "No expiry claim";
      if (P.exp) {
        const ms = Number(P.exp) * 1000;
        st = ms < now ? `Expired ${rel(ms, now)}` : `Valid · expires ${rel(ms, now)}`;
        rows.push(["Expires", new Date(ms).toLocaleString("en-IN")]);
      }
      const exp = P.exp && Number(P.exp) * 1000 < now;
      return {
        msg: `Decoded. <span class="stpill ${exp ? "bad" : P.exp ? "ok" : ""}">${esc(st)}</span> <span class="sub">Signature isn't verified — and the token never left your device.</span>`,
        html: table(rows) + codeBlock(JSON.stringify({ header: H, payload: P }, null, 2), "json"),
        copy: JSON.stringify(P, null, 2),
        open: "jwt-decoder",
      };
    } catch {
      return { msg: "That doesn't look like a valid JWT.", bad: 1 };
    }
  },
  ts: (f) => {
    const r = tsConv(f.text, Date.now());
    return r
      ? {
          msg: `That's <b>${esc(r[0][1])}</b>.`,
          html: table(r),
          copy: r[2][1],
          open: "timestamp-converter",
        }
      : { msg: "Not a valid timestamp." };
  },
  color: (f) => {
    const c = parseColor(f.text);
    if (!c) return { msg: "I couldn't read that colour." };
    const aa = (x: number) => (x >= 4.5 ? "AA ✓" : x >= 3 ? "AA large" : "Fails");
    return {
      msg: `Here's <b>${c.hex}</b>.`,
      html:
        `<div class="swatch" style="background:${c.hex}"><span style="color:#fff">Aa on white text</span><span style="color:#17161B">Aa on dark text</span></div>` +
        table([
          ["HEX", c.hex],
          ["RGB", c.rgb],
          ["HSL", c.hsl],
          ["Contrast with white", c.cw.toFixed(2) + " : 1 · " + aa(c.cw)],
          ["Contrast with black", c.cb.toFixed(2) + " : 1 · " + aa(c.cb)],
        ]),
      copy: c.rgb,
      open: "color-converter",
    };
  },
  cron: (f) => {
    const runs = cronNext(f.text, Date.now());
    return {
      msg: `<b>${esc(cronExplain(f.text))}.</b> Next runs:`,
      html: table(
        runs.map((d, i) => [
          `#${i + 1}`,
          d.toLocaleString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        ]),
      ),
      copy: f.text.trim(),
      open: "cron-generator",
    };
  },
  sql: (f) => {
    const s = fmtSQL(f.text);
    return {
      msg: "Formatted.",
      html: codeBlock(s),
      copy: s,
      open: "sql-formatter",
    };
  },
  url: (f) => {
    try {
      const u = new URL(f.text.trim());
      const rows: [unknown, unknown][] = [
        ["Host", u.host],
        ["Path", decodeURIComponent(u.pathname)],
      ];
      u.searchParams.forEach((v, k) => rows.push(["?" + k, v]));
      if (u.hash) rows.push(["#", u.hash.slice(1)]);
      return {
        msg: `Parsed — ${[...u.searchParams].length} query parameters.`,
        html: table(rows),
        copy: decodeURIComponent(f.text.trim()),
        open: "url-encoder",
      };
    } catch {
      return { msg: "Not a valid URL." };
    }
  },
  b64: (f) => {
    try {
      const s = utf8b64Decode(f.text);
      return {
        msg: "Decoded.",
        html: codeBlock(s),
        copy: s,
        open: "base64",
      };
    } catch {
      return { msg: "That isn't valid Base64." };
    }
  },
  enc64: (f) => {
    const s = utf8b64(f.text);
    return {
      msg: "Encoded to Base64.",
      html: codeBlock(s),
      copy: s,
      open: "base64",
    };
  },
  count: (f) => {
    const r = wordStats(f.text);
    return {
      msg: `<b>${Number(r[0][1]).toLocaleString()} words</b>, ${r[5][1]} to read.`,
      html: table(r),
      open: "word-counter",
    };
  },
  title: (f) => {
    const s = titleCase(f.text);
    return {
      msg: "Done.",
      html: codeBlock(s),
      copy: s,
      open: "case-converter",
    };
  },
  upper: (f) => {
    const s = f.text.toUpperCase();
    return {
      msg: "Done.",
      html: codeBlock(s),
      copy: s,
      open: "case-converter",
    };
  },
  lower: (f) => {
    const s = f.text.toLowerCase();
    return {
      msg: "Done.",
      html: codeBlock(s),
      copy: s,
      open: "case-converter",
    };
  },
  clean: (f) => {
    const s = cleanText(f.text);
    return {
      msg: "Cleaned up line breaks and extra spaces.",
      html: codeBlock(s),
      copy: s,
      open: "clean-text",
    };
  },
  regex: () => ({
    msg: "Opening the Regex Tester…",
    open: "regex-tester",
    go: 1,
  }),
};

export async function runGen(p: GenParsed): Promise<ActionResult> {
  const g = p.g.id;
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

  if (g === "uuid") {
    const n = clamp(p.n || 5, 1, 500);
    const l = Array.from({ length: n }, () => uuidV4());
    return {
      msg: `${n} fresh UUIDs (v4), generated on your device.`,
      html: codeBlock(l.join("\n")),
      copy: l.join("\n"),
      open: "uuid-generator",
    };
  }
  if (g === "pass") {
    const n = clamp(p.n || 20, 8, 128);
    const pw = genPassword(n);
    return {
      msg: `A strong ${n}-character password. <span class="sub">Generated locally with your browser's secure random generator.</span>`,
      html: `<pre class="code big">${esc(pw)}</pre>`,
      copy: pw,
      open: "password-generator",
    };
  }
  if (g === "lorem") {
    const n = clamp(p.n || 2, 1, 12);
    const s = Array.from({ length: n }, (_, i) => LOREM[i % LOREM.length]).join("\n\n");
    return {
      msg: `${n} paragraph${n > 1 ? "s" : ""} of placeholder text.`,
      html: codeBlock(s),
      copy: s,
      open: "lorem-ipsum",
    };
  }
  if (g === "hash") {
    const s = p.arg || "hello world";
    const r = await hashAll(s);
    return {
      msg: `Hashes of “${esc(s)}”.`,
      html: table(r),
      copy: r[1] ? r[1][1] : "",
      open: "hash-generator",
    };
  }
  if (g === "b64e") {
    const s = p.arg || "hello world";
    const o = utf8b64(s);
    return {
      msg: `“${esc(s)}” in Base64.`,
      html: codeBlock(o),
      copy: o,
      open: "base64",
    };
  }
  if (g === "now") {
    const ms = Date.now();
    const r = tsConv(String(ms), ms);
    return {
      msg: `Right now it's <b>${Math.floor(ms / 1000)}</b>.`,
      html: r ? table(r) : "",
      copy: String(Math.floor(ms / 1000)),
      open: "timestamp-converter",
    };
  }
  if (g === "qr") {
    return {
      msg: "Opening the QR Code tool…",
      open: "qr-code-generator",
      go: 1,
    };
  }
  return { msg: "Unknown generator" };
}
