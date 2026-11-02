"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useToolSearch } from "@/components/search/CommandPalette";
import { inputClass } from "@/components/workspace/ToolWorkspace";
import type { SearchEntry } from "@/registry/search-index";

export function SearchResults({ index }: { index: SearchEntry[] }) {
  const [q, setQ] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL query is only readable after hydration (static page)
  useEffect(() => setQ(new URLSearchParams(location.search).get("q") ?? ""), []);
  const results = useToolSearch(index)(q);
  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} className={`${inputClass} w-full`} placeholder="e.g. shrink pdf" aria-label="Search tools" autoFocus />
      <ul className="mt-6 space-y-2">
        {results.map((r) => (
          <li key={r.slug}>{r.available ? <Link className="underline" href={`/${r.slug}`}>{r.name}</Link> : <span className="text-fg-muted">{r.name} (coming soon)</span>} — <span className="text-fg-muted">{r.tagline}</span></li>
        ))}
      </ul>
    </>
  );
}
