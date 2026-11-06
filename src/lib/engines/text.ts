/** [Own] Pure text helpers: escaping, case, cleaning, word stats, Base64. No DOM, no time, no randomness. */
export const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** UTF-8 safe Base64 encode. */
export const utf8b64 = (s: string): string => btoa(unescape(encodeURIComponent(s)));

/** UTF-8 safe Base64 decode (throws on invalid input). */
export const utf8b64Decode = (s: string): string => decodeURIComponent(escape(atob(s.trim())));

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c);
}

export function wordStats(t: string): [string, number | string][] {
  const w = (t.match(/[\p{L}\p{N}'’-]+/gu) || []).length;
  return [
    ["Words", w],
    ["Characters", [...t].length],
    ["Without spaces", [...t.replace(/\s/g, "")].length],
    ["Sentences", (t.match(/[^.!?]+[.!?]+/g) || []).length || (t.trim() ? 1 : 0)],
    ["Paragraphs", t.split(/\n\s*\n/).filter((x) => x.trim()).length],
    ["Reading time", Math.max(1, Math.round(w / 230)) + " min"],
  ];
}

export const titleCase = (t: string): string =>
  t.toLowerCase().replace(/(^|[\s\-(“"])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());

export const cleanText = (t: string): string =>
  t
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/([^\n])\n(?!\n)/g, "$1 ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
