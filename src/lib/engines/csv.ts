/** [Own] CSV ↔ JSON. RFC 4180 quoting. Pure. */
export function toCSV(v: unknown): string {
  const arr = Array.isArray(v) ? v : [v];
  const keys = [...new Set(arr.flatMap((o) => (o && typeof o === "object" ? Object.keys(o as object) : ["value"])))];
  const q = (x: unknown): string => {
    if (x == null) return "";
    const s = typeof x === "object" ? JSON.stringify(x) : String(x);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    keys.join(","),
    ...arr.map((o) => keys.map((k) => q(o && typeof o === "object" ? (o as Record<string, unknown>)[k] : o)).join(",")),
  ].join("\n");
}

export function parseCSV(t: string): Record<string, string | number>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    f = "",
    q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') {
        f += '"';
        i++;
      } else if (c === '"') {
        q = false;
      } else {
        f += c;
      }
    } else if (c === '"') {
      q = true;
    } else if (c === ",") {
      row.push(f);
      f = "";
    } else if (c === "\n") {
      row.push(f);
      rows.push(row);
      row = [];
      f = "";
    } else if (c !== "\r") {
      f += c;
    }
  }
  if (f || row.length) {
    row.push(f);
    rows.push(row);
  }
  const [h, ...r] = rows;
  if (!h) return [];
  return r
    .filter((x) => x.length > 1 || x[0])
    .map((x) =>
      Object.fromEntries(
        h.map((k, i) => {
          const v = x[i] ?? "";
          return [k.trim(), v !== "" && !isNaN(Number(v)) ? +v : v];
        }),
      ),
    );
}
