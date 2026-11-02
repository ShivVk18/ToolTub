"use client";
import { ArrowRight, Copy, Download, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useKlip, type Artifact } from "@/lib/store";
import { download } from "@/lib/utils";

/** Bundles several outputs into one ZIP (fflate, MIT; images are already compressed, so store only). */
async function zipArtifacts(items: Artifact[]) {
  const { zipSync } = await import("fflate");
  const used = new Map<string, number>();
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (const it of items) {
    if (!it.blob) continue;
    const n = used.get(it.name) ?? 0;
    used.set(it.name, n + 1);
    const name = n ? it.name.replace(/(\.[^.]+)?$/, ` (${n + 1})$1`) : it.name;
    entries[name] = [new Uint8Array(await it.blob.arrayBuffer()), { level: 0 }];
  }
  return new Blob([zipSync(entries) as BlobPart], { type: "application/zip" });
}

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
export function ResultActions({
  items,
  next,
  from,
  zipName = "klipkit-files.zip",
  separate = false,
}: {
  items: Artifact[];
  next?: NextTool[];
  from: string;
  /** File name when several outputs are downloaded together as one ZIP. */
  zipName?: string;
  /** Download each file on its own (e.g. QR PNG + SVG) instead of zipping. */
  separate?: boolean;
}) {
  const router = useRouter();
  const setHandoff = useKlip((s) => s.setHandoff);
  const [copied, setCopied] = useState(false);
  const single = items.length === 1 ? items[0] : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.some((i) => i.blob) && (
        <Button
          data-testid="download"
          variant="primary"
          onClick={async () => {
            const files = items.filter((i) => i.blob);
            if (files.length > 1 && !separate) download(await zipArtifacts(files), zipName);
            else files.forEach((i) => download(i.blob!, i.name));
          }}
        >
          <Download className="size-4" aria-hidden />
          {items.length > 1 ? (separate ? `Download (${items.map((i) => i.name.split(".").pop()!.toUpperCase()).join(" + ")})` : `Download all (${items.length})`) : "Download"}
        </Button>
      )}
      {single?.text !== undefined && (
        <Button
          data-testid="copy"
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
          <summary data-testid="send-next" className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-border px-4 text-sm hover:bg-muted">
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
