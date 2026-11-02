"use client";
import { ArrowRight, Copy, Download, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useKlip, type Artifact } from "@/lib/store";
import { download } from "@/lib/utils";

/** Records the visit for "Recently used" (localStorage only). */
export function VisitTracker({ slug }: { slug: string }) {
  const visit = useKlip((s) => s.visit);
  useEffect(() => visit(slug), [slug, visit]);
  return null;
}

export function FavouriteButton({ slug }: { slug: string }) {
  const fav = useKlip((s) => s.favourites.includes(slug));
  const toggle = useKlip((s) => s.toggleFavourite);
  return (
    <button onClick={() => toggle(slug)} aria-pressed={fav} aria-label={fav ? "Remove from favourites" : "Add to favourites"} className="grid size-9 place-items-center rounded-lg hover:bg-muted">
      <Star className={fav ? "size-4 fill-amber-400 text-amber-400" : "size-4"} aria-hidden />
    </button>
  );
}

export interface NextTool {
  slug: string;
  name: string;
}

/** Download / Copy / Send to next tool. Sending keeps the file in memory: no re-upload, no server. */
export function ResultActions({ items, next, from }: { items: Artifact[]; next?: NextTool[]; from: string }) {
  const router = useRouter();
  const setHandoff = useKlip((s) => s.setHandoff);
  const [copied, setCopied] = useState(false);
  const single = items.length === 1 ? items[0] : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.some((i) => i.blob) && (
        <Button variant="primary" onClick={() => items.forEach((i) => i.blob && download(i.blob, i.name))}>
          <Download className="size-4" aria-hidden />
          {items.length > 1 ? `Download all (${items.length})` : "Download"}
        </Button>
      )}
      {single?.text !== undefined && (
        <Button
          variant="primary"
          onClick={async () => {
            await navigator.clipboard.writeText(single.text!);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          <Copy className="size-4" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </Button>
      )}
      {next && next.length > 0 && (
        <details className="relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-border px-4 text-sm hover:bg-muted">
            Send to next tool <ArrowRight className="size-4" aria-hidden />
          </summary>
          <ul className="absolute z-10 mt-1 min-w-56 rounded-lg border border-border bg-card p-1 shadow-lg">
            {next.map((n) => (
              <li key={n.slug}>
                <button
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setHandoff({ from, items });
                    router.push(`/${n.slug}`);
                  }}
                >
                  {n.name}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Receiving side of a hand-off: runs once on mount if the previous tool sent something. */
export function useHandoff(onItems: (items: Artifact[]) => void) {
  const take = useKlip((s) => s.takeHandoff);
  useEffect(() => {
    const h = take();
    if (h?.items.length) onItems(h.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
