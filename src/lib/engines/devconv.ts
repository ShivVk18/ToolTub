/** chmod, HTML entities and number bases. Pure, no DOM. */

// ───────────── chmod ─────────────
export interface Chmod {
  octal: string; // "755" or "4755"
  symbolic: string; // "rwxr-xr-x"
  table: { who: "Owner" | "Group" | "Others"; read: boolean; write: boolean; execute: boolean }[];
  special: string[]; // setuid / setgid / sticky
}

/** Accepts "755", "0755", "4755", "rwxr-xr-x", "-rwxr-xr-x", "drwsr-sr-t". */
export function parseChmod(input: string): Chmod {
  const s = input.trim();
  let bits: number; // 12 bits: special(3) + rwx×3
  if (/^0?[0-7]{3,4}$/.test(s)) {
    const d = s.replace(/^0(?=[0-7]{4}$)/, "");
    bits = parseInt(d, 8);
  } else if (/^[-dlbcps]?[-r][-w][-xsS][-r][-w][-xsS][-r][-w][-xtT]$/.test(s)) {
    const p = s.length === 10 ? s.slice(1) : s;
    bits = 0;
    const exec = (c: string) => (c === "x" || c === "s" || c === "t" ? 1 : 0);
    const groups = [p.slice(0, 3), p.slice(3, 6), p.slice(6, 9)];
    groups.forEach((g, i) => {
      const v = (g[0] === "r" ? 4 : 0) + (g[1] === "w" ? 2 : 0) + exec(g[2]);
      bits |= v << (3 * (2 - i));
    });
    if (/[sS]/.test(p[2])) bits |= 0o4000;
    if (/[sS]/.test(p[5])) bits |= 0o2000;
    if (/[tT]/.test(p[8])) bits |= 0o1000;
  } else {
    throw new Error("Use octal like 755 or 4755, or symbolic like rwxr-xr-x");
  }
  const who = ["Owner", "Group", "Others"] as const;
  const table = who.map((w, i) => {
    const v = (bits >> (3 * (2 - i))) & 7;
    return { who: w, read: !!(v & 4), write: !!(v & 2), execute: !!(v & 1) };
  });
  const sp = (bits >> 9) & 7;
  const sym = table
    .map((t, i) => {
      let x = t.execute ? "x" : "-";
      if (i === 0 && sp & 4) x = t.execute ? "s" : "S";
      if (i === 1 && sp & 2) x = t.execute ? "s" : "S";
      if (i === 2 && sp & 1) x = t.execute ? "t" : "T";
      return (t.read ? "r" : "-") + (t.write ? "w" : "-") + x;
    })
    .join("");
  const special = [sp & 4 ? "setuid" : "", sp & 2 ? "setgid" : "", sp & 1 ? "sticky" : ""].filter(Boolean);
  const oct = (bits & 0o777).toString(8).padStart(3, "0");
  return { octal: sp ? String(sp) + oct : oct, symbolic: sym, table, special };
}

// ───────────── HTML entities ─────────────
const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
  middot: "·",
  deg: "°",
  plusmn: "±",
  times: "×",
  divide: "÷",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  sect: "§",
  para: "¶",
  laquo: "«",
  raquo: "»",
  larr: "←",
  rarr: "→",
  uarr: "↑",
  darr: "↓",
  harr: "↔",
  hearts: "♥",
  check: "✓",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  sup2: "²",
  sup3: "³",
  micro: "µ",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  aacute: "á",
  ccedil: "ç",
  ntilde: "ñ",
  ouml: "ö",
  uuml: "ü",
  auml: "ä",
  szlig: "ß",
  iexcl: "¡",
  iquest: "¿",
  rupee: "₹",
  infin: "∞",
  ne: "≠",
  le: "≤",
  ge: "≥",
  shy: "­",
};
const BY_CHAR = Object.fromEntries(Object.entries(NAMED).map(([k, v]) => [v, k]));

/** "minimal" escapes only the 5 HTML-special characters; "all" also turns every non-ASCII character into an entity. */
export function encodeEntities(s: string, mode: "minimal" | "all"): string {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (ch === "&") out += "&amp;";
    else if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else if (ch === '"') out += "&quot;";
    else if (ch === "'") out += "&#39;";
    else if (mode === "all" && cp > 126)
      out += BY_CHAR[ch] ? `&${BY_CHAR[ch]};` : `&#x${cp.toString(16).toUpperCase()};`;
    else out += ch;
  }
  return out;
}

/** Decodes named (common set), decimal and hex entities. Unknown or invalid ones are left as written. */
export function decodeEntities(s: string): { text: string; unknown: number } {
  let unknown = 0;
  const text = s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const cp = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (cp > 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff)) return String.fromCodePoint(cp);
      unknown++;
      return m;
    }
    const v = NAMED[e] ?? NAMED[e.toLowerCase()];
    if (v === undefined) unknown++;
    return v ?? m;
  });
  return { text, unknown };
}

// ───────────── number bases ─────────────
export type Base = 2 | 8 | 10 | 16;
export interface BaseResult {
  value: bigint;
  from: Base;
  bin: string;
  oct: string;
  dec: string;
  hex: string;
}

/**
 * `from` "auto" reads 0x / 0b / 0o prefixes, otherwise decimal. Accepts "-", "_" and spaces as digit
 * separators ("1111_0000", "ff ff"). BigInt, so any size works.
 */
export function parseBase(input: string, from: Base | "auto"): BaseResult {
  let s = input.trim().replace(/[_\s]/g, "");
  if (!s) throw new Error("Type a number");
  let neg = false;
  if (s[0] === "-") {
    neg = true;
    s = s.slice(1);
  }
  let base: Base = from === "auto" ? 10 : from;
  const pre = /^0([xbo])/i.exec(s);
  if (pre) {
    const pb = ({ x: 16, b: 2, o: 8 } as const)[pre[1].toLowerCase() as "x" | "b" | "o"];
    if (from !== "auto" && from !== pb) throw new Error(`"${pre[0]}" is a base-${pb} prefix`);
    base = pb;
    s = s.slice(2);
  }
  const digits = "0123456789abcdef".slice(0, base);
  if (!s || [...s.toLowerCase()].some((c) => !digits.includes(c))) throw new Error(`Not a valid base-${base} number`);
  let v = BigInt(0);
  for (const c of s.toLowerCase()) v = v * BigInt(base) + BigInt(digits.indexOf(c));
  if (neg) v = -v;
  const f = (b: number) => (v < BigInt(0) ? "-" + (-v).toString(b) : v.toString(b));
  return { value: v, from: base, bin: f(2), oct: f(8), dec: f(10), hex: f(16).toUpperCase() };
}

/** Groups digits for reading: binary in 4s, hex in 4s, decimal in 3s. */
export function groupDigits(s: string, n: number, sep: string): string {
  const neg = s.startsWith("-");
  const d = neg ? s.slice(1) : s;
  const out: string[] = [];
  for (let i = d.length; i > 0; i -= n) out.unshift(d.slice(Math.max(0, i - n), i));
  return (neg ? "-" : "") + out.join(sep);
}
