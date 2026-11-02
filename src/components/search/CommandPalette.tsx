"use client";
import Fuse from "fuse.js";
import { Search, CornerDownLeft, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchEntry } from "@/registry/search-index";
import { useKlip } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Fuzzy search over the static registry, with synonyms ("shrink pdf" → Compress PDF). Opens with Cmd/Ctrl+K. */
export function useToolSearch(index: SearchEntry[]) {
  const fuse = useMemo(
    () =>
      new Fuse(index, {
        keys: [
          { name: "name", weight: 3 },
          { name: "synonyms", weight: 2 },
          { name: "tagline", weight: 1 },
        ],
        threshold: 0.38,
        ignoreLocation: true,
      }),
    [index],
  );
  return (q: string) =>
    q.trim()
      ? fuse
          .search(q)
          .map((r) => r.item)
          .sort((a, b) => Number(b.available) - Number(a.available))
          .slice(0, 8)
      : [];
}

export function CommandPalette({ index }: { index: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const search = useToolSearch(index);
  const recents = useKlip((s) => s.recents);
  const results = q ? search(q) : recents.map((s) => index.find((e) => e.slug === s)).filter((e): e is SearchEntry => !!e);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQ("");
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => {
      setQ("");
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("klipkit:search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("klipkit:search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
  }, [open]);

  const go = (e?: SearchEntry) => {
    if (!e?.available) return;
    setOpen(false);
    router.push(`/${e.slug}`);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Search tools" className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 text-fg-muted" aria-hidden />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
              if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
              if (e.key === "Enter") go(results[active]);
            }}
            placeholder="Search tools… try “shrink pdf” or “jwt”"
            className="h-12 w-full bg-transparent outline-none placeholder:text-fg-muted"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
          />
        </div>
        <ul id="search-results" role="listbox" className="max-h-80 overflow-auto p-2">
          {!q && results.length > 0 && <li className="px-3 py-1 text-xs text-fg-muted">Recently used</li>}
          {results.map((r, i) => (
            <li key={r.slug} role="option" aria-selected={i === active}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                disabled={!r.available}
                className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", i === active && "bg-muted", !r.available && "opacity-60")}
              >
                {!q && <Clock className="size-4 text-fg-muted" aria-hidden />}
                <span className="flex-1">
                  <span className="block text-sm font-medium">{r.name}</span>
                  <span className="block text-xs text-fg-muted">{r.available ? r.tagline : "Coming soon"}</span>
                </span>
                <span className="text-xs text-fg-muted">{r.hub}</span>
                {i === active && r.available && <CornerDownLeft className="size-3.5 text-fg-muted" aria-hidden />}
              </button>
            </li>
          ))}
          {q && results.length === 0 && <li className="px-3 py-6 text-center text-sm text-fg-muted">No tool matches “{q}”.</li>}
        </ul>
      </div>
    </div>
  );
}

export function SearchButton({ className, label = "Search tools" }: { className?: string; label?: string }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("klipkit:search"))}
      className={cn("flex items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-fg-muted hover:bg-muted", className)}
    >
      <Search className="size-4" aria-hidden />
      <span className="flex-1 text-left">{label}</span>
      <kbd className="hidden rounded border border-border px-1.5 text-[11px] sm:inline">⌘K</kbd>
    </button>
  );
}
