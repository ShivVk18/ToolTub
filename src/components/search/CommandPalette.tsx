'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchEntry } from '@/registry/search-index';
import { useKlip } from '@/lib/store';
import { cn } from '@/lib/utils';
import { createToolSearch } from '@/lib/search';
import { CATS, tint, TOOL_ICON_PATHS, type ToolItem } from '@/lib/designTools';
import { esc } from '@/lib/intent';

export function useToolSearch(index: SearchEntry[]) {
  return useMemo(() => createToolSearch(index), [index]);
}

function hlName(n: string, q: string): string {
  const w = q.trim().split(/\s+/)[0];
  if (!w) return esc(n);
  const i = n.toLowerCase().indexOf(w.toLowerCase());
  return i < 0
    ? esc(n)
    : esc(n.slice(0, i)) +
        '<mark style="background:none;color:var(--accent);font-weight:600">' +
        esc(n.slice(i, i + w.length)) +
        '</mark>' +
        esc(n.slice(i + w.length));
}

export function CommandPalette({ index }: { index: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const search = useToolSearch(index);
  const recents = useKlip((s) => s.recents);

  const results = q
    ? search(q)
    : recents
        .map((s) => index.find((e) => e.slug === s))
        .filter((e): e is SearchEntry => !!e);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQ('');
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => {
      setQ('');
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('klipkit:search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('klipkit:search', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 30);
  }, [open]);

  const go = (e?: SearchEntry) => {
    if (!e?.available) return;
    setOpen(false);
    // If on homepage and __kk exists, we can open in workspace, or navigate
    if (window.location.pathname === '/' && (window as any).__kk) {
      const match = {
        n: e.name,
        c: e.hub.startsWith('dev') ? 'd' : e.hub.startsWith('creat') ? 'c' : 'p',
        i: e.slug.includes('pdf')
          ? 'pdf'
          : e.slug.includes('image') || e.slug.includes('heic')
          ? 'img'
          : e.slug.includes('audio') || e.slug.includes('transcribe')
          ? 'audio'
          : e.slug.includes('video')
          ? 'video'
          : 'code',
        d: e.tagline,
        slug: e.slug,
      } as ToolItem;
      (window as any).__kk.state.file = null;
    }
    router.push(`/${e.slug}`);
  };

  if (!open) return null;

  return (
    <div
      id="pal"
      className="open fixed inset-0 z-60 grid place-items-start justify-center pt-[16vh] transition-opacity duration-250 opacity-100 pointer-events-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="bd absolute inset-0 bg-[rgba(14,12,20,0.28)] backdrop-blur-[6px]"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tools"
        onClick={(e) => e.stopPropagation()}
        className="pbox relative w-[min(680px,92vw)] rounded-[26px] bg-solid border border-line2 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.5)] overflow-hidden transition-transform duration-350 ease-[cubic-bezier(.2,.9,.3,1.2)] translate-y-0 scale-100 text-ink"
      >
        <div className="pin flex items-center gap-[14px] p-[20px_22px] border-b border-line">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="text-muted"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={input}
            id="pq"
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                go(results[active]);
              }
            }}
            placeholder="Search 76 tools… try “shrink pdf” or “jwt”"
            autoComplete="off"
            className="flex-1 border-0 outline-none bg-transparent font-sans font-normal text-[20px] text-ink placeholder:text-muted"
          />
          <kbd className="font-sans font-medium text-[12px] px-[8px] py-[4px] rounded-[8px] border border-line2 text-muted">
            esc
          </kbd>
        </div>

        <ul id="search-results" role="listbox" className="plist max-h-[420px] overflow-auto p-[8px] list-none m-0">
          {!q && results.length > 0 && (
            <li className="pg text-[12px] font-semibold tracking-[1.2px] uppercase text-faint p-[12px_14px_6px]">
              Recently used
            </li>
          )}
          {results.map((r, i) => {
            const isSel = i === active;
            const catKey = r.hub.startsWith('dev') ? 'd' : r.hub.startsWith('creat') ? 'c' : 'p';
            const cat = CATS[catKey];
            const iconKey = r.slug.includes('pdf')
              ? 'pdf'
              : r.slug.includes('image') || r.slug.includes('heic')
              ? 'img'
              : r.slug.includes('audio')
              ? 'audio'
              : r.slug.includes('video')
              ? 'video'
              : 'code';

            return (
              <li key={r.slug} role="option" aria-selected={isSel}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  disabled={!r.available}
                  className={`pi flex w-full items-center gap-[14px] p-[11px_14px] rounded-[14px] text-[16px] text-left cursor-pointer transition-colors ${
                    isSel ? 'bg-accentSoft' : ''
                  } ${!r.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div
                    className="ti w-[34px] h-[34px] rounded-[10px] grid place-items-center flex-none"
                    style={{ background: tint(cat.c) }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={cat.c}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={TOOL_ICON_PATHS[iconKey] || TOOL_ICON_PATHS.code} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className="block font-semibold text-ink leading-tight"
                      dangerouslySetInnerHTML={{ __html: hlName(r.name, q) }}
                    />
                    <span className="block text-[13px] text-muted truncate">
                      {r.available ? r.tagline : 'Coming soon'}
                    </span>
                  </div>
                  <small className="text-muted text-[13px] ml-auto flex-none">{cat.n}</small>
                </button>
              </li>
            );
          })}
          {q && results.length === 0 && (
            <li className="pg normal-case tracking-normal text-[15px] p-[24px] text-muted text-center">
              No tools match. Try “pdf”, “image” or “json”.
            </li>
          )}
        </ul>

        <div className="pfoot flex gap-[18px] p-[12px_22px] border-t border-line text-[13px] text-faint">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

export function SearchButton({
  className,
  label = 'Search tools — What do you need to do? Try “shrink pdf”',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('klipkit:search'))}
      aria-label="Search tools — What do you need to do? Try “shrink pdf”"
      className={cn(
        'pill inline-flex items-center gap-[12px] h-[44px] px-[18px] rounded-full bg-panel border border-line text-muted text-[15px] backdrop-blur-[12px] hover:border-line2 hover:text-ink transition-transform active:scale-[0.98] cursor-pointer',
        className,
      )}
    >
      <Search className="size-4 text-muted" aria-hidden />
      <span className="flex-1 text-left truncate">{label}</span>
      <kbd className="font-sans font-medium text-[12px] px-[8px] py-[3px] rounded-[8px] border border-line2 text-muted bg-soft">
        ⌘K
      </kbd>
    </button>
  );
}
