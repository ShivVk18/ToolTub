/** Human-readable byte size (B, KB, MB). Pure. */
export function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** UTF-8 byte length of a string. */
export const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/**
 * Does a file match an `<input accept>` string ("image/*", "application/pdf,.pdf", ".heic")?
 * Drag-and-drop and paste skip the browser's own accept filter, so tools check this themselves. Pure.
 */
export function acceptsFile(accept: string, file: { name: string; type: string }): boolean {
  const rules = accept
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (!rules.length) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((r) =>
    r === "*/*" || r === "*"
      ? true
      : r.startsWith(".")
        ? name.endsWith(r)
        : r.endsWith("/*")
          ? type.startsWith(r.slice(0, -1))
          : type === r,
  );
}
