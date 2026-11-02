/** [Own] JSON formatting with human-readable errors. Runs in json.worker.ts for big inputs. */
export interface JsonJob {
  text: string;
  indent: number | "\t" | 0;
  sortKeys?: boolean;
  stripComments?: boolean;
}
export type JsonResult = { ok: true; output: string } | { ok: false; line: number; column: number; message: string; hint: string };

const stripJsonComments = (s: string) =>
  s.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, str) => (str ? str : ""));

const sortDeep = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(sortDeep)
    : v && typeof v === "object"
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep((v as Record<string, unknown>)[k])]))
      : v;

function locate(text: string, message: string) {
  const lc = /line (\d+) column (\d+)/.exec(message);
  if (lc) return { line: Number(lc[1]), column: Number(lc[2]) };
  const pos = /position (\d+)/.exec(message);
  const p = pos ? Number(pos[1]) : text.length;
  const before = text.slice(0, p).split("\n");
  return { line: before.length, column: before.at(-1)!.length + 1 };
}

function hintFor(text: string, line: number, column: number) {
  const row = text.split("\n")[line - 1] ?? "";
  const around = row.slice(Math.max(0, column - 3), column + 2);
  if (/,\s*[}\]]/.test(text.split("\n").slice(line - 2, line + 1).join("\n"))) return "Remove the trailing comma before the closing bracket.";
  if (around.includes("'")) return "JSON needs double quotes (\") around strings and keys, not single quotes.";
  if (/^\s*[A-Za-z_$][\w$]*\s*:/.test(row)) return "Keys must be in double quotes, e.g. \"name\": value.";
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
    return { ok: false, line, column, message: message.replace(/^JSON\.parse: /, ""), hint: hintFor(src, line, column) };
  }
}
