/** [Own] CSS and HTML minifiers (safe subset) and language detection for the code tools. Pure, no DOM. */

export type CodeLang = "js" | "css" | "html" | "json";

export function detectLang(src: string): CodeLang {
  const s = src.trim();
  if (/^[[{]/.test(s)) {
    try {
      JSON.parse(s);
      return "json";
    } catch {
      /* not JSON */
    }
  }
  if (
    /^<(!doctype|html|head|body|div|section|p|span|a|ul|ol|table|main|header|footer|nav|article|template|svg|button|form|img|h[1-6]|!--)/i.test(
      s,
    )
  )
    return "html";
  // selectors followed by declaration blocks, and no JS keywords
  if (
    /^[^{}]*\{[^{}]*:[^{}]*;?[^{}]*\}/.test(s) &&
    !/\b(function|const|let|var|return|=>|import|export|class)\b/.test(s)
  )
    return "css";
  return "js";
}

/**
 * CSS: drops comments (keeps /*! licence comments), collapses whitespace, removes spaces around { } : ; , >
 * and the last ; before }. Strings, url(...) and calc()/min()/max()/clamp() spacing are left alone.
 */
export function minifyCss(css: string): string {
  let out = "";
  let i = 0;
  let depth = 0; // inside calc()-like parentheses, where spaces around + and - matter
  while (i < css.length) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const stop = end < 0 ? css.length : end + 2;
      if (css[i + 2] === "!") out += css.slice(i, stop);
      i = stop;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === "\\" ? 2 : 1;
      out += css.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (/^url\(/i.test(css.slice(i, i + 4))) {
      // keep the URL itself (quoted file names may contain spaces); only trim the padding inside the parentheses
      const end = css.indexOf(")", i);
      const stop = end < 0 ? css.length : end + 1;
      out += "url(" + css.slice(i + 4, end < 0 ? css.length : end).trim() + (end < 0 ? "" : ")");
      i = stop;
      continue;
    }
    if (c === "(") depth++;
    if (c === ")") depth = Math.max(0, depth - 1);
    if (/\s/.test(c)) {
      while (i < css.length && /\s/.test(css[i])) i++;
      const prev = out[out.length - 1];
      const next = css[i];
      const tight =
        /[{};:,>]/.test(prev ?? "{") ||
        /[{};:,>)]/.test(next ?? "}") ||
        prev === " " ||
        out.endsWith("*/") ||
        next === "/";
      if (!tight || (depth > 0 && /[+-]/.test(next ?? "") && prev !== " ")) out += " ";
      if (depth > 0 && /[+\-*/]/.test(prev ?? "") && out[out.length - 1] !== " ") out += " ";
      continue;
    }
    if (c === "}" && out.endsWith(";")) out = out.slice(0, -1);
    out += c;
    i++;
  }
  return out.replace(/;}/g, "}").trim();
}

const RAW = /^(pre|textarea|script|style)$/i;

/**
 * HTML: drops comments (not conditional comments), collapses whitespace runs to one space (so inline spacing
 * still renders the same), trims around block tags, and minifies <style> contents. <pre>, <textarea> and <script>
 * are kept byte-for-byte.
 */
export function minifyHtml(html: string): string {
  const parts: string[] = [];
  const re = /<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
  let last = 0;
  for (const m of html.matchAll(re)) {
    parts.push(collapse(html.slice(last, m.index)));
    const tag = m[1].toLowerCase();
    if (tag === "style") {
      const open = m[0].indexOf(">") + 1;
      const close = m[0].lastIndexOf("<");
      parts.push(m[0].slice(0, open) + minifyCss(m[0].slice(open, close)) + m[0].slice(close));
    } else parts.push(m[0]);
    last = m.index! + m[0].length;
  }
  parts.push(collapse(html.slice(last)));
  return parts.join("").trim();
}
const BLOCK =
  "html|head|body|div|section|article|header|footer|nav|main|aside|p|ul|ol|li|table|thead|tbody|tr|td|th|h[1-6]|meta|link|title|br|hr|form|fieldset|figure|figcaption";
function collapse(s: string) {
  return s
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(new RegExp(`\\s*(</?(?:${BLOCK})\\b[^>]*>)\\s*`, "gi"), "$1");
}

export const isRawTag = (t: string) => RAW.test(t);
