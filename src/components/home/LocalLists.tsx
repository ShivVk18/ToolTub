"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useKlip } from "@/lib/store/klip";
import type { SearchEntry } from "@/registry/search-index";

/** Recently used + favourites. Rendered only after hydration and only when they exist. */
export function LocalLists({ index }: { index: SearchEntry[] }) {
  const recents = useKlip((s) => s.recents);
  const favourites = useKlip((s) => s.favourites);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  if (!ready) return null;
  const pick = (slugs: string[]) =>
    slugs.map((s) => index.find((e) => e.slug === s)).filter((e): e is SearchEntry => !!e?.available);
  const groups = [
    { title: "Favourites", list: pick(favourites) },
    { title: "Recently used", list: pick(recents) },
  ].filter((g) => g.list.length);
  if (!groups.length) return null;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="mb-2 text-sm font-medium text-fg-muted">{g.title}</h2>
          <ul className="flex flex-wrap gap-2">
            {g.list.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/${e.slug}`}
                  className="inline-block rounded-full border border-border px-3 py-1 text-sm hover:bg-soft"
                >
                  {e.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
