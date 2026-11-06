/** Randomness is injected into engines so tests can be deterministic. Default: the platform CSPRNG. */
export type Rng = (count: number) => number[];

/** `count` uniformly random unsigned 32-bit integers from Web Crypto. */
export const secureRandom: Rng = (count) => {
  const a = new Uint32Array(count);
  crypto.getRandomValues(a);
  return [...a];
};

/** RFC 4122 version 4 UUID built from `rng` (16 random bytes, version and variant bits set). */
export function uuidV4(rng: Rng = secureRandom): string {
  const b = rng(16).map((x) => x & 0xff);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
