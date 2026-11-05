// KlipKit Paste Detection, Converters & Generators Engine
// Matches design/reference/KlipKit_UI.html lines 795-933

export const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,"DejaVu Sans Mono",monospace';

export const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

export const b64urlDec = (s: string): string => {
  let str = s.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return decodeURIComponent(escape(atob(str)));
};

export const utf8b64 = (s: string): string => btoa(unescape(encodeURIComponent(s)));

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
}

export function hlJSON(s: string): string {
  return esc(s).replace(
    /(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi,
    (_m, str, colon, kw, num) =>
      str
        ? colon
          ? `<span class="jk">${str}</span>${colon}`
          : `<span class="js">${str}</span>`
        : kw
        ? `<span class="jb">${kw}</span>`
        : `<span class="jn">${num}</span>`
  );
}

export type PasteType = 'jwt' | 'json' | 'ts' | 'color' | 'cron' | 'sql' | 'url' | 'b64' | 'regex' | 'csv' | 'text';

export interface DetectionResult {
  pt: PasteType;
  l: string;
  bad?: number;
}

export function detect(text: string): DetectionResult {
  const t = text.trim();
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]*$/.test(t)) {
    try {
      const h = JSON.parse(b64urlDec(t.split('.')[0]));
      if (h.alg || h.typ) return { pt: 'jwt', l: 'JWT token' };
    } catch {
      // not jwt
    }
  }
  if (/^[\[{]/.test(t)) {
    try {
      JSON.parse(t);
      return { pt: 'json', l: 'JSON' };
    } catch {
      return { pt: 'json', l: 'JSON', bad: 1 };
    }
  }
  if (/^\d{10}(\d{3})?$/.test(t)) return { pt: 'ts', l: 'Unix timestamp' };
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(t) || /^(rgb|hsl)a?\(/i.test(t)) return { pt: 'color', l: 'colour' };
  if (/^[\d*\/,\-]+(\s+[\d*\/,\-]+){4}$/.test(t)) return { pt: 'cron', l: 'cron expression' };
  if (/^\s*(select|insert|update|delete|with|create)\s/i.test(t)) return { pt: 'sql', l: 'SQL query' };
  if (/^https?:\/\/\S+$/i.test(t)) return { pt: 'url', l: 'URL' };
  if (t.length >= 16 && /^[A-Za-z0-9+/]+={0,2}$/.test(t) && t.length % 4 === 0) {
    try {
      const d = atob(t);
      if (/^[\x09\x0a\x0d\x20-\x7e]*$/.test(d)) return { pt: 'b64', l: 'Base64 string' };
    } catch {
      // not b64
    }
  }
  if (/^\/.+\/[gimsuy]*$/.test(t)) return { pt: 'regex', l: 'regular expression' };
  const lines = t.split('\n');
  if (lines.length > 2 && lines[0].split(',').length > 2 && lines[1].split(',').length === lines[0].split(',').length) {
    return { pt: 'csv', l: 'CSV' };
  }
  return { pt: 'text', l: 'text' };
}

export const looksLikeContent = (t: string): boolean => {
  const d = detect(t);
  return d.pt !== 'text' || t.length > 220 || t.trim().split('\n').length > 2;
};

export const PT_TILE: Record<PasteType, string> = {
  json: '{ }',
  jwt: 'JWT',
  ts: '⏱',
  color: '●',
  cron: 'CRON',
  sql: 'SQL',
  url: 'URL',
  b64: 'B64',
  regex: '/.*/',
  csv: 'CSV',
  text: 'Aa',
};

export const PT_COLOR: Record<PasteType, string> = {
  json: '#6D5DF5',
  jwt: '#D98E04',
  ts: '#2F80ED',
  color: '#E5484D',
  cron: '#1F9D63',
  sql: '#2B5FD9',
  url: '#3B3943',
  b64: '#8E5BD9',
  regex: '#F2734F',
  csv: '#1F9D63',
  text: '#7C7870',
};

export interface PasteItem {
  kind: 'paste';
  pt: PasteType;
  bad?: number;
  label: string;
  text: string;
  name: string;
  size: number;
  lines: number;
}

export function pasteItem(text: string): PasteItem {
  const d = detect(text);
  const lines = text.split('\n').length;
  const size = typeof Blob !== 'undefined' ? new Blob([text]).size : Buffer.byteLength(text, 'utf-8');
  return {
    kind: 'paste',
    pt: d.pt,
    bad: d.bad,
    label: d.l,
    text,
    name: d.l,
    size,
    lines,
  };
}

export const PSUG: Record<PasteType, [string, string][]> = {
  json: [
    ['Format & validate', 'fmt'],
    ['Convert to CSV', 'csv'],
    ['Generate TS types', 'types'],
    ['Minify', 'min'],
  ],
  jwt: [
    ['Decode it', 'jwt'],
    ['Is it expired?', 'jwt'],
  ],
  ts: [['Convert to date', 'ts']],
  color: [['Convert & check contrast', 'color']],
  cron: [['Explain & next runs', 'cron']],
  sql: [['Format SQL', 'sql']],
  url: [['Decode & parse', 'url']],
  b64: [['Decode', 'b64']],
  regex: [['Test it live', 'regex']],
  csv: [['Convert to JSON', 'csv2json']],
  text: [
    ['Count words', 'count'],
    ['Title Case', 'title'],
    ['UPPERCASE', 'upper'],
    ['Clean text', 'clean'],
    ['Encode Base64', 'enc64'],
  ],
};

export const PRULES: [RegExp, string][] = [
  [/\b(format\w*|pretty|prettif\w*|beautif\w*|validat\w*|check)\b/i, 'fmt'],
  [/\bto csv|csv\b/i, 'csv'],
  [/\b(types?|typescript|interfaces?)\b/i, 'types'],
  [/\bminif\w*\b/i, 'min'],
  [/\b(decode\w*|inspect\w*|read|parse\w*|expir\w*|claims?)\b/i, 'dec'],
  [/\b(date|time|convert\w*|human|ist|utc)\b/i, 'conv'],
  [/\b(explain\w*|next|runs?|schedule)\b/i, 'cron'],
  [/\b(count\w*|words?|characters?|reading)\b/i, 'count'],
  [/\btitle\b/i, 'title'],
  [/\bupper\w*\b/i, 'upper'],
  [/\blower\w*\b/i, 'lower'],
  [/\b(clean\w*|line breaks?|tidy)\b/i, 'clean'],
  [/\b(base64|encode\w*)\b/i, 'enc64'],
  [/\b(to json|json)\b/i, 'csv2json'],
  [/\b(test|regex|match\w*)\b/i, 'regex'],
];

export function pasteAct(text: string, pt: PasteType): { act: string; span: [number, number] } | null {
  for (const [re, a] of PRULES) {
    const m = re.exec(text);
    if (!m) continue;
    let act: string | null = a;
    if (a === 'dec') act = ({ jwt: 'jwt', b64: 'b64', url: 'url', json: 'fmt', ts: 'ts' } as Record<string, string>)[pt] || null;
    if (a === 'conv') act = ({ ts: 'ts', color: 'color', csv: 'csv2json', json: 'csv' } as Record<string, string>)[pt] || null;
    if (a === 'fmt' && pt === 'sql') act = 'sql';
    if (a === 'fmt' && pt === 'cron') act = 'cron';
    if (a === 'csv2json' && pt !== 'csv') continue;
    if (a === 'csv' && pt === 'csv') act = 'csv2json';
    if (act) return { act, span: [m.index, m.index + m[0].length] };
  }
  return null;
}

// ---------- generators (no input needed) ----------
export interface GeneratorDef {
  id: string;
  re: RegExp;
  t: string;
}

export const GEN: GeneratorDef[] = [
  { id: 'uuid', re: /\b(uuids?|guids?)\b/i, t: 'Generate UUIDs' },
  { id: 'pass', re: /\b(passwords?|passphrase)\b/i, t: 'Generate password' },
  { id: 'lorem', re: /\b(lorem(?: ipsum)?|placeholder text|dummy text)\b/i, t: 'Lorem ipsum' },
  { id: 'hash', re: /\b(sha-?(?:1|256|384|512)|hash)\b/i, t: 'Hash' },
  { id: 'b64e', re: /\bbase64\b/i, t: 'Encode Base64' },
  { id: 'now', re: /\b(current (?:unix )?time(?:stamp)?|timestamp now|unix now|what time)\b/i, t: 'Current timestamp' },
  { id: 'qr', re: /\bqr\b/i, t: 'QR code' },
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
    if (n && g.id !== 'hash' && g.id !== 'b64e') {
      spans.push([n.index, n.index + n[0].length, { i: 1 }]);
    }
    const q = /["“'](.+?)["”']|\bof\s+(.+)$/i.exec(text);
    const rawArg = q ? q[1] || q[2] : null;
    const arg = rawArg ? rawArg.trim().replace(/^["“']|["”']$/g, '') : null;
    return { g, n: n ? +n[1] : null, arg, spans };
  }
  return null;
}

const rnd = (n: number): number[] => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint32Array(n);
    crypto.getRandomValues(a);
    return [...a];
  }
  return Array.from({ length: n }, () => Math.floor(Math.random() * 0xffffffff));
};

export function genPassword(len = 20): string {
  const cs = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_=+';
  return rnd(len)
    .map((x) => cs[x % cs.length])
    .join('');
}

export const LOREM = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus, a pellentesque sem lacinia. Donec ullamcorper nulla non metus auctor fringilla.',
  'Vestibulum id ligula porta felis euismod semper. Cras mattis consectetur purus sit amet fermentum. Maecenas faucibus mollis interdum, nullam quis risus eget urna mollis ornare.',
  'Aenean lacinia bibendum nulla sed consectetur. Curabitur blandit tempus porttitor. Etiam porta sem malesuada magna mollis euismod, sed posuere consectetur est at lobortis.',
  'Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Morbi leo risus, porta ac consectetur ac, vestibulum at eros.',
];

export async function hashAll(s: string): Promise<[string, string][]> {
  const out: [string, string][] = [];
  for (const a of ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const b = await crypto.subtle.digest(a, new TextEncoder().encode(s));
      out.push([a, [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')]);
    } else {
      out.push([a, '']);
    }
  }
  return out;
}

// ---------- JSON error pinpointing ----------
export function jsonErrPos(s: string): number {
  let i = 0;
  const ws = () => {
    while (i < s.length && /\s/.test(s[i])) i++;
  };
  const fail = () => {
    throw i;
  };
  const str = () => {
    i++;
    while (i < s.length) {
      if (s[i] === '\\') {
        i += 2;
        continue;
      }
      if (s[i] === '"') {
        i++;
        return;
      }
      if (s[i] === '\n') fail();
      i++;
    }
    fail();
  };
  const val = () => {
    ws();
    const c = s[i];
    if (c === '{') {
      i++;
      ws();
      if (s[i] === '}') {
        i++;
        return;
      }
      for (;;) {
        ws();
        if (s[i] !== '"') fail();
        str();
        ws();
        if (s[i] !== ':') fail();
        i++;
        val();
        ws();
        if (s[i] === ',') {
          i++;
          continue;
        }
        if (s[i] === '}') {
          i++;
          return;
        }
        fail();
      }
    }
    if (c === '[') {
      i++;
      ws();
      if (s[i] === ']') {
        i++;
        return;
      }
      for (;;) {
        val();
        ws();
        if (s[i] === ',') {
          i++;
          continue;
        }
        if (s[i] === ']') {
          i++;
          return;
        }
        fail();
      }
    }
    if (c === '"') return str();
    const m = /^(-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(s.slice(i));
    if (m) {
      i += m[0].length;
      return;
    }
    fail();
  };
  try {
    val();
    ws();
    if (i < s.length) fail();
    return -1;
  } catch (e) {
    return typeof e === 'number' ? e : -1;
  }
}

export function jsonErr(t: string, e: Error | { message?: string }): { msg: string; line?: number; col?: number } {
  const m = /position (\d+)/.exec(e.message || '');
  const pos = m ? +m[1] : jsonErrPos(t);
  if (pos < 0) return { msg: 'Invalid JSON' };
  const before = t.slice(0, pos);
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  const ch = t[pos];
  const prev = before.replace(/\s+$/, '').slice(-1);
  const msg =
    pos >= t.length
      ? 'Unexpected end — something isn’t closed'
      : ch === "'"
      ? 'Use double quotes, not single quotes'
      : prev === ',' && (ch === '}' || ch === ']')
      ? 'Trailing comma — remove the comma before ' + ch
      : /[A-Za-z_$]/.test(ch) && (prev === '{' || prev === ',')
      ? 'Keys need double quotes'
      : `Unexpected “${ch}”`;
  return { msg, line, col };
}

// ---------- Converters ----------
export function tsType(v: unknown, name: string, acc: string[]): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) {
    if (!v.length) return 'unknown[]';
    const t = tsType(v[0], (name || 'item').replace(/s$/, '') || 'Item', acc);
    return (/[|]/.test(t) ? `(${t})` : t) + '[]';
  }
  if (typeof v === 'object') {
    const n = cap((name || 'root').replace(/[^\w]/g, '')) || 'Root';
    const f = Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `  ${/^[a-z_$][\w$]*$/i.test(k) ? k : JSON.stringify(k)}: ${tsType(x, k, acc)};`)
      .join('\n');
    acc.push(`export interface ${n} {\n${f}\n}`);
    return n;
  }
  return typeof v;
}

export function toCSV(v: unknown): string {
  const arr = Array.isArray(v) ? v : [v];
  const keys = [...new Set(arr.flatMap((o) => (o && typeof o === 'object' ? Object.keys(o as object) : ['value'])))];
  const q = (x: unknown): string => {
    if (x == null) return '';
    const s = typeof x === 'object' ? JSON.stringify(x) : String(x);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...arr.map((o) => keys.map((k) => q(o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : o)).join(','))].join(
    '\n'
  );
}

export function parseCSV(t: string): Record<string, string | number>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    f = '',
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
    } else if (c === ',') {
      row.push(f);
      f = '';
    } else if (c === '\n') {
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else if (c !== '\r') {
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
          const v = x[i] ?? '';
          return [k.trim(), v !== '' && !isNaN(Number(v)) ? +v : v];
        })
      )
    );
}

export function fmtSQL(s: string): string {
  let o = s.replace(/\s+/g, ' ').trim();
  [
    'left join',
    'right join',
    'inner join',
    'outer join',
    'group by',
    'order by',
    'insert into',
    'delete from',
    'select',
    'from',
    'where',
    'and',
    'or',
    'having',
    'limit',
    'offset',
    'join',
    'on',
    'values',
    'update',
    'set',
    'with',
    'as',
    'union',
    'case',
    'when',
    'then',
    'else',
    'end',
    'distinct',
    'in',
    'is',
    'not',
    'null',
    'like',
    'between',
    'desc',
    'asc',
    'count',
    'sum',
    'avg',
    'min',
    'max',
  ].forEach((k) => {
    o = o.replace(new RegExp('\\b' + k.replace(' ', '\\s+') + '\\b', 'gi'), k.toUpperCase());
  });
  return o
    .replace(/\s*\b(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|LEFT JOIN|RIGHT JOIN|INNER JOIN|OUTER JOIN|UNION|VALUES|SET)\b/g, '\n$1')
    .replace(/\s+\b(AND|OR)\b/g, '\n  $1')
    .replace(/^SELECT\s+/, 'SELECT\n  ')
    .replace(/,\s*(?![^()]*\))/g, ',\n  ');
}

export function rel(ms: number): string {
  const d = (ms - Date.now()) / 1000;
  const a = Math.abs(d);
  const rtf = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;
  const U: [number, Intl.RelativeTimeFormatUnit, number][] = [
    [60, 'second', 1],
    [3600, 'minute', 60],
    [86400, 'hour', 3600],
    [2592000, 'day', 86400],
    [31536000, 'month', 2592000],
    [Infinity, 'year', 31536000],
  ];
  for (const [lim, u, div] of U) {
    if (a < lim) {
      return rtf ? rtf.format(Math.round(d / div), u) : `${Math.round(a / div)} ${u}s`;
    }
  }
  return 'recently';
}

export function tsConv(t: string): [string, string][] | null {
  const n = +t.trim();
  if (isNaN(n)) return null;
  const ms = t.trim().length >= 13 ? n : n * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return [
    ['India (IST)', d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'long' })],
    ['UTC', d.toUTCString()],
    ['ISO 8601', d.toISOString()],
    ['Relative', rel(ms)],
    ['Seconds', String(Math.floor(ms / 1000))],
    ['Milliseconds', String(ms)],
  ];
}

export interface ColorResult {
  hex: string;
  rgb: string;
  hsl: string;
  cw: number;
  cb: number;
  a: number;
}

export function parseColor(s: string): ColorResult | null {
  const str = s.trim();
  let r = 0,
    g = 0,
    b = 0,
    a = 1;
  let m = /^#([0-9a-f]{3,8})$/i.exec(str);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
    if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
  } else if ((m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s\/]+([\d.]+))?/i.exec(str))) {
    [r, g, b] = [+m[1], +m[2], +m[3]];
    if (m[4]) a = +m[4];
  } else if ((m = /^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/i.exec(str))) {
    const H = +m[1] / 360,
      S = +m[2] / 100,
      L = +m[3] / 100;
    const f = (n: number) => {
      const k = (n + H * 12) % 12;
      const aa = S * Math.min(L, 1 - L);
      return Math.round(255 * (L - aa * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    [r, g, b] = [f(0), f(8), f(4)];
  } else {
    return null;
  }
  const R = r / 255,
    G = g / 255,
    B = b / 255,
    mx = Math.max(R, G, B),
    mn = Math.min(R, G, B),
    l = (mx + mn) / 2;
  let h = 0,
    sat = 0;
  if (mx !== mn) {
    const d = mx - mn;
    sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
    h /= 6;
  }
  const lum = (x: number) => {
    x /= 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const Y = 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
  return {
    hex:
      '#' +
      [r, g, b]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase(),
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${Math.round(h * 360)}, ${Math.round(sat * 100)}%, ${Math.round(l * 100)}%)`,
    cw: 1.05 / (Y + 0.05),
    cb: (Y + 0.05) / 0.05,
    a,
  };
}

export function cronField(f: string, min: number, max: number): Set<number> {
  const s = new Set<number>();
  for (const part of f.split(',')) {
    const [r, stStr] = part.split('/');
    const st = stStr ? +stStr : 1;
    let a: number, b: number;
    if (r === '*') {
      a = min;
      b = max;
    } else if (r.includes('-')) {
      [a, b] = r.split('-').map(Number);
    } else {
      a = +r;
      b = part.includes('/') ? max : a;
    }
    for (let i = a; i <= b; i += st) s.add(i);
  }
  return s;
}

export function cronNext(e: string, n = 5): Date[] {
  const [mi, h, dom, mon, dow] = e.trim().split(/\s+/);
  if (!dow) return [];
  const M = cronField(mi, 0, 59),
    HH = cronField(h, 0, 23),
    D = cronField(dom, 1, 31),
    MO = cronField(mon, 1, 12),
    W = cronField(dow.replace(/7/g, '0'), 0, 6);
  const out: Date[] = [];
  let t = Math.floor(Date.now() / 60000) * 60000 + 60000;
  for (let g = 0; g < 530000 && out.length < n; g++, t += 60000) {
    const d = new Date(t);
    if (!M.has(d.getMinutes()) || !HH.has(d.getHours()) || !MO.has(d.getMonth() + 1)) continue;
    const dm = dom === '*' || D.has(d.getDate()),
      dw = dow === '*' || W.has(d.getDay());
    if (dom !== '*' && dow !== '*' ? dm || dw : dm && dw) out.push(d);
  }
  return out;
}

export function cronExplain(e: string): string {
  const [mi, h, dom, mon, dow] = e.trim().split(/\s+/);
  if (!dow) return 'Invalid cron expression';
  const DW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let s: string;
  const hr = /^(\d+)-(\d+)$/.exec(h);
  if (mi === '*' && h === '*') s = 'Every minute';
  else if (/^\*\/\d+$/.test(mi) && h === '*') s = `Every ${mi.slice(2)} minutes`;
  else if (/^\*\/\d+$/.test(mi) && hr) s = `Every ${mi.slice(2)} minutes, from ${hr[1].padStart(2, '0')}:00 to ${hr[2].padStart(2, '0')}:59`;
  else if (mi === '0' && hr) s = `Every hour, from ${hr[1].padStart(2, '0')}:00 to ${hr[2].padStart(2, '0')}:00`;
  else if (/^\d+$/.test(mi) && /^\d+$/.test(h)) s = `At ${h.padStart(2, '0')}:${mi.padStart(2, '0')}`;
  else if (/^\d+$/.test(mi) && /^\*\/\d+$/.test(h)) s = `At minute ${mi}, every ${h.slice(2)} hours`;
  else if (/^\d+$/.test(mi) && h === '*') s = `At minute ${mi} of every hour`;
  else s = `Minute ${mi}, hour ${h}`;
  if (dow !== '*') s += ', on ' + dow.split(',').map((x) => (x.includes('-') ? x.split('-').map((y) => DW[+y % 7]).join(' to ') : DW[+x % 7])).join(', ');
  if (dom !== '*') s += `, on day ${dom} of the month`;
  if (mon !== '*') s += `, in month ${mon}`;
  return s;
}

export function wordStats(t: string): [string, number | string][] {
  const w = (t.match(/[\p{L}\p{N}'’-]+/gu) || []).length;
  return [
    ['Words', w],
    ['Characters', [...t].length],
    ['Without spaces', [...t.replace(/\s/g, '')].length],
    ['Sentences', (t.match(/[^.!?]+[.!?]+/g) || []).length || (t.trim() ? 1 : 0)],
    ['Paragraphs', t.split(/\n\s*\n/).filter((x) => x.trim()).length],
    ['Reading time', Math.max(1, Math.round(w / 230)) + ' min'],
  ];
}

export const titleCase = (t: string): string =>
  t.toLowerCase().replace(/(^|[\s\-(“"])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());

export const cleanText = (t: string): string =>
  t
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/([^\n])\n(?!\n)/g, '$1 ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export function decodeJWT(t: string): { H: Record<string, unknown>; P: Record<string, unknown> } {
  const [h, p] = t.trim().split('.');
  const H = JSON.parse(b64urlDec(h)) as Record<string, unknown>;
  const P = JSON.parse(b64urlDec(p)) as Record<string, unknown>;
  return { H, P };
}

export const table = (rows: [unknown, unknown][]): string =>
  `<div class="kv">${rows.map(([k, v]) => `<div class="kvr"><span>${esc(String(k))}</span><b>${esc(String(v))}</b></div>`).join('')}</div>`;

export const codeBlock = (s: string, lang?: string): string =>
  `<pre class="code">${lang === 'json' ? hlJSON(s) : esc(s)}</pre>`;

export interface ActionResult {
  msg: string;
  html?: string;
  copy?: string;
  open?: string;
  bad?: number;
  go?: number;
}

export const ACT: Record<string, (f: PasteItem) => ActionResult | Promise<ActionResult>> = {
  fmt: (f) => {
    try {
      const v = JSON.parse(f.text);
      const s = JSON.stringify(v, null, 2);
      const keys = (s.match(/"[^"]*"\s*:/g) || []).length;
      return {
        msg: `Valid JSON ✓ — ${s.split('\n').length.toLocaleString()} lines, ${keys.toLocaleString()} keys.`,
        html: codeBlock(s, 'json'),
        copy: s,
        open: 'JSON Formatter',
      };
    } catch (e: unknown) {
      const er = jsonErr(f.text, e as Error);
      const ln = f.text.split('\n')[(er.line || 1) - 1] || '';
      return {
        msg: `Found a problem${er.line ? ` on <b>line ${er.line}, column ${er.col}</b>` : ''}: ${esc(er.msg)}.`,
        html: er.line ? `<pre class="code err">${esc(ln)}\n${' '.repeat(Math.max(0, (er.col || 1) - 1))}^</pre>` : '',
        open: 'JSON Formatter',
        bad: 1,
      };
    }
  },
  min: (f) => {
    try {
      const s = JSON.stringify(JSON.parse(f.text));
      return {
        msg: `Minified — ${f.size} B → ${new Blob([s]).size} B.`,
        html: codeBlock(s.length > 1600 ? s.slice(0, 1600) + '…' : s),
        copy: s,
        open: 'JSON Formatter',
      };
    } catch {
      return ACT.fmt(f);
    }
  },
  csv: (f) => {
    try {
      const s = toCSV(JSON.parse(f.text));
      return {
        msg: `Converted to CSV — ${(s.split('\n').length - 1).toLocaleString()} rows.`,
        html: codeBlock(s),
        copy: s,
        open: 'CSV ↔ JSON',
      };
    } catch {
      return ACT.fmt(f);
    }
  },
  types: (f) => {
    try {
      const acc: string[] = [];
      tsType(JSON.parse(f.text), 'Root', acc);
      const s = acc.join('\n\n');
      return {
        msg: `Here are your TypeScript types.`,
        html: codeBlock(s),
        copy: s,
        open: 'JSON to TypeScript',
      };
    } catch {
      return ACT.fmt(f);
    }
  },
  csv2json: (f) => {
    const v = parseCSV(f.text);
    const s = JSON.stringify(v, null, 2);
    return {
      msg: `Converted ${v.length} rows to JSON.`,
      html: codeBlock(s, 'json'),
      copy: s,
      open: 'CSV ↔ JSON',
    };
  },
  jwt: (f) => {
    try {
      const { H, P } = decodeJWT(f.text);
      const rows: [unknown, unknown][] = [['Algorithm', H.alg || '—']];
      if (P.sub) rows.push(['Subject', P.sub]);
      if (P.iss) rows.push(['Issuer', P.iss]);
      if (P.iat) rows.push(['Issued', new Date(Number(P.iat) * 1000).toLocaleString('en-IN')]);
      let st = 'No expiry claim';
      if (P.exp) {
        const ms = Number(P.exp) * 1000;
        st = ms < Date.now() ? `Expired ${rel(ms)}` : `Valid · expires ${rel(ms)}`;
        rows.push(['Expires', new Date(ms).toLocaleString('en-IN')]);
      }
      const exp = P.exp && Number(P.exp) * 1000 < Date.now();
      return {
        msg: `Decoded. <span class="stpill ${exp ? 'bad' : P.exp ? 'ok' : ''}">${esc(st)}</span> <span class="sub">Signature isn't verified — and the token never left your device.</span>`,
        html: table(rows) + codeBlock(JSON.stringify({ header: H, payload: P }, null, 2), 'json'),
        copy: JSON.stringify(P, null, 2),
        open: 'JWT Decoder',
      };
    } catch {
      return { msg: "That doesn't look like a valid JWT.", bad: 1 };
    }
  },
  ts: (f) => {
    const r = tsConv(f.text);
    return r
      ? {
          msg: `That's <b>${esc(r[0][1])}</b>.`,
          html: table(r),
          copy: r[2][1],
          open: 'Timestamp',
        }
      : { msg: 'Not a valid timestamp.' };
  },
  color: (f) => {
    const c = parseColor(f.text);
    if (!c) return { msg: "I couldn't read that colour." };
    const aa = (x: number) => (x >= 4.5 ? 'AA ✓' : x >= 3 ? 'AA large' : 'Fails');
    return {
      msg: `Here's <b>${c.hex}</b>.`,
      html:
        `<div class="swatch" style="background:${c.hex}"><span style="color:#fff">Aa on white text</span><span style="color:#17161B">Aa on dark text</span></div>` +
        table([
          ['HEX', c.hex],
          ['RGB', c.rgb],
          ['HSL', c.hsl],
          ['Contrast with white', c.cw.toFixed(2) + ' : 1 · ' + aa(c.cw)],
          ['Contrast with black', c.cb.toFixed(2) + ' : 1 · ' + aa(c.cb)],
        ]),
      copy: c.rgb,
      open: 'Color Converter',
    };
  },
  cron: (f) => {
    const runs = cronNext(f.text);
    return {
      msg: `<b>${esc(cronExplain(f.text))}.</b> Next runs:`,
      html: table(
        runs.map((d, i) => [
          `#${i + 1}`,
          d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        ])
      ),
      copy: f.text.trim(),
      open: 'Cron Builder',
    };
  },
  sql: (f) => {
    const s = fmtSQL(f.text);
    return {
      msg: 'Formatted.',
      html: codeBlock(s),
      copy: s,
      open: 'SQL Formatter',
    };
  },
  url: (f) => {
    try {
      const u = new URL(f.text.trim());
      const rows: [unknown, unknown][] = [
        ['Host', u.host],
        ['Path', decodeURIComponent(u.pathname)],
      ];
      u.searchParams.forEach((v, k) => rows.push(['?' + k, v]));
      if (u.hash) rows.push(['#', u.hash.slice(1)]);
      return {
        msg: `Parsed — ${[...u.searchParams].length} query parameters.`,
        html: table(rows),
        copy: decodeURIComponent(f.text.trim()),
        open: 'URL Encoder',
      };
    } catch {
      return { msg: 'Not a valid URL.' };
    }
  },
  b64: (f) => {
    try {
      const s = decodeURIComponent(escape(atob(f.text.trim())));
      return {
        msg: 'Decoded.',
        html: codeBlock(s),
        copy: s,
        open: 'Base64',
      };
    } catch {
      return { msg: "That isn't valid Base64." };
    }
  },
  enc64: (f) => {
    const s = utf8b64(f.text);
    return {
      msg: 'Encoded to Base64.',
      html: codeBlock(s),
      copy: s,
      open: 'Base64',
    };
  },
  count: (f) => {
    const r = wordStats(f.text);
    return {
      msg: `<b>${Number(r[0][1]).toLocaleString()} words</b>, ${r[5][1]} to read.`,
      html: table(r),
      open: 'Word Counter',
    };
  },
  title: (f) => {
    const s = titleCase(f.text);
    return {
      msg: 'Done.',
      html: codeBlock(s),
      copy: s,
      open: 'Case Converter',
    };
  },
  upper: (f) => {
    const s = f.text.toUpperCase();
    return {
      msg: 'Done.',
      html: codeBlock(s),
      copy: s,
      open: 'Case Converter',
    };
  },
  lower: (f) => {
    const s = f.text.toLowerCase();
    return {
      msg: 'Done.',
      html: codeBlock(s),
      copy: s,
      open: 'Case Converter',
    };
  },
  clean: (f) => {
    const s = cleanText(f.text);
    return {
      msg: 'Cleaned up line breaks and extra spaces.',
      html: codeBlock(s),
      copy: s,
      open: 'Clean Text',
    };
  },
  regex: () => ({
    msg: 'Opening the Regex Tester…',
    open: 'Regex Tester',
    go: 1,
  }),
};

export async function runGen(p: GenParsed): Promise<ActionResult> {
  const g = p.g.id;
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

  if (g === 'uuid') {
    const n = clamp(p.n || 5, 1, 500);
    const l = Array.from({ length: n }, () =>
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          })
    );
    return {
      msg: `${n} fresh UUIDs (v4), generated on your device.`,
      html: codeBlock(l.join('\n')),
      copy: l.join('\n'),
      open: 'UUID Generator',
    };
  }
  if (g === 'pass') {
    const n = clamp(p.n || 20, 8, 128);
    const pw = genPassword(n);
    return {
      msg: `A strong ${n}-character password. <span class="sub">Generated locally with your browser's secure random generator.</span>`,
      html: `<pre class="code big">${esc(pw)}</pre>`,
      copy: pw,
      open: 'Password Generator',
    };
  }
  if (g === 'lorem') {
    const n = clamp(p.n || 2, 1, 12);
    const s = Array.from({ length: n }, (_, i) => LOREM[i % LOREM.length]).join('\n\n');
    return {
      msg: `${n} paragraph${n > 1 ? 's' : ''} of placeholder text.`,
      html: codeBlock(s),
      copy: s,
      open: 'Lorem Ipsum',
    };
  }
  if (g === 'hash') {
    const s = p.arg || 'hello world';
    const r = await hashAll(s);
    return {
      msg: `Hashes of “${esc(s)}”.`,
      html: table(r),
      copy: r[1] ? r[1][1] : '',
      open: 'Hash Generator',
    };
  }
  if (g === 'b64e') {
    const s = p.arg || 'hello world';
    const o = utf8b64(s);
    return {
      msg: `“${esc(s)}” in Base64.`,
      html: codeBlock(o),
      copy: o,
      open: 'Base64',
    };
  }
  if (g === 'now') {
    const ms = Date.now();
    const r = tsConv(String(ms));
    return {
      msg: `Right now it's <b>${Math.floor(ms / 1000)}</b>.`,
      html: r ? table(r) : '',
      copy: String(Math.floor(ms / 1000)),
      open: 'Timestamp',
    };
  }
  if (g === 'qr') {
    return {
      msg: 'Opening the QR Code tool…',
      open: 'QR Code',
      go: 1,
    };
  }
  return { msg: 'Unknown generator' };
}

