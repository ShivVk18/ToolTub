/**
 * A small, safe Markdown renderer: headings, paragraphs, bold, italic, strike, inline code, fenced code,
 * links, images, lists (nested by indent, ordered and task), blockquotes, tables and rules.
 * Safe by construction: all text is escaped first and raw HTML is shown as text, so pasted Markdown can't run
 * scripts. Links and images keep only http(s), mailto, relative and #anchor URLs.
 */
import { esc } from "./text";

const safeUrl = (u: string) => {
  const s = u.trim().replace(/^<|>$/g, "");
  return /^(https?:|mailto:|\/|\.\/|\.\.\/|#)/i.test(s) || !/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : "#";
};

function inline(s: string): string {
  const codes: string[] = [];
  let t = s.replace(/`([^`]+)`/g, (_m, c: string) => `\u0000${codes.push(`<code>${esc(c)}</code>`) - 1}\u0000`);
  t = esc(t);
  t = t
    .replace(
      /!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
      (_m, alt: string, u: string) =>
        `<img src="${esc(safeUrl(u.replace(/&amp;/g, "&")))}" alt="${alt}" loading="lazy">`,
    )
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
      (_m, txt: string, u: string) =>
        `<a href="${esc(safeUrl(u.replace(/&amp;/g, "&")))}" rel="noopener noreferrer">${txt}</a>`,
    )
    .replace(
      /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
      (_m, p: string, u: string) => `${p}<a href="${u}" rel="noopener noreferrer">${u}</a>`,
    )
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_m, a?: string, b?: string) => `<strong>${a ?? b}</strong>`)
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return t.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codes[+i]);
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  const isBlockStart = (l: string) =>
    /^(#{1,6}\s|```|~~~|>|\s*([-*+]|\d+[.)])\s|\s*(\*\s*){3,}$|\s*(-\s*){3,}$|\s*(_\s*){3,}$|\|)/.test(l);

  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    const fence = /^(```|~~~)\s*([\w+-]*)/.exec(l);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith(fence[1])) body.push(lines[i++]);
      i++; // closing fence (or end of input)
      out.push(
        `<pre><code${fence[2] ? ` class="language-${esc(fence[2])}"` : ""}>${esc(body.join("\n"))}</code></pre>`,
      );
      continue;
    }
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
    if (h) {
      const id = h[2]
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      out.push(`<h${h[1].length} id="${esc(id)}">${inline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }
    if (/^\s*((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(l)) {
      out.push("<hr>");
      i++;
      continue;
    }
    if (/^>/.test(l)) {
      const body: string[] = [];
      while (i < lines.length && /^>/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${renderMarkdown(body.join("\n"))}</blockquote>`);
      continue;
    }
    if (/^\|/.test(l) && i + 1 < lines.length && /^\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const cells = (r: string) =>
        r
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => c.trim());
      const head = cells(l);
      const align = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? "center" : /-+:$/.test(c) ? "right" : ""));
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      const td = (tag: string, c: string, j: number) =>
        `<${tag}${align[j] ? ` style="text-align:${align[j]}"` : ""}>${inline(c)}</${tag}>`;
      out.push(
        `<table><thead><tr>${head.map((c, j) => td("th", c, j)).join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${head.map((_, j) => td("td", r[j] ?? "", j)).join("")}</tr>`)
          .join("")}</tbody></table>`,
      );
      continue;
    }
    if (/^\s*([-*+]|\d+[.)])\s/.test(l)) {
      const items: { indent: number; ordered: boolean; text: string }[] = [];
      while (
        i < lines.length &&
        (/^\s*([-*+]|\d+[.)])\s/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))
      ) {
        const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
        if (m) items.push({ indent: m[1].replace(/\t/g, "    ").length, ordered: /\d/.test(m[2]), text: m[3] });
        else items[items.length - 1].text += " " + lines[i].trim();
        i++;
      }
      out.push(renderList(items, 0, items.length));
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !(para.length && isBlockStart(lines[i]))) para.push(lines[i++]);
    out.push(`<p>${para.map((p) => inline(p.trim())).join(p2br(para))}</p>`);
  }
  return out.join("\n");
}

/** Two trailing spaces mean a hard line break; otherwise lines join with a space. */
const p2br = (para: string[]) => (para.some((p) => / {2}$/.test(p)) ? "<br>" : " ");

function renderList(items: { indent: number; ordered: boolean; text: string }[], from: number, to: number): string {
  const base = items[from].indent;
  const tag = items[from].ordered ? "ol" : "ul";
  let html = `<${tag}>`;
  let i = from;
  while (i < to) {
    const it = items[i];
    let j = i + 1;
    while (j < to && items[j].indent > base) j++;
    const task = /^\[([ xX])\]\s+(.*)$/.exec(it.text);
    const body = task
      ? `<input type="checkbox" disabled${task[1] !== " " ? " checked" : ""}> ${inline(task[2])}`
      : inline(it.text);
    html += `<li>${body}${j > i + 1 ? renderList(items, i + 1, j) : ""}</li>`;
    i = j;
  }
  return html + `</${tag}>`;
}
