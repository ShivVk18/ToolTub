/** [Own] SHA digests via Web Crypto (available in browsers and Node 20+). */
export async function hashAll(s: string): Promise<[string, string][]> {
  const out: [string, string][] = [];
  for (const a of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const b = await crypto.subtle.digest(a, new TextEncoder().encode(s));
      out.push([a, [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("")]);
    } else {
      out.push([a, ""]);
    }
  }
  return out;
}
