/** .env redaction, meta tags and JSON-LD schema. Pure, no DOM. */
import { encodeEntities } from "./devconv";

// ───────────── .env redactor ─────────────
const SECRET_KEY =
  /(secret|token|passw(or)?d|pwd|pass\b|api[_-]?key|apikey|private|credential|auth|dsn|signing|salt|session|cookie|access[_-]?key|client[_-]?secret|webhook)/i;
const URL_CREDS = /^([a-z][a-z0-9+.-]*:\/\/)([^:/@\s]+):([^@\s]+)@/i;

export type RedactMode = "smart" | "all" | "keys";
export interface Redacted {
  text: string;
  redacted: number;
  kept: number;
}

const mask = (v: string) => {
  if (!v) return v;
  const q = /^(["'])([\s\S]*)\1$/.exec(v);
  const inner = q ? q[2] : v;
  const shown = inner.length > 12 ? inner.slice(0, 3) : "";
  const out = shown + "•".repeat(Math.min(8, Math.max(4, inner.length - shown.length)));
  return q ? q[1] + out + q[1] : out;
};

/**
 * Smart: hides values whose key looks secret, and passwords inside connection URLs.
 * All: hides every value. Keys: drops values entirely (KEY=). Comments and blank lines are kept.
 * Handles `export KEY=...`, quoted values, `=` inside values and multi-line double-quoted values.
 */
export function redactEnv(src: string, mode: RedactMode): Redacted {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let redacted = 0,
    kept = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const m = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_.-]*)(\s*=\s*)(.*)$/.exec(l);
    if (!m) {
      out.push(l);
      continue;
    }
    const [, pre, key, eq] = m;
    let val = m[4];
    // multi-line "..." value
    if (/^"/.test(val) && !/^".*"\s*(#.*)?$/.test(val)) {
      while (i + 1 < lines.length && !/"\s*(#.*)?$/.test(val)) val += "\n" + lines[++i];
    }
    const cm = /^(["'][\s\S]*["']|[^#]*?)(\s+#.*)?$/.exec(val)!;
    const value = cm[1].trim();
    const comment = cm[2] ?? "";
    let nv = value;
    if (mode === "keys") nv = "";
    else if (mode === "all" || SECRET_KEY.test(key)) nv = mask(value);
    else if (URL_CREDS.test(value.replace(/^["']|["']$/g, "")))
      nv = value.replace(/(:\/\/[^:/@\s]+:)([^@\s]+)@/, "$1••••@");
    if (nv !== value || (mode === "keys" && value)) redacted++;
    else kept++;
    out.push(`${pre}${key}${eq}${nv}${comment}`);
  }
  return { text: out.join("\n"), redacted, kept };
}

// ───────────── fields ("key: value" lines) ─────────────
/** "title: Hello" lines → { title: "Hello" }. Keys are lower-cased; repeated keys are collected in `all`. */
export function parseFields(src: string): { one: Record<string, string>; all: [string, string][] } {
  const all: [string, string][] = [];
  for (const l of src.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z][\w -]*?)\s*:\s*(.*)$/.exec(l);
    if (m && m[2].trim()) all.push([m[1].toLowerCase().replace(/\s+/g, "-"), m[2].trim()]);
  }
  const one: Record<string, string> = {};
  for (const [k, v] of all) if (!(k in one)) one[k] = v;
  return { one, all };
}

// ───────────── meta tags ─────────────
export interface MetaResult {
  html: string;
  warnings: string[];
}
const attr = (s: string) => encodeEntities(s, "minimal");
const isUrl = (s: string) => /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(s);

/** Fields: title, description, url, image, site, twitter, type, locale. */
export function metaTags(src: string): MetaResult {
  const { one: f } = parseFields(src);
  const w: string[] = [];
  if (!f.title) throw new Error("Add a line like  title: My page");
  if (f.title.length > 60) w.push(`Title is ${f.title.length} characters; search results show about 60`);
  if (!f.description) w.push("No description: search engines will pick text from the page");
  else if (f.description.length > 160) w.push(`Description is ${f.description.length} characters; about 160 are shown`);
  for (const k of ["url", "image"]) if (f[k] && !isUrl(f[k])) w.push(`${k} should be a full https:// URL`);
  if (f.twitter && !/^@\w{1,15}$/.test(f.twitter)) w.push("twitter should look like @handle");
  const t: string[] = [`<title>${attr(f.title)}</title>`, `<meta property="og:title" content="${attr(f.title)}">`];
  if (f.description)
    t.push(
      `<meta name="description" content="${attr(f.description)}">`,
      `<meta property="og:description" content="${attr(f.description)}">`,
    );
  if (f.url)
    t.push(`<link rel="canonical" href="${attr(f.url)}">`, `<meta property="og:url" content="${attr(f.url)}">`);
  t.push(`<meta property="og:type" content="${attr(f.type || "website")}">`);
  if (f.site) t.push(`<meta property="og:site_name" content="${attr(f.site)}">`);
  if (f.locale) t.push(`<meta property="og:locale" content="${attr(f.locale)}">`);
  if (f.image) t.push(`<meta property="og:image" content="${attr(f.image)}">`);
  t.push(`<meta name="twitter:card" content="${f.image ? "summary_large_image" : "summary"}">`);
  if (f.twitter) t.push(`<meta name="twitter:site" content="${attr(f.twitter)}">`);
  return { html: t.join("\n"), warnings: w };
}

// ───────────── JSON-LD ─────────────
export type SchemaType = "Article" | "Product" | "FAQPage" | "Organization";

/**
 * Article: title, author, date, image, url, publisher. Product: name, price, currency, brand, sku, image,
 * availability, rating, reviews. FAQPage: q:/a: pairs. Organization: name, url, logo, sameas (repeatable), email.
 */
export function jsonLd(src: string, type: SchemaType): { json: string; warnings: string[] } {
  const { one: f, all } = parseFields(src);
  const w: string[] = [];
  let o: Record<string, unknown>;
  const name = f.name || f.title;
  if (type === "FAQPage") {
    const qa: { "@type": "Question"; name: string; acceptedAnswer: { "@type": "Answer"; text: string } }[] = [];
    let q: string | null = null;
    for (const [k, v] of all) {
      if (k === "q" || k === "question") q = v;
      else if ((k === "a" || k === "answer") && q) {
        qa.push({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: v } });
        q = null;
      }
    }
    if (!qa.length) throw new Error("Add pairs of lines:  q: question  /  a: answer");
    if (q) w.push("The last question has no answer");
    o = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: qa };
  } else if (type === "Product") {
    if (!name) throw new Error("Add  name: Product name");
    o = { "@context": "https://schema.org", "@type": "Product", name };
    if (f.description) o.description = f.description;
    if (f.image) o.image = f.image;
    if (f.brand) o.brand = { "@type": "Brand", name: f.brand };
    if (f.sku) o.sku = f.sku;
    if (f.price) {
      const p = f.price.replace(/[^\d.]/g, "");
      if (!p || isNaN(+p)) w.push("price should be a number");
      o.offers = {
        "@type": "Offer",
        price: p,
        priceCurrency: (f.currency || (/₹/.test(f.price) ? "INR" : /€/.test(f.price) ? "EUR" : "USD")).toUpperCase(),
        availability: `https://schema.org/${/out/i.test(f.availability || "") ? "OutOfStock" : "InStock"}`,
      };
    } else w.push("No price: Google needs offers for product rich results");
    if (f.rating) {
      const r = +f.rating;
      if (!(r >= 1 && r <= 5)) w.push("rating should be between 1 and 5");
      o.aggregateRating = { "@type": "AggregateRating", ratingValue: f.rating, reviewCount: f.reviews || "1" };
    }
  } else if (type === "Organization") {
    if (!name) throw new Error("Add  name: Organisation name");
    o = { "@context": "https://schema.org", "@type": "Organization", name };
    if (f.url) o.url = f.url;
    if (f.logo) o.logo = f.logo;
    if (f.email) o.email = f.email;
    const same = all.filter(([k]) => k === "sameas" || k === "social").map(([, v]) => v);
    if (same.length) o.sameAs = same;
  } else {
    if (!name) throw new Error("Add  title: Article headline");
    if (name.length > 110) w.push("Headlines over 110 characters may be cut off");
    o = { "@context": "https://schema.org", "@type": "Article", headline: name };
    if (f.description) o.description = f.description;
    if (f.image) o.image = f.image;
    if (f.author) o.author = { "@type": "Person", name: f.author };
    if (f.date) {
      if (isNaN(Date.parse(f.date))) w.push("date should be like 2026-11-07");
      o.datePublished = f.date;
    } else w.push("No date: add  date: 2026-11-07");
    if (f.publisher) o.publisher = { "@type": "Organization", name: f.publisher };
    if (f.url) o.mainEntityOfPage = f.url;
  }
  for (const k of ["url", "image", "logo"]) if (f[k] && !isUrl(f[k])) w.push(`${k} should be a full https:// URL`);
  // `</script>` inside a value would end the tag early: escape "<" in the JSON.
  const json = JSON.stringify(o, null, 2).replace(/</g, "\\u003c");
  return { json: `<script type="application/ld+json">\n${json}\n</script>`, warnings: w };
}
