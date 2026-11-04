import type { FileKind } from './fileKind';

export interface IntentRule {
  id: string;
  re: RegExp;
  kinds: FileKind[];
  t: string;
  more?: RegExp;
}

export interface IntentStep {
  id: string;
  t: string;
  d: string;
  ok: boolean;
  at: number;
  i: number;
  target?: number;
  a?: number;
  b?: number;
  fmt?: string;
}

export type Span = [number, number, { i: number } | IntentStep];

export const RULES: IntentRule[] = [
  {
    id: 'compress',
    re: /\b(compress\w*|smaller|shrink\w*|reduce\w*|optimi[sz]e\w*|make it light\w*)\b/i,
    kinds: ['pdf', 'image', 'video', 'audio', 'other', 'doc'],
    t: 'Compress',
    more: /\b(?:under|below|less than|max(?:imum)?|to|at most)?\s*(\d+(?:\.\d+)?)\s*(kb|mb|gb)\b/i,
  },
  {
    id: 'split',
    re: /\b(split\w*|extract pages|pull out|pages?\s+\d)/i,
    kinds: ['pdf'],
    t: 'Split pages',
    more: /\bpages?\s*(\d+)\s*(?:-|–|to|through)\s*(\d+)/i,
  },
  {
    id: 'merge',
    re: /\b(merge\w*|combine\w*|join\w*)\b/i,
    kinds: ['pdf', 'image'],
    t: 'Merge',
  },
  {
    id: 'word',
    re: /\b(to|as|into)\s+(word|docx)\b|\bword\b/i,
    kinds: ['pdf'],
    t: 'Convert to Word',
  },
  {
    id: 'pdf',
    re: /\b(to|as|into)\s+pdf\b/i,
    kinds: ['doc', 'image', 'data'],
    t: 'Convert to PDF',
  },
  {
    id: 'sign',
    re: /\b(sign\w*|signature)\b/i,
    kinds: ['pdf'],
    t: 'Add signature',
  },
  {
    id: 'protect',
    re: /\b(protect\w*|password|lock\w*|encrypt\w*)\b/i,
    kinds: ['pdf'],
    t: 'Protect with password',
  },
  {
    id: 'bg',
    re: /\b(remove (?:the )?background|background|cut ?out|no bg)\b/i,
    kinds: ['image'],
    t: 'Remove background',
  },
  {
    id: 'resize',
    re: /\b(resize\w*(?:\s+for\s+\w+)?|for (?:instagram|youtube|linkedin|tiktok|x|twitter)|\d{3,4}\s*(?:x|×)\s*\d{3,4})\b/i,
    kinds: ['image', 'video'],
    t: 'Resize',
  },
  {
    id: 'conv',
    re: /\b(?:to|as|into)\s+(webp|jpe?g|png|avif|mp3|wav|m4a|csv|yaml|json|gif)\b/i,
    kinds: ['image', 'audio', 'video', 'data'],
    t: 'Convert',
  },
  {
    id: 'gif',
    re: /\b(gif)\b/i,
    kinds: ['video'],
    t: 'Make a GIF',
  },
  {
    id: 'audio',
    re: /\b(extract (?:the )?audio|audio only|mp3)\b/i,
    kinds: ['video'],
    t: 'Extract audio',
  },
  {
    id: 'trans',
    re: /\b(transcri\w*|subtitles?|captions?|srt)\b/i,
    kinds: ['audio', 'video'],
    t: 'Transcribe',
  },
  {
    id: 'trim',
    re: /\b(trim\w*|cut\w*)\b/i,
    kinds: ['audio', 'video'],
    t: 'Trim',
    more: /(\d+:\d{2})\s*(?:-|–|to)\s*(\d+:\d{2})/,
  },
  {
    id: 'fmt',
    re: /\b(format\w*|prettif\w*|beautif\w*|validat\w*|pretty)\b/i,
    kinds: ['data'],
    t: 'Format & validate',
  },
  {
    id: 'types',
    re: /\b(types?|typescript|interfaces?)\b/i,
    kinds: ['data'],
    t: 'Generate types',
  },
  {
    id: 'min',
    re: /\b(minif\w*)\b/i,
    kinds: ['data'],
    t: 'Minify',
  },
];

export const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));

export function parse(
  text: string,
  kind?: FileKind,
): { steps: IntentStep[]; spans: Span[] } {
  const steps: IntentStep[] = [];
  const spans: Span[] = [];
  const used = new Set<string>();

  for (const r of RULES) {
    const m = r.re.exec(text);
    if (!m) continue;
    if (used.has(r.id)) continue;

    if (r.id === 'gif' && steps.some((s) => s.id === 'conv')) continue;
    if (r.id === 'conv' && /gif/i.test(m[1]) && kind === 'video') continue;
    if (r.id === 'word' && kind && kind !== 'pdf') continue;

    const s: IntentStep = {
      id: r.id,
      t: r.t,
      d: '',
      ok: !kind || r.kinds.includes(kind),
      at: m.index,
      i: 0,
    };

    spans.push([m.index, m.index + m[0].length, s]);

    if (r.more) {
      const mm = r.more.exec(text);
      if (mm) {
        spans.push([mm.index, mm.index + mm[0].length, s]);
        if (r.id === 'compress') {
          const unit = mm[2].toLowerCase() as 'kb' | 'mb' | 'gb';
          const multiplier = { kb: 1e3, mb: 1e6, gb: 1e9 }[unit] || 1e6;
          s.target = parseFloat(mm[1]) * multiplier;
          s.d = `under ${mm[1]} ${mm[2].toUpperCase()}`;
        }
        if (r.id === 'split') {
          s.a = +mm[1];
          s.b = +mm[2];
          s.d = `pages ${mm[1]}–${mm[2]}`;
        }
        if (r.id === 'trim') {
          s.d = `${mm[1]} → ${mm[2]}`;
        }
      }
    }

    if (r.id === 'conv') {
      s.fmt = m[1].toLowerCase().replace('jpeg', 'jpg');
      s.t = `Convert to ${s.fmt.toUpperCase()}`;
      s.d = `.${s.fmt}`;
    }

    if (r.id === 'resize') {
      const mm = /for (\w+)/i.exec(m[0]);
      s.d = mm ? `${mm[1][0].toUpperCase()}${mm[1].slice(1)} · 1080 × 1350` : m[0];
    }

    if (r.id === 'compress' && !s.d) s.d = 'best balance';
    if (r.id === 'split' && !s.d) s.d = 'choose pages';
    if (r.id === 'protect') s.d = 'AES-256';
    if (r.id === 'word') s.d = '.docx';
    if (r.id === 'bg') s.d = 'on-device model';
    if (r.id === 'trans') s.d = 'on-device Whisper';

    used.add(r.id);
    steps.push(s);
  }

  steps.sort((a, b) => a.at - b.at);
  steps.forEach((s, i) => {
    s.i = i;
  });

  return { steps, spans };
}

export function markHTML(text: string, spans: Span[], forMirror: boolean = false): string {
  const sp = spans.slice().sort((a, b) => a[0] - b[0]);
  let out = '';
  let p = 0;

  for (const [a, b, s] of sp) {
    if (a < p) continue;
    out += esc(text.slice(p, a));
    const k = s.i % 4;
    out += forMirror
      ? `<mark style="--hl:var(--h${k});--ul:var(--u${k})">${esc(text.slice(a, b))}</mark>`
      : `<mark style="border-color:var(--u${k})">${esc(text.slice(a, b))}</mark>`;
    p = b;
  }

  return out + esc(text.slice(p));
}
