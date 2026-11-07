import Fuse from "fuse.js";
import type { SearchEntry } from "@/registry/search-index";

/** Fuzzy tool search with synonyms ("shrink pdf" → Compress PDF). Available tools rank first. */
export function createToolSearch(index: SearchEntry[]) {
  const fuse = new Fuse(index, {
    keys: [
      { name: "name", weight: 3 },
      { name: "synonyms", weight: 2 },
      { name: "tagline", weight: 1 },
    ],
    threshold: 0.38,
    ignoreLocation: true,
    includeScore: true,
  });
  // Near ties (e.g. "shrink" fits "shrink pdf" and "shrink photo" about equally) go to the more popular
  // tool: its place in the home grid. Scores are compared in 0.1-wide buckets (a transitive order), so
  // clear winners keep Fuse's order.
  const bucket = (s?: number) => Math.floor((s ?? 1) / 0.1);
  const rank = (e: SearchEntry) => e.homeRank ?? Number.MAX_SAFE_INTEGER;
  return (q: string, limit = 8) =>
    q.trim()
      ? fuse
          .search(q.trim())
          .sort(
            (a, b) =>
              Number(b.item.available) - Number(a.item.available) ||
              bucket(a.score) - bucket(b.score) ||
              rank(a.item) - rank(b.item),
          )
          .map((r) => r.item)
          .slice(0, limit)
      : [];
}
