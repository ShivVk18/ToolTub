"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CAT_KEY, useToolSearch } from "@/components/search/CommandPalette";
import { CATS, tint, TOOL_ICON_PATHS } from "@/lib/designTools";
import type { SearchEntry } from "@/registry/search-index";

/** Full-page search: the palette's look (pill input, icon rows, category tags) without the modal. */
export function SearchResults({ index }: { index: SearchEntry[] }) {
  const [q, setQ] = useState("");

  useEffect(() => setQ(new URLSearchParams(location.search).get("q") ?? ""), []);
  const results = useToolSearch(index)(q);
  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full h-[52px] rounded-full border border-line2 bg-panel px-[22px] text-[16px] text-ink placeholder:text-faint outline-none focus-visible:ring-2 focus-visible:ring-accent"
        placeholder="e.g. shrink pdf"
        aria-label="Search tools"
        autoFocus
      />
      <ul className="mt-6 list-none p-0 space-y-[6px]">
        {results.map((r) => {
          const cat = CATS[CAT_KEY[r.category]];
          const body = (
            <>
              <span
                // Coming-soon rows are muted by a grey icon and secondary-colour name (fading the text broke AA).
                className={`w-[38px] h-[38px] rounded-[11px] grid place-items-center flex-none ${
                  r.available ? "" : "grayscale opacity-55"
                }`}
                style={{ background: tint(cat.c) }}
                aria-hidden
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
                  <path d={TOOL_ICON_PATHS[r.icon ?? "code"] || TOOL_ICON_PATHS.code} />
                </svg>
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block font-semibold leading-tight ${r.available ? "text-ink" : "text-ink2"}`}>
                  {r.name}
                </span>
                <span className="block text-[14px] text-ink2 truncate">{r.tagline}</span>
              </span>
              <span
                data-cat
                className="flex-none rounded-full border border-line px-[10px] py-[3px] text-[12px] text-ink2"
              >
                {cat.n}
              </span>
            </>
          );
          const row = "flex items-center gap-[14px] rounded-[16px] p-[10px_14px]";
          return (
            <li key={r.slug} data-search-row data-soon={r.available ? undefined : ""}>
              {r.available ? (
                <Link href={`/${r.slug}`} className={`${row} no-underline transition-colors hover:bg-accentSoft`}>
                  {body}
                </Link>
              ) : (
                <div className={row}>
                  {body}
                  <span className="flex-none text-[12px] text-ink2">Coming soon</span>
                </div>
              )}
            </li>
          );
        })}
        {q && results.length === 0 && (
          <li className="p-[24px] text-center text-ink2">No tools match. Try “pdf”, “image” or “json”.</li>
        )}
      </ul>
    </>
  );
}
