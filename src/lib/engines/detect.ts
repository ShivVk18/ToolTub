/** [Own] Paste detection: what kind of text was pasted, and which action a phrase asks for. Pure. */
import { base64UrlDecode } from "./jwt";
import { byteLength } from "./format";

export type PasteType = "jwt" | "json" | "ts" | "color" | "cron" | "sql" | "url" | "b64" | "regex" | "csv" | "text";

export interface DetectionResult {
  pt: PasteType;
  l: string;
  bad?: number;
}

export function detect(text: string): DetectionResult {
  const t = text.trim();
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]*$/.test(t)) {
    try {
      const h = JSON.parse(base64UrlDecode(t.split(".")[0]));
      if (h.alg || h.typ) return { pt: "jwt", l: "JWT token" };
    } catch {
      // not jwt
    }
  }
  if (/^[\[{]/.test(t)) {
    try {
      JSON.parse(t);
      return { pt: "json", l: "JSON" };
    } catch {
      return { pt: "json", l: "JSON", bad: 1 };
    }
  }
  if (/^\d{10}(\d{3})?$/.test(t)) return { pt: "ts", l: "Unix timestamp" };
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(t) || /^(rgb|hsl)a?\(/i.test(t))
    return { pt: "color", l: "colour" };
  if (/^[\d*\/,\-]+(\s+[\d*\/,\-]+){4}$/.test(t)) return { pt: "cron", l: "cron expression" };
  if (/^\s*(select|insert|update|delete|with|create)\s/i.test(t)) return { pt: "sql", l: "SQL query" };
  if (/^https?:\/\/\S+$/i.test(t)) return { pt: "url", l: "URL" };
  if (t.length >= 16 && /^[A-Za-z0-9+/]+={0,2}$/.test(t) && t.length % 4 === 0) {
    try {
      const d = atob(t);
      if (/^[\x09\x0a\x0d\x20-\x7e]*$/.test(d)) return { pt: "b64", l: "Base64 string" };
    } catch {
      // not b64
    }
  }
  if (/^\/.+\/[gimsuy]*$/.test(t)) return { pt: "regex", l: "regular expression" };
  const lines = t.split("\n");
  if (lines.length > 2 && lines[0].split(",").length > 2 && lines[1].split(",").length === lines[0].split(",").length) {
    return { pt: "csv", l: "CSV" };
  }
  return { pt: "text", l: "text" };
}

export const looksLikeContent = (t: string): boolean => {
  const d = detect(t);
  return d.pt !== "text" || t.length > 220 || t.trim().split("\n").length > 2;
};

export interface PasteItem {
  kind: "paste";
  pt: PasteType;
  bad?: number;
  label: string;
  text: string;
  name: string;
  size: number;
  lines: number;
}

export function pasteItem(text: string): PasteItem {
  const d = detect(text);
  const lines = text.split("\n").length;
  const size = byteLength(text);
  return {
    kind: "paste",
    pt: d.pt,
    bad: d.bad,
    label: d.l,
    text,
    name: d.l,
    size,
    lines,
  };
}

export const PSUG: Record<PasteType, [string, string][]> = {
  json: [
    ["Format & validate", "fmt"],
    ["Convert to CSV", "csv"],
    ["Generate TS types", "types"],
    ["Minify", "min"],
  ],
  jwt: [
    ["Decode it", "jwt"],
    ["Is it expired?", "jwt"],
  ],
  ts: [["Convert to date", "ts"]],
  color: [["Convert & check contrast", "color"]],
  cron: [["Explain & next runs", "cron"]],
  sql: [["Format SQL", "sql"]],
  url: [["Decode & parse", "url"]],
  b64: [["Decode", "b64"]],
  regex: [["Test it live", "regex"]],
  csv: [["Convert to JSON", "csv2json"]],
  text: [
    ["Count words", "count"],
    ["Title Case", "title"],
    ["UPPERCASE", "upper"],
    ["Clean text", "clean"],
    ["Encode Base64", "enc64"],
  ],
};

export const PRULES: [RegExp, string][] = [
  [/\b(format\w*|pretty|prettif\w*|beautif\w*|validat\w*|check)\b/i, "fmt"],
  [/\bto csv|csv\b/i, "csv"],
  [/\b(types?|typescript|interfaces?)\b/i, "types"],
  [/\bminif\w*\b/i, "min"],
  [/\b(decode\w*|inspect\w*|read|parse\w*|expir\w*|claims?)\b/i, "dec"],
  [/\b(date|time|convert\w*|human|ist|utc)\b/i, "conv"],
  [/\b(explain\w*|next|runs?|schedule)\b/i, "cron"],
  [/\b(count\w*|words?|characters?|reading)\b/i, "count"],
  [/\btitle\b/i, "title"],
  [/\bupper\w*\b/i, "upper"],
  [/\blower\w*\b/i, "lower"],
  [/\b(clean\w*|line breaks?|tidy)\b/i, "clean"],
  [/\b(base64|encode\w*)\b/i, "enc64"],
  [/\b(to json|json)\b/i, "csv2json"],
  [/\b(test|regex|match\w*)\b/i, "regex"],
];

export function pasteAct(text: string, pt: PasteType): { act: string; span: [number, number] } | null {
  for (const [re, a] of PRULES) {
    const m = re.exec(text);
    if (!m) continue;
    let act: string | null = a;
    if (a === "dec")
      act = ({ jwt: "jwt", b64: "b64", url: "url", json: "fmt", ts: "ts" } as Record<string, string>)[pt] || null;
    if (a === "conv")
      act = ({ ts: "ts", color: "color", csv: "csv2json", json: "csv" } as Record<string, string>)[pt] || null;
    if (a === "fmt" && pt === "sql") act = "sql";
    if (a === "fmt" && pt === "cron") act = "cron";
    if (a === "csv2json" && pt !== "csv") continue;
    if (a === "csv" && pt === "csv") act = "csv2json";
    if (act) return { act, span: [m.index, m.index + m[0].length] };
  }
  return null;
}
