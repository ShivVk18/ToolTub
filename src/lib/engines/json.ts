import { cap, esc } from "./text";

/** [Own] JSON formatting with human-readable errors. Runs in json.worker.ts for big inputs. */
export interface JsonJob {
  text: string;
  indent: number | "\t" | 0;
  sortKeys?: boolean;
  stripComments?: boolean;
}
export type JsonResult =
  { ok: true; output: string } | { ok: false; line: number; column: number; message: string; hint: string };

const stripJsonComments = (s: string) =>
  s.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, str) => (str ? str : ""));

const sortDeep = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(sortDeep)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, sortDeep((v as Record<string, unknown>)[k])]),
        )
      : v;

/**
 * [Own] Finds the offset of the first JSON syntax error with a small recursive-descent scanner.
 * Needed because only V8 puts a position in JSON.parse errors; Safari ("JSON Parse error: Expected '}'")
 * and Firefox differ, which made the reported line wrong.
 */
export function jsonErrorOffset(t: string): number {
  let i = 0;
  const ws = () => {
    while (i < t.length && " \t\n\r".includes(t[i])) i++;
  };
  const fail = (): never => {
    throw i;
  };
  const lit = (w: string) => {
    if (t.startsWith(w, i)) i += w.length;
    else fail();
  };
  const str = () => {
    i++;
    while (i < t.length && t[i] !== '"') {
      if (t[i] === "\\") {
        i++;
        if (!'"\\/bfnrtu'.includes(t[i] ?? "")) fail();
        if (t[i] === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(t.slice(i + 1, i + 5))) fail();
          i += 4;
        }
      } else if (t.charCodeAt(i) < 0x20) fail();
      i++;
    }
    if (t[i] !== '"') fail();
    i++;
  };
  const digits = () => {
    if (!(t[i] >= "0" && t[i] <= "9")) fail();
    while (t[i] >= "0" && t[i] <= "9") i++;
  };
  const num = () => {
    if (t[i] === "-") i++;
    if (t[i] === "0") i++;
    else digits();
    if (t[i] === ".") {
      i++;
      digits();
    }
    if (t[i] === "e" || t[i] === "E") {
      i++;
      if (t[i] === "+" || t[i] === "-") i++;
      digits();
    }
  };
  const value = (): void => {
    ws();
    const c = t[i];
    if (c === "{") {
      i++;
      ws();
      if (t[i] === "}") {
        i++;
        return;
      }
      for (;;) {
        ws();
        if (t[i] !== '"') fail();
        str();
        ws();
        if (t[i] !== ":") fail();
        i++;
        value();
        ws();
        if (t[i] === ",") {
          i++;
          continue;
        }
        if (t[i] === "}") {
          i++;
          return;
        }
        fail();
      }
    }
    if (c === "[") {
      i++;
      ws();
      if (t[i] === "]") {
        i++;
        return;
      }
      for (;;) {
        value();
        ws();
        if (t[i] === ",") {
          i++;
          continue;
        }
        if (t[i] === "]") {
          i++;
          return;
        }
        fail();
      }
    }
    if (c === '"') return str();
    if (c === "t") return lit("true");
    if (c === "f") return lit("false");
    if (c === "n") return lit("null");
    if (c === "-" || (c >= "0" && c <= "9")) return num();
    fail();
  };
  try {
    value();
    ws();
    if (i < t.length) fail();
    return -1;
  } catch (pos) {
    return typeof pos === "number" ? Math.min(pos, t.length) : t.length;
  }
}

function locate(text: string, message: string) {
  const lc = /line (\d+) column (\d+)/.exec(message);
  if (lc) return { line: Number(lc[1]), column: Number(lc[2]) };
  const pos = /position (\d+)/.exec(message);
  const own = jsonErrorOffset(text);
  const p = pos ? Number(pos[1]) : own >= 0 ? own : text.length;
  const before = text.slice(0, p).split("\n");
  return { line: before.length, column: before.at(-1)!.length + 1 };
}

function hintFor(text: string, line: number, column: number) {
  const row = text.split("\n")[line - 1] ?? "";
  const around = row.slice(Math.max(0, column - 3), column + 2);
  if (
    /,\s*[}\]]/.test(
      text
        .split("\n")
        .slice(line - 2, line + 1)
        .join("\n"),
    )
  )
    return "Remove the trailing comma before the closing bracket.";
  if (around.includes("'")) return 'JSON needs double quotes (") around strings and keys, not single quotes.';
  if (/^\s*[A-Za-z_$][\w$]*\s*:/.test(row)) return 'Keys must be in double quotes, e.g. "name": value.';
  if (/\/\/|\/\*/.test(row)) return "Standard JSON doesn't allow comments. Turn on “Strip comments”.";
  return "Check for a missing comma, quote or bracket at this position.";
}

export function formatJson({ text, indent, sortKeys, stripComments }: JsonJob): JsonResult {
  const src = stripComments ? stripJsonComments(text) : text;
  try {
    const value = JSON.parse(src);
    return { ok: true, output: JSON.stringify(sortKeys ? sortDeep(value) : value, null, indent || undefined) };
  } catch (e) {
    const message = (e as Error).message;
    const { line, column } = locate(src, message);
    return {
      ok: false,
      line,
      column,
      message: message.replace(/^JSON\.parse: /, ""),
      hint: hintFor(src, line, column),
    };
  }
}
export function hlJSON(s: string): string {
  return esc(s).replace(
    /(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi,
    (_m, str, colon, kw, num) =>
      str
        ? colon
          ? `<span class="jk">${str}</span>${colon}`
          : `<span class="js">${str}</span>`
        : kw
          ? `<span class="jb">${kw}</span>`
          : `<span class="jn">${num}</span>`,
  );
}

// ---------- JSON error pinpointing ----------
export function jsonErr(t: string, e: Error | { message?: string }): { msg: string; line?: number; col?: number } {
  const m = /position (\d+)/.exec(e.message || "");
  const pos = m ? +m[1] : jsonErrorOffset(t);
  if (pos < 0) return { msg: "Invalid JSON" };
  const before = t.slice(0, pos);
  const line = before.split("\n").length;
  const col = pos - before.lastIndexOf("\n");
  const ch = t[pos];
  const prev = before.replace(/\s+$/, "").slice(-1);
  const msg =
    pos >= t.length
      ? "Unexpected end — something isn’t closed"
      : ch === "'"
        ? "Use double quotes, not single quotes"
        : prev === "," && (ch === "}" || ch === "]")
          ? "Trailing comma — remove the comma before " + ch
          : /[A-Za-z_$]/.test(ch) && (prev === "{" || prev === ",")
            ? "Keys need double quotes"
            : `Unexpected “${ch}”`;
  return { msg, line, col };
}

// ---------- JSON → TypeScript ----------
export function tsType(v: unknown, name: string, acc: string[]): string {
  if (v === null) return "null";
  if (Array.isArray(v)) {
    if (!v.length) return "unknown[]";
    const t = tsType(v[0], (name || "item").replace(/s$/, "") || "Item", acc);
    return (/[|]/.test(t) ? `(${t})` : t) + "[]";
  }
  if (typeof v === "object") {
    const n = cap((name || "root").replace(/[^\w]/g, "")) || "Root";
    const f = Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `  ${/^[a-z_$][\w$]*$/i.test(k) ? k : JSON.stringify(k)}: ${tsType(x, k, acc)};`)
      .join("\n");
    acc.push(`export interface ${n} {\n${f}\n}`);
    return n;
  }
  return typeof v;
}
