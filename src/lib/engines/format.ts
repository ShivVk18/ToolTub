/** Human-readable byte size (B, KB, MB). Pure. */
export function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** UTF-8 byte length of a string. */
export const byteLength = (s: string): number => new TextEncoder().encode(s).length;
