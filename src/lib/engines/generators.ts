/** [Own] Generators that need no input (UUIDs, passwords, lorem, …) and the phrase parser for them. */
import type { Rng } from "./random";
import { secureRandom } from "./random";

// ---------- generators (no input needed) ----------
export interface GeneratorDef {
  id: string;
  re: RegExp;
  t: string;
}

export const GEN: GeneratorDef[] = [
  { id: "uuid", re: /\b(uuids?|guids?)\b/i, t: "Generate UUIDs" },
  { id: "pass", re: /\b(passwords?|passphrase)\b/i, t: "Generate password" },
  { id: "lorem", re: /\b(lorem(?: ipsum)?|placeholder text|dummy text)\b/i, t: "Lorem ipsum" },
  { id: "hash", re: /\b(sha-?(?:1|256|384|512)|hash)\b/i, t: "Hash" },
  { id: "b64e", re: /\bbase64\b/i, t: "Encode Base64" },
  { id: "now", re: /\b(current (?:unix )?time(?:stamp)?|timestamp now|unix now|what time)\b/i, t: "Current timestamp" },
  { id: "qr", re: /\bqr\b/i, t: "QR code" },
];

export interface GenParsed {
  g: GeneratorDef;
  n: number | null;
  arg: string | null;
  spans: [number, number, { i: number }][];
}

export function genParse(text: string): GenParsed | null {
  for (const g of GEN) {
    const m = g.re.exec(text);
    if (!m) continue;
    const spans: [number, number, { i: number }][] = [[m.index, m.index + m[0].length, { i: 0 }]];
    const n = /(\d+)/.exec(text);
    if (n && g.id !== "hash" && g.id !== "b64e") {
      spans.push([n.index, n.index + n[0].length, { i: 1 }]);
    }
    const q = /["“'](.+?)["”']|\bof\s+(.+)$/i.exec(text);
    const rawArg = q ? q[1] || q[2] : null;
    const arg = rawArg ? rawArg.trim().replace(/^["“']|["”']$/g, "") : null;
    return { g, n: n ? +n[1] : null, arg, spans };
  }
  return null;
}

export function genPassword(len = 20, rng: Rng = secureRandom): string {
  const cs = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_=+";
  return rng(len)
    .map((x) => cs[x % cs.length])
    .join("");
}

export const LOREM = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus, a pellentesque sem lacinia. Donec ullamcorper nulla non metus auctor fringilla.",
  "Vestibulum id ligula porta felis euismod semper. Cras mattis consectetur purus sit amet fermentum. Maecenas faucibus mollis interdum, nullam quis risus eget urna mollis ornare.",
  "Aenean lacinia bibendum nulla sed consectetur. Curabitur blandit tempus porttitor. Etiam porta sem malesuada magna mollis euismod, sed posuere consectetur est at lobortis.",
  "Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Morbi leo risus, porta ac consectetur ac, vestibulum at eros.",
];
