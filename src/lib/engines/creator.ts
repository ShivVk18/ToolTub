/** CSS gradients/shadows, social text styling, caption formulas and bio fitting. Pure, no DOM. */
import { parseColor } from "./color";

// ───────────── CSS generator ─────────────
export type CssKind = "linear" | "radial" | "shadow";
export interface CssResult {
  css: string;
  /** Inline style for a preview swatch (built only from validated values). */
  preview: string;
}

/**
 * Input: colours separated by spaces or commas (hex, rgb(), hsl()), optional angle ("135deg") for linear,
 * optional "circle" for radial. Shadow: first colour is the shadow colour; numbers set x y blur spread.
 */
export function cssGen(src: string, kind: CssKind): CssResult {
  const s = src.trim();
  const colors: string[] = [];
  for (const m of s.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi)) {
    const c = parseColor(m[0]);
    if (!c) throw new Error(`Not a colour: ${m[0]}`);
    colors.push(c.a < 1 ? c.rgb : c.hex);
  }
  const rest = s.replace(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi, " ");
  const bad = /#\S+/.exec(rest);
  if (bad) throw new Error(`Not a colour: ${bad[0]}`);
  if (kind === "shadow") {
    const c = colors[0] ?? "rgba(23, 22, 27, 0.18)";
    const nums = [...rest.replace(/-?\d+(?:\.\d+)?\s*deg/gi, " ").matchAll(/-?\d+(?:\.\d+)?(?:px)?/g)].map((m) =>
      parseFloat(m[0]),
    );
    const [x = 0, y = 12, blur = 32, spread = -8] = nums;
    if (blur < 0) throw new Error("Blur can't be negative");
    const v = `${x}px ${y}px ${blur}px ${spread}px ${c}`;
    return { css: `box-shadow: ${v};`, preview: `box-shadow:${v};background:#fff` };
  }
  if (colors.length < 2) throw new Error("Give at least two colours, e.g. #6d5df5 #ff9c82");
  if (colors.length > 8) throw new Error("Up to 8 colours");
  const stops = colors.map((c, i) => `${c} ${Math.round((i / (colors.length - 1)) * 100)}%`).join(", ");
  let g: string;
  if (kind === "radial") g = `radial-gradient(${/\bcircle\b/i.test(rest) ? "circle" : "ellipse"} at center, ${stops})`;
  else {
    const a = /(-?\d+(?:\.\d+)?)\s*deg/i.exec(rest);
    const deg = a ? ((parseFloat(a[1]) % 360) + 360) % 360 : 135;
    g = `linear-gradient(${deg}deg, ${stops})`;
  }
  return { css: `background: ${colors[0]};\nbackground: ${g};`, preview: `background:${g}` };
}

// ───────────── Unicode text styles ─────────────
export type TextStyle = "bold" | "italic" | "bolditalic" | "mono" | "script";
const BASES: Record<TextStyle, [upper: number, lower: number, digit: number | null]> = {
  bold: [0x1d400, 0x1d41a, 0x1d7ce],
  italic: [0x1d434, 0x1d44e, null],
  bolditalic: [0x1d468, 0x1d482, null],
  mono: [0x1d670, 0x1d68a, 0x1d7f6],
  script: [0x1d49c, 0x1d4b6, null],
};
/** Letters the math alphabets leave out, which live in the Letterlike Symbols block instead. */
const HOLES: Partial<Record<TextStyle, Record<string, number>>> = {
  italic: { h: 0x210e },
  script: {
    B: 0x212c,
    E: 0x2130,
    F: 0x2131,
    H: 0x210b,
    I: 0x2110,
    L: 0x2112,
    M: 0x2133,
    R: 0x211b,
    e: 0x212f,
    g: 0x210a,
    o: 0x2134,
  },
};

/** Styles A–Z, a–z (and 0–9 where the style has digits). Everything else, including emoji and accents, is kept. */
export function styleText(s: string, style: TextStyle): string {
  const [U, L, D] = BASES[style] ?? BASES.bold;
  let out = "";
  for (const ch of s) {
    const hole = HOLES[style]?.[ch];
    const c = ch.charCodeAt(0);
    if (hole) out += String.fromCodePoint(hole);
    else if (ch.length === 1 && c >= 65 && c <= 90) out += String.fromCodePoint(U + c - 65);
    else if (ch.length === 1 && c >= 97 && c <= 122) out += String.fromCodePoint(L + c - 97);
    else if (ch.length === 1 && D !== null && c >= 48 && c <= 57) out += String.fromCodePoint(D + c - 48);
    else out += ch;
  }
  return out;
}

/** User-perceived characters (an emoji with skin tone counts once). */
export function graphemes(s: string): number {
  const Seg = (
    Intl as unknown as { Segmenter?: new (l?: string, o?: object) => { segment(s: string): Iterable<unknown> } }
  ).Segmenter;
  if (Seg) return [...new Seg(undefined, { granularity: "grapheme" }).segment(s)].length;
  return [...s].length;
}

export const LIMITS: [platform: string, chars: number][] = [
  ["X / Twitter", 280],
  ["Threads", 500],
  ["Instagram caption", 2200],
  ["LinkedIn post", 3000],
];

// ───────────── Caption / title formulas ─────────────
export type CaptionStyle = "youtube" | "instagram" | "linkedin";
const FORMULAS: Record<CaptionStyle, ((t: string, T: string) => string)[]> = {
  youtube: [
    (t, T) => `${T}: The Complete Beginner's Guide`,
    (t, T) => `I Tried ${T} for 30 Days. Here's What Happened`,
    (t) => `${capFirst(t)} Explained in 5 Minutes`,
    (t, T) => `7 ${T} Mistakes Everyone Makes (and How to Fix Them)`,
    (t) => `Stop Doing ${capFirst(t)} Wrong`,
    (t, T) => `${T} vs. What Actually Works`,
    (t) => `How I'd Learn ${capFirst(t)} If I Started Today`,
    (t, T) => `The Only ${T} Tutorial You'll Ever Need`,
  ],
  instagram: [
    (t) => `Save this for later: ${t} made simple ✨`,
    (t) => `Nobody talks about this part of ${t} 👇`,
    (t) => `3 things I wish I knew before starting ${t}`,
    (t) => `POV: you finally figured out ${t}`,
    (t) => `${capFirst(t)}, but make it easy. Which tip is your favourite?`,
    (t) => `Your sign to start ${t} this week 💫`,
    (t) => `Read this before you try ${t}`,
    (t) => `Small steps, big change: my ${t} routine`,
  ],
  linkedin: [
    (t) => `I spent a year learning ${t}. Here are 5 lessons.`,
    (t) => `Most advice about ${t} is wrong. Here's what worked for us.`,
    (t) => `${capFirst(t)} isn't a skill. It's a habit.`,
    (t) => `The ${t} framework I use every week:`,
    (t) => `What nobody tells you about ${t}:`,
    (t) => `We changed one thing about ${t}. Results doubled.`,
    (t) => `If you're starting with ${t}, read this first.`,
    (t) => `${capFirst(t)}: 3 mistakes I made so you don't have to.`,
  ],
};
const capFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const titleWords = (s: string) =>
  s.replace(/\b([a-z])([a-z]*)/g, (m, a: string, b: string, i: number) =>
    i > 0 && /^(a|an|the|and|or|of|for|to|in|on|with|vs)$/.test(m) ? m : a.toUpperCase() + b,
  );

export function captions(topic: string, style: CaptionStyle): { text: string; length: number; warn?: string }[] {
  const t = topic
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
  if (!t) throw new Error("Type a topic, e.g. home workouts");
  if (graphemes(t) > 80) throw new Error("Keep the topic under 80 characters");
  const T = titleWords(t);
  const limit = style === "youtube" ? 100 : style === "instagram" ? 2200 : 3000;
  return FORMULAS[style].map((f) => {
    const text = f(t, T);
    const length = graphemes(text);
    return {
      text,
      length,
      warn:
        length > limit ? `over ${limit}` : style === "youtube" && length > 70 ? "may be cut off in search" : undefined,
    };
  });
}

// ───────────── Bio fitting ─────────────
export const BIO_LIMITS: [platform: string, chars: number][] = [
  ["TikTok", 80],
  ["Instagram", 150],
  ["X / Twitter", 160],
  ["LinkedIn headline", 220],
  ["YouTube", 1000],
];

/**
 * Fits a bio to a character limit. Lines are joined with " | " when the platform is single-line (all except
 * Instagram and YouTube). Over the limit, it cuts at the last word boundary and adds "…".
 */
export function fitBio(bio: string, limit: number, multiline: boolean): { text: string; length: number; cut: boolean } {
  const lines = bio
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  let text = lines.join(multiline ? "\n" : " | ");
  const n = graphemes(text);
  if (n <= limit) return { text, length: n, cut: false };
  const chars = [...text];
  let cutAt = limit - 1;
  const slice = chars.slice(0, cutAt).join("");
  const sp = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("\n"));
  text = (sp > limit * 0.6 ? slice.slice(0, sp) : slice).replace(/[\s|,;:-]+$/, "") + "…";
  cutAt = graphemes(text);
  return { text, length: cutAt, cut: true };
}
