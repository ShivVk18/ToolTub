'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TOOLS, CATS, tint, TOOL_ICON_PATHS, type ToolItem } from '@/lib/designTools';
import { esc } from '@/lib/intent';
import { clamp } from '@/lib/animation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: ToolItem) => void;
}

const SYN: Record<string, string> = {
  shrink: 'compress',
  smaller: 'compress',
  reduce: 'compress',
  combine: 'merge',
  join: 'merge',
  jwt: 'jwt',
  token: 'jwt',
  bg: 'background',
  cutout: 'background',
  iphone: 'heic',
  subtitle: 'subtitles',
  captions: 'subtitles',
  mp3: 'audio',
  pretty: 'json',
  beautify: 'json',
};

function score(q: string, t: ToolItem): number {
  const query = q.toLowerCase().trim();
  if (!query) return 1;
  const name = t.n.toLowerCase();
  const hay = `${t.n} ${t.d} ${CATS[t.c].n}`.toLowerCase();
  let total = 0;

  for (const w of query.split(/\s+/)) {
    const syn = SYN[w];
    if (syn && hay.includes(syn)) {
      total += 3;
      continue;
    }
    if (name.startsWith(w)) total += 5;
    else if (name.includes(w)) total += 4;
    else if (hay.includes(w)) total += 2;
    else {
      let i = 0;
      for (const ch of name) {
        if (ch === w[i]) i++;
      }
      if (i === w.length) total += 1;
      else return 0;
    }
  }
  return total;
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

export function CommandPalette({ isOpen, onClose, onSelectTool }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = TOOLS.map((t) => ({ t, s: score(query, t) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || TOOLS.indexOf(a.t) - TOOLS.indexOf(b.t))
    .slice(0, query ? 9 : 8)
    .map((x) => x.t);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Can be handled by parent
        }
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(results.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        onSelectTool(results[selectedIndex]);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelectTool]);

  return (
    <div
      id="pal"
      className={`fixed inset-0 z-60 grid place-items-start justify-center pt-[16vh] transition-opacity duration-250 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className="bd absolute inset-0 bg-[rgba(14,12,20,0.28)] backdrop-blur-[6px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`pbox relative w-[min(680px,92vw)] rounded-[26px] bg-solid border border-line2 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.5)] overflow-hidden transition-transform duration-350 ease-[cubic-bezier(.2,.9,.3,1.2)] ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-[16px] scale-[0.97]'
        }`}
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
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            id="pq"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search 76 tools… try “shrink pdf” or “jwt”"
            autoComplete="off"
            className="flex-1 border-0 outline-none bg-transparent font-sans font-normal text-[20px] text-ink placeholder:text-muted"
          />
          <kbd className="font-sans font-medium text-[12px] px-[8px] py-[4px] rounded-[8px] border border-line2 text-muted">
            esc
          </kbd>
        </div>

        <div className="plist max-h-[420px] overflow-auto p-[8px]">
          {!query && (
            <div className="pg text-[12px] font-semibold tracking-[1.2px] uppercase text-faint p-[12px_14px_6px]">
              Popular
            </div>
          )}

          {results.length > 0 ? (
            results.map((t, idx) => {
              const cat = CATS[t.c];
              const isSel = idx === selectedIndex;
              return (
                <div
                  key={t.n}
                  data-i={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    onSelectTool(t);
                    onClose();
                  }}
                  className={`pi flex items-center gap-[14px] p-[11px_14px] rounded-[14px] text-[16px] cursor-pointer transition-colors ${
                    isSel ? 'bg-accentSoft' : ''
                  }`}
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
                      <path d={TOOL_ICON_PATHS[t.i] || TOOL_ICON_PATHS.code} />
                    </svg>
                  </div>
                  <div>
                    <div
                      className="font-semibold text-ink leading-tight"
                      dangerouslySetInnerHTML={{ __html: hlName(t.n, query) }}
                    />
                    <div className="text-[13px] text-muted">{t.d}</div>
                  </div>
                  <small className="text-muted text-[13px] ml-auto">{cat.n}</small>
                </div>
              );
            })
          ) : (
            <div className="pg normal-case tracking-normal text-[15px] p-[24px] text-muted text-center">
              No tools match. Try “pdf”, “image” or “json”.
            </div>
          )}
        </div>

        <div className="pfoot flex gap-[18px] p-[12px_22px] border-t border-line text-[13px] text-faint">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

